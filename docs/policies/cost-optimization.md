# Cost Optimization and Resource Management Policies

## Overview

This document outlines comprehensive cost optimization strategies and resource management policies for the platform infrastructure to ensure efficient resource utilization while maintaining performance and reliability.

## Cost Optimization Strategies

### 1. Compute Optimization

#### EC2 Instance Optimization

- **Spot Instances**: Use spot instances for non-critical workloads (development, testing, batch processing)
- **Reserved Instances**: Purchase 1-year or 3-year reserved instances for predictable workloads
- **Instance Right-sizing**: Regularly analyze and adjust instance types based on actual usage

```yaml
# EKS Node Group Configuration with Cost Optimization
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig
metadata:
  name: platform-prod
  region: us-west-2

nodeGroups:
  - name: general-spot
    instanceTypes: ['m5.large', 'm5.xlarge', 'm4.large', 'm4.xlarge']
    spot: true
    minSize: 2
    maxSize: 10
    desiredCapacity: 3
    volumeSize: 50
    volumeType: gp3

  - name: critical-ondemand
    instanceTypes: ['m5.large']
    spot: false
    minSize: 1
    maxSize: 5
    desiredCapacity: 2
    volumeSize: 50
    volumeType: gp3
```

#### Container Resource Optimization

```yaml
# Resource requests and limits optimization
apiVersion: apps/v1
kind: Deployment
metadata:
  name: fastapi-app
spec:
  template:
    spec:
      containers:
        - name: fastapi
          resources:
            requests:
              cpu: 100m # Start small
              memory: 256Mi # Start small
            limits:
              cpu: 500m # Allow bursting
              memory: 1Gi # Prevent OOM
```

### 2. Storage Optimization

#### S3 Storage Classes and Lifecycle Policies

```json
{
  "Rules": [
    {
      "ID": "DocumentLifecycle",
      "Status": "Enabled",
      "Filter": { "Prefix": "documents/" },
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
      ]
    },
    {
      "ID": "LogsLifecycle",
      "Status": "Enabled",
      "Filter": { "Prefix": "logs/" },
      "Transitions": [
        {
          "Days": 7,
          "StorageClass": "STANDARD_IA"
        },
        {
          "Days": 30,
          "StorageClass": "GLACIER"
        }
      ],
      "Expiration": {
        "Days": 90
      }
    },
    {
      "ID": "BackupsLifecycle",
      "Status": "Enabled",
      "Filter": { "Prefix": "backups/" },
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "GLACIER"
        },
        {
          "Days": 90,
          "StorageClass": "DEEP_ARCHIVE"
        }
      ],
      "Expiration": {
        "Days": 2555
      }
    }
  ]
}
```

#### EBS Volume Optimization

```hcl
# Terraform configuration for cost-optimized EBS volumes
resource "aws_ebs_volume" "app_data" {
  availability_zone = var.availability_zone
  size              = 100
  type              = "gp3"  # More cost-effective than gp2
  iops              = 3000   # Baseline performance
  throughput        = 125    # Baseline throughput
  encrypted         = true

  tags = {
    Name = "platform-app-data"
    CostCenter = "platform"
  }
}
```

### 3. Database Optimization

#### RDS Cost Optimization

```hcl
resource "aws_db_instance" "postgres" {
  identifier = "platform-postgres-${var.environment}"

  # Use burstable instances for non-production
  instance_class = var.environment == "prod" ? "db.r6g.large" : "db.t4g.medium"

  # Enable storage autoscaling
  allocated_storage     = 100
  max_allocated_storage = 1000
  storage_type          = "gp3"
  storage_encrypted     = true

  # Optimize backup retention
  backup_retention_period = var.environment == "prod" ? 30 : 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"

  # Enable performance insights for optimization
  performance_insights_enabled = true
  performance_insights_retention_period = 7

  tags = {
    Environment = var.environment
    CostCenter  = "platform"
  }
}
```

#### ElastiCache Optimization

```hcl
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id       = "platform-redis-${var.environment}"
  description                = "Redis cluster for platform"

  # Use smaller instances for non-production
  node_type = var.environment == "prod" ? "cache.r6g.large" : "cache.t4g.micro"

  # Optimize number of replicas
  num_cache_clusters = var.environment == "prod" ? 3 : 1

  # Enable automatic failover only for production
  automatic_failover_enabled = var.environment == "prod"
  multi_az_enabled          = var.environment == "prod"

  tags = {
    Environment = var.environment
    CostCenter  = "platform"
  }
}
```

### 4. Network Optimization

#### NAT Gateway Optimization

```hcl
# Use single NAT Gateway for non-production environments
resource "aws_nat_gateway" "main" {
  count = var.environment == "prod" ? length(var.public_subnets) : 1

  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = {
    Name = "platform-nat-${count.index + 1}"
    Environment = var.environment
  }
}
```

#### Load Balancer Optimization

```hcl
resource "aws_lb" "main" {
  name               = "platform-alb-${var.environment}"
  internal           = false
  load_balancer_type = "application"

  # Use fewer subnets for non-production
  subnets = var.environment == "prod" ? aws_subnet.public[*].id : [aws_subnet.public[0].id, aws_subnet.public[1].id]

  # Enable deletion protection only for production
  enable_deletion_protection = var.environment == "prod"

  tags = {
    Environment = var.environment
    CostCenter  = "platform"
  }
}
```

## Resource Management Policies

### 1. Kubernetes Resource Quotas

#### Namespace Resource Quotas

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: apps-quota
  namespace: apps
spec:
  hard:
    requests.cpu: '4'
    requests.memory: 8Gi
    limits.cpu: '8'
    limits.memory: 16Gi
    persistentvolumeclaims: '10'
    services: '10'
    secrets: '20'
    configmaps: '20'

---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: workers-quota
  namespace: workers
spec:
  hard:
    requests.cpu: '8'
    requests.memory: 16Gi
    limits.cpu: '16'
    limits.memory: 32Gi
    persistentvolumeclaims: '5'
```

#### Limit Ranges

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
  namespace: apps
spec:
  limits:
    - default:
        cpu: 500m
        memory: 1Gi
      defaultRequest:
        cpu: 100m
        memory: 256Mi
      type: Container
    - max:
        cpu: 2000m
        memory: 4Gi
      min:
        cpu: 50m
        memory: 128Mi
      type: Container
```

### 2. Horizontal Pod Autoscaler (HPA) Policies

#### Cost-Optimized HPA Configuration

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: fastapi-hpa
  namespace: apps
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: fastapi-app
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 50
          periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
        - type: Percent
          value: 100
          periodSeconds: 60
```

### 3. Vertical Pod Autoscaler (VPA) Policies

#### VPA for Resource Optimization

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: fastapi-vpa
  namespace: apps
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: fastapi-app
  updatePolicy:
    updateMode: 'Auto'
  resourcePolicy:
    containerPolicies:
      - containerName: fastapi
        maxAllowed:
          cpu: 2000m
          memory: 4Gi
        minAllowed:
          cpu: 100m
          memory: 256Mi
        controlledResources: ['cpu', 'memory']
```

### 4. Cluster Autoscaler Policies

#### Node Group Scaling Configuration

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-autoscaler-status
  namespace: kube-system
data:
  nodes.max: '20'
  nodes.min: '2'
  scale-down-delay-after-add: '10m'
  scale-down-unneeded-time: '10m'
  scale-down-utilization-threshold: '0.5'
  skip-nodes-with-local-storage: 'false'
  skip-nodes-with-system-pods: 'false'
```

## Cost Monitoring and Alerting

### 1. AWS Cost and Usage Reports

#### Cost Allocation Tags

```hcl
# Terraform configuration for consistent tagging
locals {
  common_tags = {
    Environment = var.environment
    Project     = "platform"
    CostCenter  = "engineering"
    Owner       = "platform-team"
    ManagedBy   = "terraform"
  }
}

resource "aws_instance" "example" {
  # ... other configuration

  tags = merge(local.common_tags, {
    Name = "platform-worker-${var.environment}"
    Component = "compute"
  })
}
```

#### Cost Budget Alerts

```hcl
resource "aws_budgets_budget" "platform_monthly" {
  name         = "platform-monthly-budget"
  budget_type  = "COST"
  limit_amount = "1000"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  cost_filters = {
    Tag = {
      "Project" = ["platform"]
    }
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                 = 80
    threshold_type            = "PERCENTAGE"
    notification_type         = "ACTUAL"
    subscriber_email_addresses = ["platform-team@company.com"]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                 = 100
    threshold_type            = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = ["platform-team@company.com"]
  }
}
```

### 2. Kubernetes Cost Monitoring

#### Prometheus Metrics for Cost Tracking

```yaml
apiVersion: v1
kind: ServiceMonitor
metadata:
  name: kube-state-metrics-cost
  namespace: infrastructure
spec:
  selector:
    matchLabels:
      app: kube-state-metrics
  endpoints:
    - port: http-metrics
      interval: 30s
      path: /metrics
      relabelings:
        - sourceLabels: [__name__]
          regex: 'kube_pod_container_resource_requests|kube_pod_container_resource_limits|kube_node_status_allocatable'
          action: keep
```

#### Grafana Dashboard for Cost Visualization

```json
{
  "dashboard": {
    "title": "Platform Cost Dashboard",
    "panels": [
      {
        "title": "Monthly Cost Trend",
        "type": "graph",
        "targets": [
          {
            "expr": "aws_billing_estimated_charges{currency=\"USD\",service_name=\"AmazonEC2\"}",
            "legendFormat": "EC2 Costs"
          },
          {
            "expr": "aws_billing_estimated_charges{currency=\"USD\",service_name=\"AmazonRDS\"}",
            "legendFormat": "RDS Costs"
          }
        ]
      },
      {
        "title": "Resource Utilization vs Requests",
        "type": "graph",
        "targets": [
          {
            "expr": "sum(rate(container_cpu_usage_seconds_total[5m])) by (namespace) / sum(kube_pod_container_resource_requests{resource=\"cpu\"}) by (namespace) * 100",
            "legendFormat": "CPU Utilization %"
          }
        ]
      }
    ]
  }
}
```

## Automated Cost Optimization Scripts

### 1. Resource Cleanup Script

```bash
#!/bin/bash
# automated-cleanup.sh - Automated resource cleanup for cost optimization

# Clean up unused EBS volumes
aws ec2 describe-volumes --filters Name=status,Values=available --query 'Volumes[?CreateTime<=`2023-01-01`].[VolumeId]' --output text | while read volume_id; do
    echo "Deleting unused volume: $volume_id"
    aws ec2 delete-volume --volume-id $volume_id
done

# Clean up old AMIs
aws ec2 describe-images --owners self --query 'Images[?CreationDate<=`2023-01-01`].[ImageId]' --output text | while read ami_id; do
    echo "Deregistering old AMI: $ami_id"
    aws ec2 deregister-image --image-id $ami_id
done

# Clean up old snapshots
aws ec2 describe-snapshots --owner-ids self --query 'Snapshots[?StartTime<=`2023-01-01`].[SnapshotId]' --output text | while read snapshot_id; do
    echo "Deleting old snapshot: $snapshot_id"
    aws ec2 delete-snapshot --snapshot-id $snapshot_id
done

# Clean up unused security groups
aws ec2 describe-security-groups --query 'SecurityGroups[?GroupName!=`default`].[GroupId,GroupName]' --output text | while read group_id group_name; do
    if ! aws ec2 describe-network-interfaces --filters Name=group-id,Values=$group_id --query 'NetworkInterfaces[0]' --output text | grep -q "None"; then
        echo "Security group $group_name ($group_id) is in use"
    else
        echo "Deleting unused security group: $group_name ($group_id)"
        aws ec2 delete-security-group --group-id $group_id
    fi
done
```

### 2. Right-sizing Recommendations Script

```bash
#!/bin/bash
# rightsizing-recommendations.sh - Generate right-sizing recommendations

# Get CPU and memory utilization for all pods
kubectl top pods --all-namespaces --containers | while read namespace pod container cpu memory; do
    if [[ $cpu =~ ^[0-9]+m$ ]]; then
        cpu_value=${cpu%m}

        # Get resource requests
        requests=$(kubectl get pod $pod -n $namespace -o jsonpath='{.spec.containers[?(@.name=="'$container'")].resources.requests}')

        if [[ $cpu_value -lt 50 ]]; then
            echo "RECOMMENDATION: Pod $namespace/$pod container $container is underutilized (CPU: $cpu)"
            echo "  Current requests: $requests"
            echo "  Suggested: Reduce CPU request to ${cpu_value}m"
        fi
    fi
done
```

### 3. Spot Instance Optimization

```yaml
# Spot Instance Interrupt Handler
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: spot-interrupt-handler
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: spot-interrupt-handler
  template:
    metadata:
      labels:
        app: spot-interrupt-handler
    spec:
      containers:
        - name: spot-interrupt-handler
          image: amazon/aws-node-termination-handler:v1.19.0
          env:
            - name: NODE_NAME
              valueFrom:
                fieldRef:
                  fieldPath: spec.nodeName
            - name: POD_NAME
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
            - name: NAMESPACE
              valueFrom:
                fieldRef:
                  fieldPath: metadata.namespace
            - name: SPOT_POD_IP
              valueFrom:
                fieldRef:
                  fieldPath: status.podIP
          securityContext:
            privileged: true
          volumeMounts:
            - name: uptime
              mountPath: /proc/uptime
              readOnly: true
      volumes:
        - name: uptime
          hostPath:
            path: /proc/uptime
      hostNetwork: true
      serviceAccountName: spot-interrupt-handler
```

## Cost Optimization Checklist

### Daily Tasks

- [ ] Review resource utilization dashboards
- [ ] Check for failed or stuck pods consuming resources
- [ ] Monitor spot instance interruptions
- [ ] Review cost alerts and anomalies

### Weekly Tasks

- [ ] Analyze VPA recommendations
- [ ] Review HPA scaling patterns
- [ ] Check for unused resources (volumes, snapshots, AMIs)
- [ ] Validate resource quotas and limits

### Monthly Tasks

- [ ] Review AWS Cost and Usage Reports
- [ ] Analyze Reserved Instance utilization
- [ ] Update instance types based on usage patterns
- [ ] Review and optimize storage lifecycle policies
- [ ] Conduct cost optimization workshop with team

### Quarterly Tasks

- [ ] Review and update cost budgets
- [ ] Evaluate new AWS services for cost optimization
- [ ] Conduct comprehensive infrastructure cost review
- [ ] Update cost optimization policies and procedures

## Cost Optimization Metrics and KPIs

### Key Performance Indicators

1. **Cost per Transaction**: Total infrastructure cost / Number of API requests
2. **Resource Utilization**: Average CPU/Memory utilization across all nodes
3. **Cost Efficiency**: (Actual usage / Provisioned capacity) \* 100
4. **Waste Reduction**: Amount saved through optimization initiatives

### Target Metrics

- CPU Utilization: 60-80%
- Memory Utilization: 70-85%
- Cost Growth Rate: < 10% month-over-month
- Resource Waste: < 15% of total provisioned capacity

This comprehensive cost optimization policy ensures efficient resource utilization while maintaining system performance and reliability.
