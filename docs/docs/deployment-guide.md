# Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the platform infrastructure and applications across different environments (dev, staging, production).

## Prerequisites

### Required Tools

- AWS CLI v2.x configured with appropriate credentials
- Terraform v1.5+
- kubectl v1.28+
- Docker v20.10+
- Helm v3.12+
- Git v2.30+

### AWS Permissions Required

- EC2 Full Access
- EKS Full Access
- RDS Full Access
- S3 Full Access
- IAM Full Access
- VPC Full Access
- Route53 Full Access
- ElastiCache Full Access

### Environment Variables

```bash
export AWS_REGION=us-west-2
export ENVIRONMENT=dev|stage|prod
export CLUSTER_NAME=platform-${ENVIRONMENT}
export ECR_REGISTRY=123456789012.dkr.ecr.us-west-2.amazonaws.com
```

## Phase 1: Infrastructure Deployment

### Step 1: Initialize Terraform Backend

```bash
# Navigate to infrastructure directory
cd infrastructure

# Initialize Terraform backend
terraform init -backend-config=backend-config/${ENVIRONMENT}.hcl

# Validate configuration
terraform validate

# Plan deployment
terraform plan -var-file=environments/${ENVIRONMENT}.tfvars -out=${ENVIRONMENT}.tfplan

# Apply infrastructure
terraform apply ${ENVIRONMENT}.tfplan
```

### Step 2: Verify Infrastructure

```bash
# Check VPC creation
aws ec2 describe-vpcs --filters "Name=tag:Name,Values=platform-${ENVIRONMENT}-vpc"

# Verify EKS cluster
aws eks describe-cluster --name ${CLUSTER_NAME}

# Check RDS instance
aws rds describe-db-instances --db-instance-identifier platform-postgres-${ENVIRONMENT}

# Verify ElastiCache cluster
aws elasticache describe-cache-clusters --cache-cluster-id platform-redis-${ENVIRONMENT}
```

### Step 3: Configure kubectl

```bash
# Update kubeconfig
aws eks update-kubeconfig --region ${AWS_REGION} --name ${CLUSTER_NAME}

# Verify cluster access
kubectl cluster-info

# Check node status
kubectl get nodes
```

## Phase 2: Platform Foundation

### Step 1: Deploy Core Platform Services

```bash
# Create namespaces
kubectl apply -f k8s/platform-foundation/namespaces.yaml

# Deploy RBAC policies
kubectl apply -f k8s/platform-foundation/rbac-policies.yaml

# Deploy cert-manager
kubectl apply -f k8s/gateway/cert-manager.yaml

# Wait for cert-manager to be ready
kubectl wait --for=condition=ready pod -l app=cert-manager -n cert-manager --timeout=300s
```

### Step 2: Deploy Gateway and Ingress

```bash
# Deploy AWS Load Balancer Controller
kubectl apply -f k8s/gateway/aws-load-balancer-controller.yaml

# Deploy Kong Gateway
kubectl apply -f k8s/gateway/kong-gateway.yaml

# Configure ingress
kubectl apply -f k8s/gateway/ingress.yaml

# Verify gateway deployment
kubectl get pods -n platform
kubectl get ingress -n platform
```

### Step 3: Deploy Secrets Management

```bash
# Deploy External Secrets Operator
kubectl apply -f k8s/secrets/external-secrets-operator.yaml

# Configure AWS Secret Store
kubectl apply -f k8s/secrets/aws-secret-store.yaml

# Deploy secret templates
kubectl apply -f k8s/secrets/external-secrets-templates.yaml

# Verify secrets creation
kubectl get secrets -n apps
kubectl get secrets -n workers
```

## Phase 3: Observability Stack

### Step 1: Deploy Monitoring

```bash
# Deploy Prometheus Operator
kubectl apply -f k8s/observability/prometheus-operator.yaml

# Deploy Prometheus
kubectl apply -f k8s/observability/prometheus.yaml

# Deploy Grafana
kubectl apply -f k8s/observability/grafana.yaml

# Verify monitoring stack
kubectl get pods -n observability
```

### Step 2: Deploy Logging

```bash
# Deploy Loki
kubectl apply -f k8s/observability/loki.yaml

# Deploy Fluent Bit
kubectl apply -f k8s/observability/fluent-bit.yaml

# Verify logging stack
kubectl get daemonset -n observability
kubectl logs -n observability -l app=fluent-bit
```

### Step 3: Configure Alerting

```bash
# Deploy AlertManager
kubectl apply -f k8s/observability/alertmanager.yaml

# Verify alerting configuration
kubectl get pods -n observability -l app=alertmanager
```

## Phase 4: Application Deployment

### Step 1: Build and Push Images

```bash
# Login to ECR
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}

# Build FastAPI image
docker build -f docker/fastapi.Dockerfile -t ${ECR_REGISTRY}/fastapi-app:${IMAGE_TAG} .
docker push ${ECR_REGISTRY}/fastapi-app:${IMAGE_TAG}

# Build Express image
docker build -f docker/express.Dockerfile -t ${ECR_REGISTRY}/express-app:${IMAGE_TAG} .
docker push ${ECR_REGISTRY}/express-app:${IMAGE_TAG}

# Build worker images
docker build -f docker/langchain-worker.Dockerfile -t ${ECR_REGISTRY}/langchain-worker:${IMAGE_TAG} .
docker push ${ECR_REGISTRY}/langchain-worker:${IMAGE_TAG}
```

### Step 2: Deploy Applications

```bash
# Deploy FastAPI application
envsubst < k8s/apps/fastapi-deployment.yaml | kubectl apply -f -

# Deploy Express application
envsubst < k8s/apps/express-deployment.yaml | kubectl apply -f -

# Deploy worker services
envsubst < k8s/apps/langchain-deployment.yaml | kubectl apply -f -

# Verify application deployment
kubectl get pods -n apps
kubectl get services -n apps
```

### Step 3: Configure Autoscaling

```bash
# Deploy HPA configurations
kubectl apply -f k8s/apps/fastapi-hpa.yaml
kubectl apply -f k8s/apps/express-hpa.yaml

# Verify autoscaling
kubectl get hpa -n apps
```

## Phase 5: Post-Deployment Verification

### Step 1: Health Checks

```bash
# Check application health
kubectl get pods -n apps
kubectl logs -n apps -l app=fastapi-app
kubectl logs -n apps -l app=express-app

# Test API endpoints
curl -k https://api.${DOMAIN}/health
curl -k https://api.${DOMAIN}/ready
```

### Step 2: Monitoring Verification

```bash
# Access Grafana dashboard
kubectl port-forward -n observability svc/grafana 3000:80

# Check Prometheus targets
kubectl port-forward -n observability svc/prometheus 9090:9090

# Verify log collection
kubectl logs -n observability -l app=fluent-bit
```

### Step 3: Security Verification

```bash
# Check network policies
kubectl get networkpolicies -A

# Verify RBAC
kubectl auth can-i --list --as=system:serviceaccount:apps:fastapi-sa

# Check secret management
kubectl get externalsecrets -A
```

## Rollback Procedures

### Application Rollback

```bash
# Rollback to previous deployment
kubectl rollout undo deployment/fastapi-app -n apps
kubectl rollout undo deployment/express-app -n apps

# Check rollback status
kubectl rollout status deployment/fastapi-app -n apps
kubectl rollout status deployment/express-app -n apps
```

### Infrastructure Rollback

```bash
# Rollback Terraform changes
cd infrastructure
terraform plan -destroy -var-file=environments/${ENVIRONMENT}.tfvars
terraform apply -destroy -var-file=environments/${ENVIRONMENT}.tfvars
```

## Environment-Specific Configurations

### Development Environment

- Single node group with spot instances
- Minimal resource allocation
- Debug logging enabled
- No SSL/TLS requirements

### Staging Environment

- Production-like configuration
- SSL/TLS enabled
- Performance testing enabled
- Canary deployment testing

### Production Environment

- Multi-AZ deployment
- High availability configuration
- SSL/TLS required
- Comprehensive monitoring
- Backup and disaster recovery enabled

## Troubleshooting Common Issues

### Pod Startup Issues

```bash
# Check pod status
kubectl describe pod <pod-name> -n <namespace>

# Check logs
kubectl logs <pod-name> -n <namespace> --previous

# Check events
kubectl get events -n <namespace> --sort-by='.lastTimestamp'
```

### Network Connectivity Issues

```bash
# Test DNS resolution
kubectl run -it --rm debug --image=busybox --restart=Never -- nslookup kubernetes.default

# Test service connectivity
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -- curl http://service-name.namespace.svc.cluster.local
```

### Storage Issues

```bash
# Check PVC status
kubectl get pvc -A

# Check storage class
kubectl get storageclass

# Check volume mounts
kubectl describe pod <pod-name> -n <namespace>
```

## Maintenance Windows

### Scheduled Maintenance

- **Development**: Anytime during business hours
- **Staging**: Weekends 02:00-06:00 UTC
- **Production**: Sundays 02:00-06:00 UTC

### Emergency Maintenance

- Follow incident response procedures
- Notify stakeholders immediately
- Document all changes made

## Contact Information

### On-Call Rotation

- **Primary**: DevOps Team Lead
- **Secondary**: Platform Engineer
- **Escalation**: Engineering Manager

### Emergency Contacts

- **PagerDuty**: +1-xxx-xxx-xxxx
- **Slack**: #platform-alerts
- **Email**: platform-team@company.com
