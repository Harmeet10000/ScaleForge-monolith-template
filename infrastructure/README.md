# Infrastructure as Code - Terraform Modules

This directory contains Terraform modules and configurations for deploying a production-grade, multi-service platform on AWS using Kubernetes (EKS).

## Architecture Overview

The infrastructure includes:

- **VPC**: Multi-AZ VPC with public/private subnets, NAT gateways, and security groups
- **EKS**: Managed Kubernetes cluster with multiple node groups and IRSA integration
- **RDS**: PostgreSQL database with Multi-AZ deployment and encryption
- **ElastiCache**: Redis cluster with encryption and backup capabilities
- **MSK**: Managed Kafka for event streaming
- **S3**: Document storage with lifecycle policies and encryption

## Directory Structure

```
infrastructure/
├── modules/                    # Reusable Terraform modules
│   ├── vpc/                   # VPC with subnets and security groups
│   ├── eks/                   # EKS cluster with node groups and IRSA
│   ├── rds/                   # PostgreSQL database
│   ├── elasticache/           # Redis cluster
│   ├── msk/                   # Kafka cluster
│   └── s3/                    # S3 buckets with lifecycle policies
├── environments/              # Environment-specific variable files
│   ├── dev.tfvars
│   ├── stage.tfvars
│   └── prod.tfvars
├── backend-config/            # Terraform backend configurations
│   ├── dev.hcl
│   ├── stage.hcl
│   └── prod.hcl
├── scripts/                   # Deployment and setup scripts
│   ├── setup-backend.sh       # Create S3 bucket and DynamoDB table
│   └── deploy.sh              # Terraform deployment script
├── main.tf                    # Main Terraform configuration
├── variables.tf               # Input variables
├── outputs.tf                 # Output values
└── README.md                  # This file
```

## Prerequisites

1. **AWS CLI** configured with appropriate credentials
2. **Terraform** >= 1.5 installed
3. **kubectl** for Kubernetes management (optional)
4. Appropriate AWS IAM permissions for creating resources

## Quick Start

### 1. Setup Backend Infrastructure

First, create the S3 bucket and DynamoDB table for Terraform state management:

```bash
cd infrastructure
./scripts/setup-backend.sh
```

This creates the following resources for each environment (dev, stage, prod):

- S3 bucket for Terraform state storage
- DynamoDB table for state locking
- Proper encryption and access controls

### 2. Initialize Terraform

```bash
# For development environment
./scripts/deploy.sh dev init

# For staging environment
./scripts/deploy.sh stage init

# For production environment
./scripts/deploy.sh prod init
```

### 3. Plan Deployment

```bash
# Review what will be created
./scripts/deploy.sh dev plan
```

### 4. Deploy Infrastructure

```bash
# Apply the changes
./scripts/deploy.sh dev apply
```

### 5. View Outputs

```bash
# See deployed resource information
./scripts/deploy.sh dev output
```

## Environment Configurations

### Development (dev)

- Smaller instance sizes for cost optimization
- Single AZ RDS (no Multi-AZ)
- Spot instances for EKS nodes
- Reduced backup retention periods

### Staging (stage)

- Production-like configuration
- Multi-AZ RDS
- Mixed instance types (On-Demand + Spot)
- Standard backup retention

### Production (prod)

- High availability configuration
- Multi-AZ for all services
- On-Demand instances for critical workloads
- Extended backup retention
- Additional node groups for specialized workloads

## Module Details

### VPC Module (`modules/vpc/`)

Creates a VPC with:

- Public subnets (3 AZs) for load balancers
- Private subnets (3 AZs) for applications and databases
- NAT gateways for outbound internet access
- Security groups for different service tiers
- Route tables and internet gateway

**Key Outputs:**

- `vpc_id`: VPC identifier
- `public_subnets`: Public subnet IDs
- `private_subnets`: Private subnet IDs
- Security group IDs for each service tier

### EKS Module (`modules/eks/`)

Creates an EKS cluster with:

- Managed node groups with autoscaling
- IRSA (IAM Roles for Service Accounts) configuration
- CloudWatch logging
- KMS encryption for secrets
- Service accounts for AWS integrations

**Key Outputs:**

- `cluster_endpoint`: Kubernetes API endpoint
- `cluster_certificate_authority_data`: CA certificate
- `oidc_provider_arn`: OIDC provider for IRSA
- IAM role ARNs for service accounts

### RDS Module (`modules/rds/`)

Creates a PostgreSQL database with:

- Multi-AZ deployment (configurable)
- Automated backups with point-in-time recovery
- Performance Insights
- CloudWatch monitoring and alarms
- KMS encryption at rest
- Secrets Manager integration

**Key Outputs:**

- `db_instance_endpoint`: Database connection endpoint
- `db_password_secret_arn`: Secret ARN for database password

### ElastiCache Module (`modules/elasticache/`)

Creates a Redis cluster with:

- Cluster mode support
- Encryption at rest and in transit
- Automated backups
- Auth token authentication
- CloudWatch monitoring

**Key Outputs:**

- `primary_endpoint_address`: Redis primary endpoint
- `configuration_endpoint_address`: Cluster configuration endpoint
- `auth_token_secret_arn`: Secret ARN for auth token

### MSK Module (`modules/msk/`)

Creates a Kafka cluster with:

- Multi-AZ broker deployment
- IAM authentication
- Encryption at rest and in transit
- CloudWatch logging
- Custom server properties

**Key Outputs:**

- `bootstrap_brokers_sasl_iam`: IAM-authenticated brokers
- `bootstrap_brokers_tls`: TLS-encrypted brokers

### S3 Module (`modules/s3/`)

Creates S3 buckets with:

- Documents bucket for application data
- Backups bucket for database backups
- Logs bucket for application logs
- Lifecycle policies for cost optimization
- KMS encryption
- Versioning enabled

## Security Features

- **Encryption**: All data encrypted at rest and in transit
- **Network Isolation**: Private subnets for all application components
- **IAM**: Least-privilege access with IRSA for Kubernetes workloads
- **Secrets Management**: AWS Secrets Manager for sensitive data
- **Security Groups**: Restrictive firewall rules between service tiers
- **KMS**: Customer-managed keys for encryption

## Cost Optimization

- **Spot Instances**: Used in development and mixed in staging
- **Lifecycle Policies**: Automatic transition to cheaper storage classes
- **Right-sizing**: Environment-specific instance sizes
- **Reserved Capacity**: Recommended for production workloads

## Monitoring and Observability

- **CloudWatch Logs**: EKS control plane and application logs
- **CloudWatch Metrics**: Infrastructure and application metrics
- **Performance Insights**: Database performance monitoring
- **CloudWatch Alarms**: Automated alerting for critical metrics

## Backup and Disaster Recovery

- **RDS Automated Backups**: Point-in-time recovery up to 30 days
- **S3 Versioning**: Object-level versioning for data protection
- **Cross-AZ Deployment**: High availability across availability zones
- **Snapshot Policies**: Regular snapshots for ElastiCache

## Troubleshooting

### Common Issues

1. **Backend Setup Fails**

   - Ensure AWS CLI is configured with proper credentials
   - Check IAM permissions for S3 and DynamoDB operations

2. **Terraform Init Fails**

   - Verify backend configuration files exist
   - Ensure S3 bucket and DynamoDB table were created

3. **Plan/Apply Fails**

   - Check AWS service limits and quotas
   - Verify IAM permissions for resource creation
   - Ensure unique resource names across regions

4. **EKS Node Groups Fail**
   - Check EC2 service limits
   - Verify subnet has available IP addresses
   - Ensure security groups allow required traffic

### Useful Commands

```bash
# Check Terraform state
terraform state list

# Import existing resources
terraform import aws_s3_bucket.example bucket-name

# Refresh state
terraform refresh -var-file=environments/dev.tfvars

# Target specific resources
terraform plan -target=module.vpc -var-file=environments/dev.tfvars

# Format Terraform files
terraform fmt -recursive

# Validate configuration
terraform validate
```

## Next Steps

After deploying the infrastructure:

1. **Configure kubectl** to connect to the EKS cluster
2. **Deploy Kubernetes platform services** (cert-manager, ingress controller, etc.)
3. **Set up GitOps** with ArgoCD or Flux
4. **Deploy application workloads**
5. **Configure monitoring and alerting**

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review Terraform and AWS documentation
3. Check AWS service health dashboard
4. Review CloudWatch logs for detailed error messages
