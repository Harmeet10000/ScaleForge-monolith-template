# Troubleshooting Guide

## Overview

This guide provides comprehensive troubleshooting procedures for common issues encountered in the platform infrastructure and applications.

## Infrastructure Issues

### EKS Cluster Issues

#### Cluster Not Accessible

**Symptoms:**

- `kubectl` commands fail with connection errors
- Unable to access cluster API server

**Diagnosis:**

```bash
# Check cluster status
aws eks describe-cluster --name ${CLUSTER_NAME}

# Verify kubeconfig
kubectl config current-context

# Check AWS credentials
aws sts get-caller-identity
```

**Resolution:**

```bash
# Update kubeconfig
aws eks update-kubeconfig --region ${AWS_REGION} --name ${CLUSTER_NAME}

# Verify cluster endpoint accessibility
curl -k https://<cluster-endpoint>/healthz

# Check security group rules
aws ec2 describe-security-groups --group-ids <cluster-security-group-id>
```

#### Node Group Issues

**Symptoms:**

- Nodes not joining cluster
- Pods stuck in Pending state
- Node capacity issues

**Diagnosis:**

```bash
# Check node status
kubectl get nodes -o wide

# Check node group status
aws eks describe-nodegroup --cluster-name ${CLUSTER_NAME} --nodegroup-name <nodegroup-name>

# Check node logs
kubectl describe node <node-name>
```

**Resolution:**

```bash
# Scale node group
aws eks update-nodegroup-config --cluster-name ${CLUSTER_NAME} --nodegroup-name <nodegroup-name> --scaling-config minSize=1,maxSize=10,desiredSize=3

# Drain and replace problematic nodes
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data
kubectl delete node <node-name>
```

### RDS Issues

#### Connection Failures

**Symptoms:**

- Applications cannot connect to database
- Connection timeout errors
- Authentication failures

**Diagnosis:**

```bash
# Check RDS instance status
aws rds describe-db-instances --db-instance-identifier platform-postgres-${ENVIRONMENT}

# Test connectivity from EKS
kubectl run -it --rm debug --image=postgres:15 --restart=Never -- psql -h <rds-endpoint> -U <username> -d <database>

# Check security groups
aws ec2 describe-security-groups --group-ids <rds-security-group-id>
```

**Resolution:**

```bash
# Update security group rules
aws ec2 authorize-security-group-ingress --group-id <rds-sg-id> --protocol tcp --port 5432 --source-group <eks-sg-id>

# Reset database password
aws rds modify-db-instance --db-instance-identifier platform-postgres-${ENVIRONMENT} --master-user-password <new-password>

# Check parameter group settings
aws rds describe-db-parameters --db-parameter-group-name <parameter-group-name>
```

#### Performance Issues

**Symptoms:**

- Slow query performance
- High CPU/memory usage
- Connection pool exhaustion

**Diagnosis:**

```bash
# Check RDS metrics
aws cloudwatch get-metric-statistics --namespace AWS/RDS --metric-name CPUUtilization --dimensions Name=DBInstanceIdentifier,Value=platform-postgres-${ENVIRONMENT} --start-time 2023-01-01T00:00:00Z --end-time 2023-01-01T23:59:59Z --period 3600 --statistics Average

# Check slow query logs
aws rds download-db-log-file-portion --db-instance-identifier platform-postgres-${ENVIRONMENT} --log-file-name error/postgresql.log.2023-01-01-00
```

**Resolution:**

```bash
# Scale RDS instance
aws rds modify-db-instance --db-instance-identifier platform-postgres-${ENVIRONMENT} --db-instance-class db.r6g.xlarge --apply-immediately

# Optimize database parameters
aws rds modify-db-parameter-group --db-parameter-group-name <parameter-group> --parameters ParameterName=shared_preload_libraries,ParameterValue=pg_stat_statements,ApplyMethod=pending-reboot
```

## Application Issues

### Pod Issues

#### CrashLoopBackOff

**Symptoms:**

- Pods continuously restarting
- Application startup failures
- Resource limit exceeded

**Diagnosis:**

```bash
# Check pod status and events
kubectl describe pod <pod-name> -n <namespace>

# Check current and previous logs
kubectl logs <pod-name> -n <namespace>
kubectl logs <pod-name> -n <namespace> --previous

# Check resource usage
kubectl top pod <pod-name> -n <namespace>
```

**Resolution:**

```bash
# Increase resource limits
kubectl patch deployment <deployment-name> -n <namespace> -p '{"spec":{"template":{"spec":{"containers":[{"name":"<container-name>","resources":{"limits":{"memory":"2Gi","cpu":"1000m"}}}]}}}}'

# Check and fix configuration
kubectl get configmap <configmap-name> -n <namespace> -o yaml

# Restart deployment
kubectl rollout restart deployment/<deployment-name> -n <namespace>
```

#### ImagePullBackOff

**Symptoms:**

- Pods cannot pull container images
- Authentication errors with registry
- Image not found errors

**Diagnosis:**

```bash
# Check pod events
kubectl describe pod <pod-name> -n <namespace>

# Verify image exists
docker pull <image-name>

# Check image pull secrets
kubectl get secrets -n <namespace>
kubectl describe secret <image-pull-secret> -n <namespace>
```

**Resolution:**

```bash
# Update image pull secret
kubectl create secret docker-registry <secret-name> --docker-server=<registry-url> --docker-username=<username> --docker-password=<password> -n <namespace>

# Update deployment with correct image
kubectl set image deployment/<deployment-name> <container-name>=<correct-image> -n <namespace>

# Verify ECR login
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}
```

### Service Discovery Issues

#### Service Unreachable

**Symptoms:**

- Services cannot communicate
- DNS resolution failures
- Connection refused errors

**Diagnosis:**

```bash
# Check service status
kubectl get svc -n <namespace>
kubectl describe svc <service-name> -n <namespace>

# Test DNS resolution
kubectl run -it --rm debug --image=busybox --restart=Never -- nslookup <service-name>.<namespace>.svc.cluster.local

# Check endpoints
kubectl get endpoints <service-name> -n <namespace>
```

**Resolution:**

```bash
# Check selector labels
kubectl get pods -n <namespace> --show-labels
kubectl describe svc <service-name> -n <namespace>

# Update service selector
kubectl patch svc <service-name> -n <namespace> -p '{"spec":{"selector":{"app":"<correct-label>"}}}'

# Restart CoreDNS
kubectl rollout restart deployment/coredns -n kube-system
```

### Ingress Issues

#### SSL/TLS Certificate Issues

**Symptoms:**

- SSL certificate errors
- HTTPS connections failing
- Certificate not found

**Diagnosis:**

```bash
# Check certificate status
kubectl get certificates -A
kubectl describe certificate <cert-name> -n <namespace>

# Check cert-manager logs
kubectl logs -n cert-manager -l app=cert-manager

# Test certificate
openssl s_client -connect <domain>:443 -servername <domain>
```

**Resolution:**

```bash
# Delete and recreate certificate
kubectl delete certificate <cert-name> -n <namespace>
kubectl apply -f <certificate-manifest>

# Check cert-manager configuration
kubectl describe clusterissuer <issuer-name>

# Force certificate renewal
kubectl annotate certificate <cert-name> -n <namespace> cert-manager.io/issue-temporary-certificate="true"
```

## Monitoring and Observability Issues

### Prometheus Issues

#### Metrics Not Collected

**Symptoms:**

- Missing metrics in Grafana
- Prometheus targets down
- Scrape errors

**Diagnosis:**

```bash
# Check Prometheus targets
kubectl port-forward -n observability svc/prometheus 9090:9090
# Access http://localhost:9090/targets

# Check ServiceMonitor configuration
kubectl get servicemonitor -A
kubectl describe servicemonitor <servicemonitor-name> -n <namespace>

# Check Prometheus logs
kubectl logs -n observability -l app=prometheus
```

**Resolution:**

```bash
# Update ServiceMonitor labels
kubectl patch servicemonitor <servicemonitor-name> -n <namespace> -p '{"spec":{"selector":{"matchLabels":{"app":"<correct-label>"}}}}'

# Restart Prometheus
kubectl rollout restart statefulset/prometheus-prometheus -n observability

# Check RBAC permissions
kubectl auth can-i get pods --as=system:serviceaccount:observability:prometheus
```

### Grafana Issues

#### Dashboard Not Loading

**Symptoms:**

- Grafana dashboards show no data
- Data source connection errors
- Query errors

**Diagnosis:**

```bash
# Check Grafana logs
kubectl logs -n observability -l app=grafana

# Access Grafana UI
kubectl port-forward -n observability svc/grafana 3000:80

# Check data source configuration
# Access Grafana UI -> Configuration -> Data Sources
```

**Resolution:**

```bash
# Update data source URL
kubectl patch configmap grafana-datasources -n observability -p '{"data":{"datasources.yaml":"apiVersion: 1\ndatasources:\n- name: Prometheus\n  type: prometheus\n  url: http://prometheus:9090"}}'

# Restart Grafana
kubectl rollout restart deployment/grafana -n observability

# Import missing dashboards
kubectl apply -f k8s/observability/grafana-dashboards.yaml
```

## Storage Issues

### PVC Issues

#### Persistent Volume Claims Pending

**Symptoms:**

- PVCs stuck in Pending state
- Pods cannot start due to volume mount failures
- Storage class issues

**Diagnosis:**

```bash
# Check PVC status
kubectl get pvc -A
kubectl describe pvc <pvc-name> -n <namespace>

# Check storage classes
kubectl get storageclass

# Check available storage
kubectl get pv
```

**Resolution:**

```bash
# Create storage class if missing
kubectl apply -f - <<EOF
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: gp3
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  fsType: ext4
allowVolumeExpansion: true
EOF

# Delete and recreate PVC
kubectl delete pvc <pvc-name> -n <namespace>
kubectl apply -f <pvc-manifest>
```

## Network Issues

### Network Policy Issues

#### Pod-to-Pod Communication Blocked

**Symptoms:**

- Services cannot communicate across namespaces
- Network timeouts
- Connection refused errors

**Diagnosis:**

```bash
# Check network policies
kubectl get networkpolicy -A
kubectl describe networkpolicy <policy-name> -n <namespace>

# Test connectivity
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -- curl http://<service>.<namespace>.svc.cluster.local
```

**Resolution:**

```bash
# Update network policy to allow traffic
kubectl patch networkpolicy <policy-name> -n <namespace> -p '{"spec":{"ingress":[{"from":[{"namespaceSelector":{"matchLabels":{"name":"<source-namespace>"}}}]}]}}'

# Temporarily disable network policy for testing
kubectl delete networkpolicy <policy-name> -n <namespace>
```

## Security Issues

### RBAC Issues

#### Permission Denied Errors

**Symptoms:**

- ServiceAccount cannot access resources
- API server returns 403 errors
- Pods cannot perform required operations

**Diagnosis:**

```bash
# Check ServiceAccount permissions
kubectl auth can-i <verb> <resource> --as=system:serviceaccount:<namespace>:<serviceaccount>

# Check RoleBindings and ClusterRoleBindings
kubectl get rolebinding,clusterrolebinding -A | grep <serviceaccount>

# Describe RBAC resources
kubectl describe role <role-name> -n <namespace>
kubectl describe rolebinding <rolebinding-name> -n <namespace>
```

**Resolution:**

```bash
# Create missing RBAC resources
kubectl create role <role-name> --verb=get,list,watch --resource=pods -n <namespace>
kubectl create rolebinding <binding-name> --role=<role-name> --serviceaccount=<namespace>:<serviceaccount> -n <namespace>

# Update existing role permissions
kubectl patch role <role-name> -n <namespace> -p '{"rules":[{"apiGroups":[""],"resources":["pods"],"verbs":["get","list","watch","create","update","patch","delete"]}]}'
```

## Performance Issues

### High Resource Usage

#### CPU Throttling

**Symptoms:**

- Application response times increased
- CPU throttling metrics high
- Performance degradation

**Diagnosis:**

```bash
# Check resource usage
kubectl top pods -n <namespace>
kubectl top nodes

# Check resource limits
kubectl describe pod <pod-name> -n <namespace>

# Check metrics
kubectl get --raw /apis/metrics.k8s.io/v1beta1/namespaces/<namespace>/pods/<pod-name>
```

**Resolution:**

```bash
# Increase CPU limits
kubectl patch deployment <deployment-name> -n <namespace> -p '{"spec":{"template":{"spec":{"containers":[{"name":"<container-name>","resources":{"limits":{"cpu":"2000m"},"requests":{"cpu":"1000m"}}}]}}}}'

# Scale horizontally
kubectl scale deployment <deployment-name> --replicas=5 -n <namespace>

# Check HPA configuration
kubectl get hpa -n <namespace>
kubectl describe hpa <hpa-name> -n <namespace>
```

#### Memory Issues

**Symptoms:**

- Out of Memory (OOM) kills
- Memory usage constantly high
- Pods being evicted

**Diagnosis:**

```bash
# Check memory usage
kubectl top pods -n <namespace> --sort-by=memory

# Check OOM events
kubectl get events -n <namespace> --field-selector reason=OOMKilling

# Check node memory pressure
kubectl describe nodes
```

**Resolution:**

```bash
# Increase memory limits
kubectl patch deployment <deployment-name> -n <namespace> -p '{"spec":{"template":{"spec":{"containers":[{"name":"<container-name>","resources":{"limits":{"memory":"4Gi"},"requests":{"memory":"2Gi"}}}]}}}}'

# Add more nodes
aws eks update-nodegroup-config --cluster-name ${CLUSTER_NAME} --nodegroup-name <nodegroup-name> --scaling-config desiredSize=5

# Check for memory leaks in application
kubectl exec -it <pod-name> -n <namespace> -- /bin/sh
# Use memory profiling tools
```

## Backup and Recovery Issues

### Backup Failures

#### Database Backup Issues

**Symptoms:**

- Scheduled backups failing
- Backup files corrupted
- Recovery point objectives not met

**Diagnosis:**

```bash
# Check backup job status
kubectl get jobs -n batch
kubectl describe job <backup-job-name> -n batch

# Check backup logs
kubectl logs job/<backup-job-name> -n batch

# Verify backup files in S3
aws s3 ls s3://<backup-bucket>/database-backups/
```

**Resolution:**

```bash
# Restart failed backup job
kubectl delete job <backup-job-name> -n batch
kubectl apply -f k8s/batch/database-backup-job.yaml

# Check backup script permissions
kubectl exec -it <backup-pod> -n batch -- ls -la /backup-scripts/

# Verify S3 bucket permissions
aws s3api get-bucket-policy --bucket <backup-bucket>
```

## Emergency Procedures

### Complete System Failure

#### Disaster Recovery Steps

1. **Assess the situation**

   - Determine scope of failure
   - Identify affected services
   - Estimate recovery time

2. **Activate incident response**

   - Notify stakeholders
   - Activate on-call team
   - Create incident ticket

3. **Execute recovery plan**

   ```bash
   # Restore from backup
   cd infrastructure
   terraform init -backend-config=backend-config/${ENVIRONMENT}.hcl
   terraform apply -var-file=environments/${ENVIRONMENT}.tfvars

   # Restore database
   kubectl apply -f k8s/batch/database-restore-job.yaml

   # Redeploy applications
   kubectl apply -f k8s/apps/
   ```

4. **Verify recovery**

   - Test critical functionality
   - Monitor system health
   - Validate data integrity

5. **Post-incident review**
   - Document lessons learned
   - Update procedures
   - Implement preventive measures

### Escalation Matrix

| Severity      | Response Time     | Escalation Path               |
| ------------- | ----------------- | ----------------------------- |
| P0 - Critical | 15 minutes        | On-call → Team Lead → Manager |
| P1 - High     | 1 hour            | On-call → Team Lead           |
| P2 - Medium   | 4 hours           | On-call                       |
| P3 - Low      | Next business day | Team member                   |

### Contact Information

- **On-call Phone**: +1-xxx-xxx-xxxx
- **Slack Channel**: #platform-incidents
- **PagerDuty**: https://company.pagerduty.com
- **Incident Management**: https://company.atlassian.net
