#!/bin/bash

# Disaster Recovery Script
# This script automates disaster recovery procedures for the platform
# Usage: ./disaster-recovery.sh [assess|restore|failover|failback] [options]

set -euo pipefail

# Configuration
ENVIRONMENT=${ENVIRONMENT:-prod}
AWS_REGION=${AWS_REGION:-us-west-2}
BACKUP_REGION=${BACKUP_REGION:-us-east-1}
BACKUP_BUCKET="platform-backups-${ENVIRONMENT}"
CLUSTER_NAME="platform-${ENVIRONMENT}"
RDS_INSTANCE="platform-postgres-${ENVIRONMENT}"

# Logging
LOG_FILE="/var/log/disaster-recovery.log"
exec 1> >(tee -a "$LOG_FILE")
exec 2> >(tee -a "$LOG_FILE" >&2)

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" >&2
    exit 1
}

warning() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1" >&2
}

# Check prerequisites
check_prerequisites() {
    log "Checking disaster recovery prerequisites..."

    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        error "AWS CLI not found"
    fi

    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        error "kubectl not found"
    fi

    # Check terraform
    if ! command -v terraform &> /dev/null; then
        error "Terraform not found"
    fi

    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        error "AWS credentials not configured"
    fi

    log "Prerequisites check passed"
}

# Assessment functions
assess_infrastructure() {
    log "Assessing infrastructure health..."

    local assessment_report="/tmp/infrastructure-assessment-$(date +%Y%m%d-%H%M%S).json"

    # Check EKS cluster
    local eks_status=$(aws eks describe-cluster --name "$CLUSTER_NAME" --region "$AWS_REGION" --query 'cluster.status' --output text 2>/dev/null || echo "FAILED")

    # Check RDS instance
    local rds_status=$(aws rds describe-db-instances --db-instance-identifier "$RDS_INSTANCE" --region "$AWS_REGION" --query 'DBInstances[0].DBInstanceStatus' --output text 2>/dev/null || echo "FAILED")

    # Check ElastiCache
    local redis_status=$(aws elasticache describe-cache-clusters --cache-cluster-id "platform-redis-${ENVIRONMENT}" --region "$AWS_REGION" --query 'CacheClusters[0].CacheClusterStatus' --output text 2>/dev/null || echo "FAILED")

    # Check S3 buckets
    local s3_status="available"
    if ! aws s3 ls s3://platform-documents-${ENVIRONMENT}/ --region "$AWS_REGION" &> /dev/null; then
        s3_status="FAILED"
    fi

    # Generate assessment report
    cat > "$assessment_report" <<EOF
{
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "region": "$AWS_REGION",
    "environment": "$ENVIRONMENT",
    "services": {
        "eks": {
            "status": "$eks_status",
            "cluster_name": "$CLUSTER_NAME"
        },
        "rds": {
            "status": "$rds_status",
            "instance_id": "$RDS_INSTANCE"
        },
        "elasticache": {
            "status": "$redis_status",
            "cluster_id": "platform-redis-${ENVIRONMENT}"
        },
        "s3": {
            "status": "$s3_status",
            "bucket": "platform-documents-${ENVIRONMENT}"
        }
    }
}
EOF

    log "Infrastructure assessment completed: $assessment_report"

    # Upload assessment to S3
    aws s3 cp "$assessment_report" s3://${BACKUP_BUCKET}/assessments/$(date +%Y/%m/%d)/ --region "$AWS_REGION"

    # Display summary
    echo "=== INFRASTRUCTURE ASSESSMENT SUMMARY ==="
    echo "EKS Cluster: $eks_status"
    echo "RDS Database: $rds_status"
    echo "ElastiCache: $redis_status"
    echo "S3 Storage: $s3_status"
    echo "========================================"

    # Determine overall health
    if [[ "$eks_status" == "ACTIVE" && "$rds_status" == "available" && "$redis_status" == "available" && "$s3_status" == "available" ]]; then
        log "Infrastructure is healthy"
        return 0
    else
        warning "Infrastructure has issues that may require recovery"
        return 1
    fi
}

assess_applications() {
    log "Assessing application health..."

    # Check if kubectl can connect
    if ! kubectl cluster-info &> /dev/null; then
        warning "Cannot connect to Kubernetes cluster"
        return 1
    fi

    # Check critical pods
    local failed_pods=$(kubectl get pods --all-namespaces --field-selector=status.phase!=Running,status.phase!=Succeeded -o json | jq -r '.items | length')

    # Check services
    local unhealthy_services=0

    # Test API endpoints
    if ! curl -s --max-time 10 https://api.platform.company.com/health &> /dev/null; then
        ((unhealthy_services++))
        warning "FastAPI service is not responding"
    fi

    if ! curl -s --max-time 10 https://chat.platform.company.com/health &> /dev/null; then
        ((unhealthy_services++))
        warning "Express service is not responding"
    fi

    echo "=== APPLICATION ASSESSMENT SUMMARY ==="
    echo "Failed Pods: $failed_pods"
    echo "Unhealthy Services: $unhealthy_services"
    echo "====================================="

    if [[ $failed_pods -eq 0 && $unhealthy_services -eq 0 ]]; then
        log "Applications are healthy"
        return 0
    else
        warning "Applications have issues that may require recovery"
        return 1
    fi
}

# Recovery functions
restore_infrastructure() {
    log "Starting infrastructure restoration..."

    local restore_point=${1:-latest}

    # Restore from Terraform state backup
    log "Restoring Terraform infrastructure..."
    cd infrastructure

    # Download latest Terraform state backup
    local backup_date=$(date +%Y/%m/%d)
    if [ "$restore_point" == "latest" ]; then
        aws s3 cp s3://${BACKUP_BUCKET}/terraform-state/${backup_date}/terraform-state-backup.json terraform.tfstate --region "$AWS_REGION"
    else
        aws s3 cp s3://${BACKUP_BUCKET}/terraform-state/${restore_point}/terraform-state-backup.json terraform.tfstate --region "$AWS_REGION"
    fi

    # Initialize and apply Terraform
    terraform init -backend-config=backend-config/${ENVIRONMENT}.hcl
    terraform plan -var-file=environments/${ENVIRONMENT}.tfvars -out=${ENVIRONMENT}.tfplan
    terraform apply ${ENVIRONMENT}.tfplan

    # Update kubeconfig
    aws eks update-kubeconfig --region "$AWS_REGION" --name "$CLUSTER_NAME"

    log "Infrastructure restoration completed"
}

restore_database() {
    log "Starting database restoration..."

    local restore_point=${1:-latest}
    local new_instance_id="${RDS_INSTANCE}-recovery-$(date +%Y%m%d-%H%M%S)"

    if [ "$restore_point" == "latest" ]; then
        # Point-in-time recovery
        log "Performing point-in-time recovery..."

        local latest_restorable_time=$(aws rds describe-db-instances \
            --db-instance-identifier "$RDS_INSTANCE" \
            --region "$AWS_REGION" \
            --query 'DBInstances[0].LatestRestorableTime' \
            --output text)

        aws rds restore-db-instance-to-point-in-time \
            --source-db-instance-identifier "$RDS_INSTANCE" \
            --target-db-instance-identifier "$new_instance_id" \
            --restore-time "$latest_restorable_time" \
            --db-instance-class db.r6g.large \
            --multi-az \
            --region "$AWS_REGION"
    else
        # Restore from snapshot
        log "Restoring from snapshot: $restore_point"

        aws rds restore-db-instance-from-db-snapshot \
            --db-instance-identifier "$new_instance_id" \
            --db-snapshot-identifier "$restore_point" \
            --db-instance-class db.r6g.large \
            --multi-az \
            --region "$AWS_REGION"
    fi

    # Wait for instance to be available
    log "Waiting for database instance to be available..."
    aws rds wait db-instance-available \
        --db-instance-identifier "$new_instance_id" \
        --region "$AWS_REGION"

    # Get new endpoint
    local new_endpoint=$(aws rds describe-db-instances \
        --db-instance-identifier "$new_instance_id" \
        --region "$AWS_REGION" \
        --query 'DBInstances[0].Endpoint.Address' \
        --output text)

    # Update Kubernetes secret
    kubectl patch secret database-credentials -n apps -p "{\"data\":{\"host\":\"$(echo -n $new_endpoint | base64)\"}}"

    log "Database restoration completed. New endpoint: $new_endpoint"
}

restore_applications() {
    log "Starting application restoration..."

    # Restore Kubernetes configurations
    local backup_date=${1:-$(date +%Y/%m/%d)}

    # Download configuration backups
    aws s3 cp s3://${BACKUP_BUCKET}/kubernetes-configs/${backup_date}/k8s-resources-backup.yaml /tmp/ --region "$AWS_REGION"
    aws s3 cp s3://${BACKUP_BUCKET}/kubernetes-configs/${backup_date}/k8s-secrets-backup.yaml /tmp/ --region "$AWS_REGION"
    aws s3 cp s3://${BACKUP_BUCKET}/kubernetes-configs/${backup_date}/k8s-configmaps-backup.yaml /tmp/ --region "$AWS_REGION"

    # Apply configurations (excluding cluster-level resources)
    kubectl apply -f /tmp/k8s-secrets-backup.yaml
    kubectl apply -f /tmp/k8s-configmaps-backup.yaml

    # Restore application deployments
    log "Restoring application deployments..."
    kubectl apply -f k8s/apps/

    # Wait for deployments to be ready
    kubectl rollout status deployment/fastapi-app -n apps --timeout=600s
    kubectl rollout status deployment/express-app -n apps --timeout=600s

    # Restore worker services
    kubectl apply -f k8s/workers/

    # Clean up temporary files
    rm -f /tmp/k8s-*-backup.yaml

    log "Application restoration completed"
}

restore_data() {
    log "Starting data restoration..."

    local backup_date=${1:-$(date +%Y/%m/%d)}

    # Restore S3 documents
    log "Restoring S3 documents..."
    aws s3 sync s3://${BACKUP_BUCKET}/application-data/${backup_date}/documents/ s3://platform-documents-${ENVIRONMENT}/ \
        --region "$AWS_REGION"

    # Restore Redis data
    log "Restoring Redis data..."
    local restore_job="redis-restore-$(date +%Y%m%d-%H%M%S)"

    kubectl apply -f - <<EOF
apiVersion: batch/v1
kind: Job
metadata:
  name: $restore_job
  namespace: batch
spec:
  template:
    spec:
      containers:
      - name: redis-restore
        image: redis:7-alpine
        command:
        - /bin/sh
        - -c
        - |
          aws s3 cp s3://${BACKUP_BUCKET}/redis-backups/${backup_date}/ /restore/ --recursive
          redis-cli -h platform-redis-${ENVIRONMENT} --rdb /restore/redis-backup-*.rdb
        env:
        - name: AWS_DEFAULT_REGION
          value: $AWS_REGION
        volumeMounts:
        - name: restore-volume
          mountPath: /restore
      volumes:
      - name: restore-volume
        emptyDir: {}
      restartPolicy: Never
  backoffLimit: 3
EOF

    # Wait for job completion
    kubectl wait --for=condition=complete job/$restore_job -n batch --timeout=1800s

    # Clean up job
    kubectl delete job $restore_job -n batch

    log "Data restoration completed"
}

# Failover functions
failover_to_secondary() {
    log "Starting failover to secondary region..."

    local secondary_region=${1:-$BACKUP_REGION}

    # Update DNS to point to secondary region
    log "Updating DNS records..."

    # Get secondary ALB endpoint
    local secondary_alb=$(aws elbv2 describe-load-balancers \
        --region "$secondary_region" \
        --query "LoadBalancers[?contains(LoadBalancerName, 'platform-${ENVIRONMENT}')].DNSName" \
        --output text)

    if [ -n "$secondary_alb" ]; then
        # Update Route53 records
        aws route53 change-resource-record-sets \
            --hosted-zone-id "$HOSTED_ZONE_ID" \
            --change-batch "{
                \"Changes\": [{
                    \"Action\": \"UPSERT\",
                    \"ResourceRecordSet\": {
                        \"Name\": \"api.platform.company.com\",
                        \"Type\": \"CNAME\",
                        \"TTL\": 60,
                        \"ResourceRecords\": [{\"Value\": \"$secondary_alb\"}]
                    }
                }]
            }"

        log "DNS failover completed to: $secondary_alb"
    else
        error "Secondary ALB not found in region: $secondary_region"
    fi

    # Promote read replica to primary
    log "Promoting read replica to primary..."
    aws rds promote-read-replica \
        --db-instance-identifier "${RDS_INSTANCE}-read-replica" \
        --region "$secondary_region"

    # Wait for promotion to complete
    aws rds wait db-instance-available \
        --db-instance-identifier "${RDS_INSTANCE}-read-replica" \
        --region "$secondary_region"

    log "Failover to secondary region completed"
}

failback_to_primary() {
    log "Starting failback to primary region..."

    # Restore primary infrastructure if needed
    if ! assess_infrastructure; then
        log "Primary infrastructure needs restoration"
        restore_infrastructure
    fi

    # Sync data from secondary to primary
    log "Syncing data from secondary region..."

    # Create new read replica from secondary (now primary)
    aws rds create-db-instance-read-replica \
        --db-instance-identifier "${RDS_INSTANCE}-failback" \
        --source-db-instance-identifier "arn:aws:rds:${BACKUP_REGION}:$(aws sts get-caller-identity --query Account --output text):db:${RDS_INSTANCE}-read-replica" \
        --db-instance-class db.r6g.large \
        --region "$AWS_REGION"

    # Wait for replica to be available
    aws rds wait db-instance-available \
        --db-instance-identifier "${RDS_INSTANCE}-failback" \
        --region "$AWS_REGION"

    # Promote replica to primary
    aws rds promote-read-replica \
        --db-instance-identifier "${RDS_INSTANCE}-failback" \
        --region "$AWS_REGION"

    # Update DNS back to primary
    log "Updating DNS back to primary region..."

    local primary_alb=$(aws elbv2 describe-load-balancers \
        --region "$AWS_REGION" \
        --query "LoadBalancers[?contains(LoadBalancerName, 'platform-${ENVIRONMENT}')].DNSName" \
        --output text)

    aws route53 change-resource-record-sets \
        --hosted-zone-id "$HOSTED_ZONE_ID" \
        --change-batch "{
            \"Changes\": [{
                \"Action\": \"UPSERT\",
                \"ResourceRecordSet\": {
                    \"Name\": \"api.platform.company.com\",
                    \"Type\": \"CNAME\",
                    \"TTL\": 300,
                    \"ResourceRecords\": [{\"Value\": \"$primary_alb\"}]
                }
            }]
        }"

    log "Failback to primary region completed"
}

# Verification functions
verify_recovery() {
    log "Verifying disaster recovery..."

    # Wait for DNS propagation
    sleep 60

    # Test infrastructure
    if ! assess_infrastructure; then
        error "Infrastructure verification failed"
    fi

    # Test applications
    if ! assess_applications; then
        error "Application verification failed"
    fi

    # Test data integrity
    log "Testing data integrity..."

    # Test database connectivity
    kubectl exec -it deployment/fastapi-app -n apps -- python -c "
import psycopg2
import os
try:
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cursor = conn.cursor()
    cursor.execute('SELECT COUNT(*) FROM users;')
    count = cursor.fetchone()[0]
    print(f'Database connection successful. User count: {count}')
    conn.close()
except Exception as e:
    print(f'Database connection failed: {e}')
    exit(1)
"

    # Test Redis connectivity
    kubectl exec -it deployment/fastapi-app -n apps -- python -c "
import redis
import os
try:
    r = redis.from_url(os.environ['REDIS_URL'])
    r.ping()
    print('Redis connection successful')
except Exception as e:
    print(f'Redis connection failed: {e}')
    exit(1)
"

    log "Disaster recovery verification completed successfully"
}

# Notification functions
send_notification() {
    local status=$1
    local message=$2

    # Send to Slack
    if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚨 Disaster Recovery $status: $message\"}" \
            "$SLACK_WEBHOOK_URL"
    fi

    # Send to SNS
    if [ -n "${SNS_TOPIC_ARN:-}" ]; then
        aws sns publish \
            --topic-arn "$SNS_TOPIC_ARN" \
            --message "Disaster Recovery $status: $message" \
            --region "$AWS_REGION"
    fi

    # Send to PagerDuty
    if [ -n "${PAGERDUTY_INTEGRATION_KEY:-}" ]; then
        curl -X POST \
            -H "Content-Type: application/json" \
            -d "{
                \"routing_key\": \"$PAGERDUTY_INTEGRATION_KEY\",
                \"event_action\": \"trigger\",
                \"payload\": {
                    \"summary\": \"Disaster Recovery $status: $message\",
                    \"severity\": \"critical\",
                    \"source\": \"disaster-recovery-script\"
                }
            }" \
            https://events.pagerduty.com/v2/enqueue
    fi
}

# Main execution
main() {
    local action=${1:-assess}
    local option=${2:-}

    log "Starting disaster recovery action: $action"

    check_prerequisites

    case $action in
        "assess")
            log "Performing comprehensive assessment..."
            assess_infrastructure
            assess_applications
            ;;
        "restore")
            case $option in
                "infrastructure")
                    restore_infrastructure
                    ;;
                "database")
                    restore_database
                    ;;
                "applications")
                    restore_applications
                    ;;
                "data")
                    restore_data
                    ;;
                "full"|"")
                    restore_infrastructure
                    restore_database
                    restore_applications
                    restore_data
                    verify_recovery
                    ;;
                *)
                    error "Invalid restore option: $option. Use: infrastructure|database|applications|data|full"
                    ;;
            esac
            ;;
        "failover")
            failover_to_secondary "$option"
            verify_recovery
            ;;
        "failback")
            failback_to_primary
            verify_recovery
            ;;
        *)
            error "Invalid action: $action. Use: assess|restore|failover|failback"
            ;;
    esac

    log "Disaster recovery action completed successfully"
    send_notification "SUCCESS" "Disaster recovery action '$action' completed"
}

# Error handling
trap 'send_notification "FAILED" "Disaster recovery failed with error on line $LINENO"' ERR

# Execute main function
main "$@"
