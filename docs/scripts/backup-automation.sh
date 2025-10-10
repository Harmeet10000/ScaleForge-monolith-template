#!/bin/bash

# Backup Automation Script
# This script automates backup procedures for databases, application data, and configurations
# Usage: ./backup-automation.sh [database|application|configuration|all]

set -euo pipefail

# Configuration
ENVIRONMENT=${ENVIRONMENT:-prod}
AWS_REGION=${AWS_REGION:-us-west-2}
BACKUP_BUCKET="platform-backups-${ENVIRONMENT}"
CLUSTER_NAME="platform-${ENVIRONMENT}"
RDS_INSTANCE="platform-postgres-${ENVIRONMENT}"
REDIS_CLUSTER="platform-redis-${ENVIRONMENT}"

# Logging
LOG_FILE="/var/log/backup-automation.log"
exec 1> >(tee -a "$LOG_FILE")
exec 2> >(tee -a "$LOG_FILE" >&2)

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" >&2
    exit 1
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."

    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        error "AWS CLI not found"
    fi

    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        error "kubectl not found"
    fi

    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        error "AWS credentials not configured"
    fi

    # Check kubectl context
    if ! kubectl cluster-info &> /dev/null; then
        error "kubectl not configured for cluster access"
    fi

    log "Prerequisites check passed"
}

# Database backup functions
backup_rds() {
    log "Starting RDS backup..."

    local snapshot_id="platform-postgres-backup-$(date +%Y%m%d-%H%M%S)"

    # Create RDS snapshot
    log "Creating RDS snapshot: $snapshot_id"
    aws rds create-db-snapshot \
        --db-instance-identifier "$RDS_INSTANCE" \
        --db-snapshot-identifier "$snapshot_id" \
        --region "$AWS_REGION"

    # Wait for snapshot completion
    log "Waiting for snapshot completion..."
    aws rds wait db-snapshot-completed \
        --db-snapshot-identifier "$snapshot_id" \
        --region "$AWS_REGION"

    # Export snapshot to S3
    local export_id="postgres-export-$(date +%Y%m%d-%H%M%S)"
    log "Exporting snapshot to S3: $export_id"

    aws rds start-export-task \
        --export-task-identifier "$export_id" \
        --source-arn "arn:aws:rds:${AWS_REGION}:$(aws sts get-caller-identity --query Account --output text):snapshot:${snapshot_id}" \
        --s3-bucket-name "$BACKUP_BUCKET" \
        --s3-prefix "database-exports/$(date +%Y/%m/%d)/" \
        --iam-role-arn "arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):role/rds-s3-export-role" \
        --region "$AWS_REGION"

    log "RDS backup completed: $snapshot_id"

    # Clean up old snapshots (keep last 30 days)
    cleanup_old_snapshots
}

backup_redis() {
    log "Starting Redis backup..."

    # Create Redis backup using kubectl job
    local backup_job="redis-backup-$(date +%Y%m%d-%H%M%S)"

    kubectl apply -f - <<EOF
apiVersion: batch/v1
kind: Job
metadata:
  name: $backup_job
  namespace: batch
spec:
  template:
    spec:
      containers:
      - name: redis-backup
        image: redis:7-alpine
        command:
        - /bin/sh
        - -c
        - |
          redis-cli -h $REDIS_CLUSTER --rdb /backup/redis-backup-$(date +%Y%m%d-%H%M%S).rdb
          aws s3 cp /backup/redis-backup-$(date +%Y%m%d-%H%M%S).rdb s3://$BACKUP_BUCKET/redis-backups/$(date +%Y/%m/%d)/
        env:
        - name: AWS_DEFAULT_REGION
          value: $AWS_REGION
        volumeMounts:
        - name: backup-volume
          mountPath: /backup
      volumes:
      - name: backup-volume
        emptyDir: {}
      restartPolicy: Never
  backoffLimit: 3
EOF

    # Wait for job completion
    kubectl wait --for=condition=complete job/$backup_job -n batch --timeout=1800s

    # Clean up job
    kubectl delete job $backup_job -n batch

    log "Redis backup completed"
}

# Application data backup
backup_application_data() {
    log "Starting application data backup..."

    local backup_date=$(date +%Y/%m/%d)
    local backup_job="app-data-backup-$(date +%Y%m%d-%H%M%S)"

    # Backup S3 documents
    log "Backing up S3 documents..."
    aws s3 sync s3://platform-documents-${ENVIRONMENT}/ s3://${BACKUP_BUCKET}/application-data/${backup_date}/documents/ \
        --region "$AWS_REGION"

    # Backup configuration data
    log "Backing up Kubernetes configurations..."
    kubectl get all --all-namespaces -o yaml > /tmp/k8s-resources-backup.yaml
    kubectl get secrets --all-namespaces -o yaml > /tmp/k8s-secrets-backup.yaml
    kubectl get configmaps --all-namespaces -o yaml > /tmp/k8s-configmaps-backup.yaml

    # Upload to S3
    aws s3 cp /tmp/k8s-resources-backup.yaml s3://${BACKUP_BUCKET}/kubernetes-configs/${backup_date}/ --region "$AWS_REGION"
    aws s3 cp /tmp/k8s-secrets-backup.yaml s3://${BACKUP_BUCKET}/kubernetes-configs/${backup_date}/ --region "$AWS_REGION"
    aws s3 cp /tmp/k8s-configmaps-backup.yaml s3://${BACKUP_BUCKET}/kubernetes-configs/${backup_date}/ --region "$AWS_REGION"

    # Clean up temporary files
    rm -f /tmp/k8s-*-backup.yaml

    log "Application data backup completed"
}

# Configuration backup
backup_configurations() {
    log "Starting configuration backup..."

    local backup_date=$(date +%Y/%m/%d)

    # Backup Terraform state
    log "Backing up Terraform state..."
    cd infrastructure
    terraform state pull > /tmp/terraform-state-backup.json
    aws s3 cp /tmp/terraform-state-backup.json s3://${BACKUP_BUCKET}/terraform-state/${backup_date}/ --region "$AWS_REGION"
    rm -f /tmp/terraform-state-backup.json

    # Backup Helm releases
    log "Backing up Helm releases..."
    helm list --all-namespaces -o yaml > /tmp/helm-releases-backup.yaml
    aws s3 cp /tmp/helm-releases-backup.yaml s3://${BACKUP_BUCKET}/helm-releases/${backup_date}/ --region "$AWS_REGION"
    rm -f /tmp/helm-releases-backup.yaml

    # Backup monitoring configurations
    log "Backing up monitoring configurations..."
    kubectl get prometheusrules --all-namespaces -o yaml > /tmp/prometheus-rules-backup.yaml
    kubectl get servicemonitors --all-namespaces -o yaml > /tmp/service-monitors-backup.yaml

    aws s3 cp /tmp/prometheus-rules-backup.yaml s3://${BACKUP_BUCKET}/monitoring-configs/${backup_date}/ --region "$AWS_REGION"
    aws s3 cp /tmp/service-monitors-backup.yaml s3://${BACKUP_BUCKET}/monitoring-configs/${backup_date}/ --region "$AWS_REGION"

    rm -f /tmp/prometheus-rules-backup.yaml /tmp/service-monitors-backup.yaml

    log "Configuration backup completed"
}

# Cleanup functions
cleanup_old_snapshots() {
    log "Cleaning up old RDS snapshots..."

    # Get snapshots older than 30 days
    local cutoff_date=$(date -d '30 days ago' +%Y-%m-%d)

    aws rds describe-db-snapshots \
        --db-instanc"$RDS_INSTANCE" \
        --snapshot-type manual \
        --query "DBSnapshots[?SnapshotCreateTime<='${cutoff_date}'].DBSnapshotIdentifier" \
        --output text \
        --region "$AWS_REGION" | while read -r snapshot_id; do

        if [ -n "$snapshot_id" ]; then
            log "Deleting old snapshot: $snapshot_id"
            aws rds delete-db-snapshot \
                --db-snapshot-identifier "$snapshot_id" \
                --region "$AWS_REGION"
        fi
    done
}

cleanup_old_backups() {
    log "Cleaning up old S3 backups..."

    # Apply lifecycle policy to backup bucket
    aws s3api put-bucket-lifecycle-configuration \
        --bucket "$BACKUP_BUCKET" \
        --lifecycle-configuration file://<(cat <<EOF
{
    "Rules": [
        {
            "ID": "BackupRetentionPolicy",
            "Status": "Enabled",
            "Filter": {"Prefix": ""},
            "Transitions": [
                {
                    "Days": 30,
                    "StorageClass": "STANDARD_IA"
                },
                {
                    "Days": 90,
                    "StorageClass": "GLACIER"
                },
                {
                    "Days": 365,
                    "StorageClass": "DEEP_ARCHIVE"
                }
            ],
            "Expiration": {
                "Days": 2555
            }
        }
    ]
}
EOF
) \
        --region "$AWS_REGION"
}

# Verification functions
verify_backup() {
    local backup_type=$1
    log "Verifying $backup_type backup..."

    case $backup_type in
        "database")
            # Verify RDS snapshot exists
            local latest_snapshot=$(aws rds describe-db-snapshots \
                --db-instance-identifier "$RDS_INSTANCE" \
                --snapshot-type manual \
                --query 'DBSnapshots | sort_by(@, &SnapshotCreateTime) | [-1].DBSnapshotIdentifier' \
                --output text \
                --region "$AWS_REGION")

            if [ "$latest_snapshot" != "None" ]; then
                log "Latest RDS snapshot verified: $latest_snapshot"
            else
                error "No RDS snapshots found"
            fi
            ;;
        "application")
            # Verify S3 backup exists
            local backup_date=$(date +%Y/%m/%d)
            if aws s3 ls s3://${BACKUP_BUCKET}/application-data/${backup_date}/ --region "$AWS_REGION" &> /dev/null; then
                log "Application data backup verified for $backup_date"
            else
                error "Application data backup not found for $backup_date"
            fi
            ;;
        "configuration")
            # Verify configuration backup exists
            local backup_date=$(date +%Y/%m/%d)
            if aws s3 ls s3://${BACKUP_BUCKET}/terraform-state/${backup_date}/ --region "$AWS_REGION" &> /dev/null; then
                log "Configuration backup verified for $backup_date"
            else
                error "Configuration backup not found for $backup_date"
            fi
            ;;
    esac
}

# Notification functions
send_notification() {
    local status=$1
    local message=$2

    # Send to Slack
    if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"Backup $status: $message\"}" \
            "$SLACK_WEBHOOK_URL"
    fi

    # Send to SNS
    if [ -n "${SNS_TOPIC_ARN:-}" ]; then
        aws sns publish \
            --topic-arn "$SNS_TOPIC_ARN" \
            --message "Backup $status: $message" \
            --region "$AWS_REGION"
    fi
}

# Main execution
main() {
    local backup_type=${1:-all}

    log "Starting backup automation for: $backup_type"

    check_prerequisites

    case $backup_type in
        "database")
            backup_rds
            backup_redis
            verify_backup "database"
            ;;
        "application")
            backup_application_data
            verify_backup "application"
            ;;
        "configuration")
            backup_configurations
            verify_backup "configuration"
            ;;
        "all")
            backup_rds
            backup_redis
            backup_application_data
            backup_configurations
            cleanup_old_backups
            verify_backup "database"
            verify_backup "application"
            verify_backup "configuration"
            ;;
        *)
            error "Invalid backup type: $backup_type. Use: database|application|configuration|all"
            ;;
    esac

    log "Backup automation completed successfully"
    send_notification "SUCCESS" "Backup completed for $backup_type"
}

# Error handling
trap 'send_notification "FAILED" "Backup failed with error on line $LINENO"' ERR

# Execute main function
main "$@"
e-identifie
