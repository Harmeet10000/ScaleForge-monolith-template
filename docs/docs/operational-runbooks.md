# Operational Runbooks

## Overview

This document contains detailed runbooks for common operational tasks, maintenance procedures, and incident response workflows for the platform infrastructure.

## Daily Operations

### Morning Health Check Routine

**Frequency**: Daily at 9:00 AM UTC  
**Duration**: 15-20 minutes  
**Owner**: On-call Engineer

#### Checklist

```bash
# 1. Check cluster health
kubectl get nodes
kubectl get pods --all-namespaces | grep -v Running

# 2. Verify critical services
kubectl get pods -n apps
kubectl get pods -n infrastructure
kubectl get pods -n platform

# 3. Check resource usage
kubectl top nodes
kubectl top pods -n apps

# 4. Review overnight alerts
# Access Grafana dashboard: https://grafana.platform.company.com
# Check AlertManager: https://alertmanager.platform.company.com

# 5. Verify backup completion
kubectl get jobs -n batch | grep backup
aws s3 ls s3://platform-backups-prod/$(date +%Y/%m/%d)/

# 6. Check application health endpoints
curl -s https://api.platform.company.com/health | jq .
curl -s https://chat.platform.company.com/health | jq .
```

#### Expected Results

- All nodes in Ready state
- All critical pods in Running state
- CPU usage < 70%, Memory usage < 80%
- No critical alerts in last 8 hours
- Backup jobs completed successfully
- Health endpoints return 200 OK

#### Escalation

If any checks fail, follow the troubleshooting procedures in the [Troubleshooting Guide](troubleshooting-guide.md).

### Weekly Maintenance Tasks

**Frequency**: Every Sunday 02:00-06:00 UTC  
**Duration**: 2-4 hours  
**Owner**: Platform Team

#### Pre-Maintenance Checklist

```bash
# 1. Notify stakeholders
# Send maintenance notification 24 hours in advance

# 2. Create maintenance window in monitoring
# Silence non-critical alerts in AlertManager

# 3. Verify backup completion
kubectl get jobs -n batch | grep backup
aws rds describe-db-snapshots --db-instance-identifier platform-postgres-prod

# 4. Scale down non-essential services
kubectl scale deployment non-essential-service --replicas=0 -n workers
```

#### Maintenance Tasks

```bash
# 1. Update node AMIs (if available)
aws eks update-nodegroup-version --cluster-name platform-prod --nodegroup-name general

# 2. Rotate certificates
kubectl delete certificate api-tls -n platform
kubectl apply -f k8s/gateway/certificates.yaml

# 3. Clean up old resources
kubectl delete pods --field-selector=status.phase=Succeeded -n batch
docker system prune -f

# 4. Update Helm charts
helm repo update
helm upgrade prometheus prometheus-community/kube-prometheus-stack -n infrastructure

# 5. Security patches
kubectl patch daemonset aws-node -n kube-system -p '{"spec":{"template":{"spec":{"containers":[{"name":"aws-node","image":"602401143452.dkr.ecr.us-west-2.amazonaws.com/amazon-k8s-cni:v1.15.1"}]}}}}'
```

#### Post-Maintenance Verification

```bash
# 1. Verify all services are running
kubectl get pods --all-namespaces | grep -v Running

# 2. Run smoke tests
kubectl apply -f k8s/tests/smoke-tests.yaml
kubectl wait --for=condition=complete job/smoke-tests -n tests --timeout=300s

# 3. Check monitoring dashboards
# Verify metrics are being collected
# Check for any new alerts

# 4. Scale services back up
kubectl scale deployment non-essential-service --replicas=3 -n workers

# 5. Remove maintenance window
# Re-enable alerts in AlertManager
```

## Deployment Procedures

### Application Deployment Runbook

**Use Case**: Deploy new application version  
**Duration**: 15-30 minutes  
**Owner**: Development Team / DevOps Engineer

#### Pre-Deployment Checklist

```bash
# 1. Verify image exists in ECR
aws ecr describe-images --repository-name fastapi-app --image-ids imageTag=${IMAGE_TAG}

# 2. Check cluster capacity
kubectl describe nodes | grep -A 5 "Allocated resources"

# 3. Verify current application health
kubectl get pods -n apps -l app=fastapi-app
curl -s https://api.platform.company.com/health

# 4. Create deployment backup
kubectl get deployment fastapi-app -n apps -o yaml > fastapi-backup-$(date +%Y%m%d-%H%M%S).yaml
```

#### Deployment Steps

```bash
# 1. Update deployment image
kubectl set image deployment/fastapi-app fastapi=${ECR_REGISTRY}/fastapi-app:${IMAGE_TAG} -n apps

# 2. Monitor rollout
kubectl rollout status deployment/fastapi-app -n apps --timeout=600s

# 3. Verify new pods are running
kubectl get pods -n apps -l app=fastapi-app

# 4. Check application logs
kubectl logs -n apps -l app=fastapi-app --tail=50

# 5. Run health checks
curl -s https://api.platform.company.com/health | jq .
curl -s https://api.platform.company.com/ready | jq .
```

#### Post-Deployment Verification

```bash
# 1. Verify all pods are ready
kubectl get pods -n apps -l app=fastapi-app | grep Running

# 2. Check HPA status
kubectl get hpa fastapi-hpa -n apps

# 3. Monitor error rates
# Check Grafana dashboard for error rate metrics

# 4. Verify database connectivity
kubectl exec -it deployment/fastapi-app -n apps -- python -c "import psycopg2; print('DB connection OK')"

# 5. Run integration tests
kubectl apply -f k8s/tests/integration-tests.yaml
```

#### Rollback Procedure

```bash
# If deployment fails, rollback immediately
kubectl rollout undo deployment/fastapi-app -n apps

# Verify rollback
kubectl rollout status deployment/fastapi-app -n apps

# Check application health
curl -s https://api.platform.company.com/health
```

### Infrastructure Update Runbook

**Use Case**: Update Terraform infrastructure  
**Duration**: 1-2 hours  
**Owner**: Platform Engineer

#### Pre-Update Checklist

```bash
# 1. Create infrastructure backup
cd infrastructure
terraform show > terraform-state-backup-$(date +%Y%m%d-%H%M%S).txt

# 2. Verify Terraform version
terraform version

# 3. Initialize and validate
terraform init -backend-config=backend-config/prod.hcl
terraform validate

# 4. Plan changes
terraform plan -var-file=environments/prod.tfvars -out=prod.tfplan

# 5. Review plan output
# Ensure no unexpected resource deletions
# Verify changes align with requirements
```

#### Update Steps

```bash
# 1. Apply infrastructure changes
terraform apply prod.tfplan

# 2. Update kubeconfig if EKS changes
aws eks update-kubeconfig --region us-west-2 --name platform-prod

# 3. Verify infrastructure health
kubectl get nodes
kubectl cluster-info

# 4. Check AWS resources
aws eks describe-cluster --name platform-prod
aws rds describe-db-instances --db-instance-identifier platform-postgres-prod
```

#### Post-Update Verification

```bash
# 1. Verify all nodes are ready
kubectl get nodes | grep Ready

# 2. Check pod status
kubectl get pods --all-namespaces | grep -v Running

# 3. Test application connectivity
curl -s https://api.platform.company.com/health

# 4. Verify monitoring
kubectl get pods -n infrastructure | grep prometheus
kubectl get pods -n infrastructure | grep grafana

# 5. Check logs for errors
kubectl logs -n kube-system -l app=aws-load-balancer-controller
```

## Incident Response Procedures

### Critical Service Down (P0)

**Response Time**: 15 minutes  
**Owner**: On-call Engineer

#### Immediate Response (0-15 minutes)

```bash
# 1. Acknowledge incident
# Update incident status in PagerDuty
# Post in #platform-incidents Slack channel

# 2. Quick assessment
kubectl get pods --all-namespaces | grep -v Running
kubectl get nodes | grep -v Ready

# 3. Check recent changes
kubectl rollout history deployment/fastapi-app -n apps
kubectl rollout history deployment/express-app -n apps

# 4. Gather initial information
kubectl describe pod <failing-pod> -n <namespace>
kubectl logs <failing-pod> -n <namespace> --tail=100
```

#### Investigation (15-30 minutes)

```bash
# 1. Check infrastructure health
aws eks describe-cluster --name platform-prod
aws rds describe-db-instances --db-instance-identifier platform-postgres-prod

# 2. Review monitoring dashboards
# Check Grafana for anomalies
# Review AlertManager for related alerts

# 3. Check external dependencies
curl -s https://api.pinecone.io/health
dig api.platform.company.com

# 4. Analyze logs
kubectl logs -n apps -l app=fastapi-app --since=1h | grep ERROR
kubectl logs -n infrastructure -l app=prometheus --since=1h | grep ERROR
```

#### Resolution Actions

```bash
# Option 1: Restart failing services
kubectl rollout restart deployment/fastapi-app -n apps
kubectl rollout status deployment/fastapi-app -n apps

# Option 2: Rollback to previous version
kubectl rollout undo deployment/fastapi-app -n apps
kubectl rollout status deployment/fastapi-app -n apps

# Option 3: Scale up resources
kubectl patch hpa fastapi-hpa -n apps -p '{"spec":{"maxReplicas":30}}'
kubectl scale deployment fastapi-app --replicas=10 -n apps

# Option 4: Emergency maintenance
kubectl cordon <problematic-node>
kubectl drain <problematic-node> --ignore-daemonsets --delete-emptydir-data
```

#### Recovery Verification

```bash
# 1. Verify service health
curl -s https://api.platform.company.com/health | jq .
curl -s https://chat.platform.company.com/health | jq .

# 2. Check all pods are running
kubectl get pods -n apps | grep -v Running

# 3. Monitor error rates
# Check Grafana dashboard for error metrics

# 4. Verify user functionality
# Run critical user journey tests
kubectl apply -f k8s/tests/critical-path-tests.yaml
```

### Database Performance Issues (P1)

**Response Time**: 1 hour  
**Owner**: Database Administrator / Platform Engineer

#### Assessment

```bash
# 1. Check RDS metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name CPUUtilization \
  --dimensions Name=DBInstanceIdentifier,Value=platform-postgres-prod \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average,Maximum

# 2. Check connection count
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name DatabaseConnections \
  --dimensions Name=DBInstanceIdentifier,Value=platform-postgres-prod \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average,Maximum

# 3. Check application connection pools
kubectl logs -n apps -l app=fastapi-app | grep -i "connection\|pool"
```

#### Investigation

```bash
# 1. Connect to database for analysis
kubectl run -it --rm debug --image=postgres:15 --restart=Never -- psql -h <rds-endpoint> -U <username> -d <database>

# Inside PostgreSQL:
SELECT * FROM pg_stat_activity WHERE state = 'active';
SELECT query, calls, total_time, mean_time FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;
SELECT schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del FROM pg_stat_user_tables;

# 2. Check for blocking queries
SELECT blocked_locks.pid AS blocked_pid,
       blocked_activity.usename AS blocked_user,
       blocking_locks.pid AS blocking_pid,
       blocking_activity.usename AS blocking_user,
       blocked_activity.query AS blocked_statement,
       blocking_activity.query AS current_statement_in_blocking_process
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;
```

#### Resolution Actions

```bash
# Option 1: Scale RDS instance
aws rds modify-db-instance \
  --db-instance-identifier platform-postgres-prod \
  --db-instance-class db.r6g.xlarge \
  --apply-immediately

# Option 2: Add read replica
aws rds create-db-instance-read-replica \
  --db-instance-identifier platform-postgres-prod-read-replica \
  --source-db-instance-identifier platform-postgres-prod \
  --db-instance-class db.r6g.large

# Option 3: Optimize application queries
# Review slow query logs and optimize problematic queries
# Update application connection pool settings

# Option 4: Emergency cache warming
kubectl exec -it deployment/fastapi-app -n apps -- python -c "
import redis
r = redis.Redis(host='redis-cluster-endpoint')
# Warm critical cache keys
"
```

### Storage Issues (P2)

**Response Time**: 4 hours  
**Owner**: Platform Engineer

#### Assessment

```bash
# 1. Check PVC status
kubectl get pvc --all-namespaces
kubectl describe pvc <pvc-name> -n <namespace>

# 2. Check storage class
kubectl get storageclass
kubectl describe storageclass gp3

# 3. Check EBS volumes
aws ec2 describe-volumes --filters "Name=tag:kubernetes.io/cluster/platform-prod,Values=owned"

# 4. Check node storage
kubectl describe nodes | grep -A 10 "Allocated resources"
```

#### Investigation

```bash
# 1. Check for storage alerts
kubectl get events --all-namespaces | grep -i storage

# 2. Verify CSI driver
kubectl get pods -n kube-system | grep ebs-csi

# 3. Check volume attachments
kubectl get volumeattachments

# 4. Review storage metrics
# Check Grafana dashboard for storage utilization
```

#### Resolution Actions

```bash
# Option 1: Expand existing PVC
kubectl patch pvc <pvc-name> -n <namespace> -p '{"spec":{"resources":{"requests":{"storage":"200Gi"}}}}'

# Option 2: Create new storage class
kubectl apply -f - <<EOF
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: gp3-fast
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  iops: "3000"
  throughput: "125"
allowVolumeExpansion: true
EOF

# Option 3: Clean up unused volumes
kubectl delete pvc <unused-pvc> -n <namespace>
aws ec2 delete-volume --volume-id <unused-volume-id>
```

## Backup and Recovery Procedures

### Database Backup Runbook

**Frequency**: Daily at 02:00 UTC  
**Retention**: 30 days  
**Owner**: Automated (CronJob)

#### Manual Backup Procedure

```bash
# 1. Create RDS snapshot
aws rds create-db-snapshot \
  --db-instance-identifier platform-postgres-prod \
  --db-snapshot-identifier platform-postgres-manual-$(date +%Y%m%d-%H%M%S)

# 2. Verify snapshot creation
aws rds describe-db-snapshots \
  --db-instance-identifier platform-postgres-prod \
  --snapshot-type manual

# 3. Export to S3 (for cross-region backup)
aws rds start-export-task \
  --export-task-identifier postgres-export-$(date +%Y%m%d-%H%M%S) \
  --source-arn arn:aws:rds:us-west-2:123456789012:snapshot:platform-postgres-manual-$(date +%Y%m%d-%H%M%S) \
  --s3-bucket-name platform-backups-prod \
  --s3-prefix database-exports/ \
  --iam-role-arn arn:aws:iam::123456789012:role/rds-s3-export-role
```

#### Backup Verification

```bash
# 1. Check backup job status
kubectl get jobs -n batch | grep backup

# 2. Verify backup files
aws s3 ls s3://platform-backups-prod/database/$(date +%Y/%m/%d)/

# 3. Test backup integrity
kubectl apply -f - <<EOF
apiVersion: batch/v1
kind: Job
metadata:
  name: backup-verification
  namespace: batch
spec:
  template:
    spec:
      containers:
      - name: verify
        image: postgres:15
        command: ["pg_restore", "--list", "/backups/latest.dump"]
        volumeMounts:
        - name: backup-volume
          mountPath: /backups
      volumes:
      - name: backup-volume
        persistentVolumeClaim:
          claimName: backup-pvc
      restartPolicy: Never
EOF
```

### Database Recovery Runbook

**Use Case**: Restore database from backup  
**Duration**: 2-4 hours  
**Owner**: Database Administrator

#### Point-in-Time Recovery

```bash
# 1. Identify recovery point
aws rds describe-db-instances \
  --db-instance-identifier platform-postgres-prod \
  --query 'DBInstances[0].LatestRestorableTime'

# 2. Create new instance from point-in-time
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier platform-postgres-prod \
  --target-db-instance-identifier platform-postgres-recovery \
  --restore-time 2023-12-01T10:30:00.000Z \
  --db-instance-class db.r6g.large \
  --multi-az

# 3. Wait for instance to be available
aws rds wait db-instance-available \
  --db-instance-identifier platform-postgres-recovery

# 4. Update application configuration
kubectl patch secret database-credentials -n apps -p '{"data":{"host":"<new-endpoint-base64>"}}'

# 5. Restart applications
kubectl rollout restart deployment/fastapi-app -n apps
kubectl rollout restart deployment/express-app -n apps
```

#### Snapshot Recovery

```bash
# 1. List available snapshots
aws rds describe-db-snapshots \
  --db-instance-identifier platform-postgres-prod \
  --snapshot-type automated

# 2. Restore from snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier platform-postgres-recovery \
  --db-snapshot-identifier rds:platform-postgres-prod-2023-12-01-02-00 \
  --db-instance-class db.r6g.large

# 3. Verify recovery
kubectl run -it --rm debug --image=postgres:15 --restart=Never -- psql -h <recovery-endpoint> -U <username> -d <database> -c "SELECT COUNT(*) FROM users;"
```

### Application Data Recovery

**Use Case**: Recover application data from S3 backup  
**Duration**: 1-2 hours  
**Owner**: Platform Engineer

#### S3 Data Recovery

```bash
# 1. List available backups
aws s3 ls s3://platform-backups-prod/application-data/

# 2. Download backup
aws s3 sync s3://platform-backups-prod/application-data/2023/12/01/ /tmp/recovery/

# 3. Create recovery job
kubectl apply -f - <<EOF
apiVersion: batch/v1
kind: Job
metadata:
  name: data-recovery
  namespace: batch
spec:
  template:
    spec:
      containers:
      - name: recovery
        image: ${ECR_REGISTRY}/data-recovery:latest
        env:
        - name: RECOVERY_PATH
          value: "/recovery-data"
        - name: TARGET_BUCKET
          value: "platform-documents-prod"
        volumeMounts:
        - name: recovery-data
          mountPath: /recovery-data
      volumes:
      - name: recovery-data
        persistentVolumeClaim:
          claimName: recovery-pvc
      restartPolicy: Never
EOF

# 4. Monitor recovery progress
kubectl logs job/data-recovery -n batch -f
```

## Security Procedures

### Security Incident Response

**Response Time**: 30 minutes  
**Owner**: Security Team / On-call Engineer

#### Immediate Actions

```bash
# 1. Isolate affected resources
kubectl cordon <compromised-node>
kubectl drain <compromised-node> --ignore-daemonsets --delete-emptydir-data

# 2. Collect evidence
kubectl logs <suspicious-pod> -n <namespace> > incident-logs-$(date +%Y%m%d-%H%M%S).txt
kubectl describe pod <suspicious-pod> -n <namespace> > pod-details-$(date +%Y%m%d-%H%M%S).txt

# 3. Check for lateral movement
kubectl get pods --all-namespaces -o wide | grep <compromised-node>
kubectl get networkpolicies --all-namespaces

# 4. Review access logs
aws cloudtrail lookup-events --lookup-attributes AttributeKey=EventName,AttributeValue=AssumeRole --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) --end-time $(date -u +%Y-%m-%dT%H:%M:%S)
```

#### Investigation

```bash
# 1. Analyze container images
docker history <suspicious-image>
trivy image <suspicious-image>

# 2. Check for privilege escalation
kubectl auth can-i --list --as=system:serviceaccount:<namespace>:<serviceaccount>

# 3. Review RBAC permissions
kubectl get rolebindings,clusterrolebindings --all-namespaces -o wide | grep <suspicious-serviceaccount>

# 4. Check network traffic
kubectl exec -it <network-monitoring-pod> -n infrastructure -- tcpdump -i any -w /tmp/capture.pcap
```

### Certificate Rotation

**Frequency**: Every 90 days (automated)  
**Owner**: cert-manager (automated) / Platform Engineer (manual)

#### Manual Certificate Rotation

```bash
# 1. Check certificate expiration
kubectl get certificates --all-namespaces
openssl x509 -in <cert-file> -text -noout | grep "Not After"

# 2. Force certificate renewal
kubectl annotate certificate <cert-name> -n <namespace> cert-manager.io/issue-temporary-certificate="true"

# 3. Verify new certificate
kubectl describe certificate <cert-name> -n <namespace>
kubectl get secret <cert-secret> -n <namespace> -o yaml

# 4. Test certificate
curl -vI https://<domain> 2>&1 | grep "expire date"
```

### Secret Rotation

**Frequency**: Every 30 days  
**Owner**: Platform Engineer

#### Database Password Rotation

```bash
# 1. Generate new password
NEW_PASSWORD=$(openssl rand -base64 32)

# 2. Update RDS password
aws rds modify-db-instance \
  --db-instance-identifier platform-postgres-prod \
  --master-user-password $NEW_PASSWORD \
  --apply-immediately

# 3. Update Kubernetes secret
kubectl patch secret database-credentials -n apps -p "{\"data\":{\"password\":\"$(echo -n $NEW_PASSWORD | base64)\"}}"

# 4. Restart applications
kubectl rollout restart deployment/fastapi-app -n apps
kubectl rollout restart deployment/express-app -n apps

# 5. Verify connectivity
kubectl exec -it deployment/fastapi-app -n apps -- python -c "import psycopg2; print('DB connection OK')"
```

## Performance Optimization

### Resource Optimization Runbook

**Frequency**: Monthly  
**Duration**: 2-3 hours  
**Owner**: Platform Engineer

#### Resource Analysis

```bash
# 1. Analyze resource usage
kubectl top nodes
kubectl top pods --all-namespaces --sort-by=cpu
kubectl top pods --all-namespaces --sort-by=memory

# 2. Check resource requests vs usage
kubectl describe nodes | grep -A 5 "Allocated resources"

# 3. Identify underutilized resources
kubectl get pods --all-namespaces -o custom-columns=NAME:.metadata.name,NAMESPACE:.metadata.namespace,CPU_REQUEST:.spec.containers[*].resources.requests.cpu,MEMORY_REQUEST:.spec.containers[*].resources.requests.memory

# 4. Review HPA metrics
kubectl get hpa --all-namespaces
kubectl describe hpa <hpa-name> -n <namespace>
```

#### Optimization Actions

```bash
# 1. Right-size resource requests
kubectl patch deployment <deployment-name> -n <namespace> -p '{"spec":{"template":{"spec":{"containers":[{"name":"<container-name>","resources":{"requests":{"cpu":"500m","memory":"1Gi"},"limits":{"cpu":"1000m","memory":"2Gi"}}}]}}}}'

# 2. Optimize HPA settings
kubectl patch hpa <hpa-name> -n <namespace> -p '{"spec":{"targetCPUUtilizationPercentage":60,"minReplicas":2,"maxReplicas":15}}'

# 3. Enable VPA for recommendations
kubectl apply -f - <<EOF
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: <deployment-name>-vpa
  namespace: <namespace>
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: <deployment-name>
  updatePolicy:
    updateMode: "Off"  # Recommendation only
EOF

# 4. Optimize node groups
aws eks update-nodegroup-config \
  --cluster-name platform-prod \
  --nodegroup-name general \
  --scaling-config minSize=2,maxSize=8,desiredSize=4
```

This comprehensive runbook collection provides detailed procedures for all common operational tasks, ensuring consistent and reliable platform management.
