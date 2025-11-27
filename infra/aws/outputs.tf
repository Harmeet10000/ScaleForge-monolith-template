# Terraform Outputs for Multi-Environment Deployment

# VPC Outputs
output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}

output "vpc_cidr_block" {
  description = "CIDR block of the VPC"
  value       = module.vpc.vpc_cidr_block
}

output "public_subnets" {
  description = "List of IDs of the public subnets"
  value       = module.vpc.public_subnets
}

output "private_subnets" {
  description = "List of IDs of the private subnets"
  value       = module.vpc.private_subnets
}

# EKS Outputs
output "cluster_id" {
  description = "EKS cluster ID"
  value       = module.eks.cluster_id
}

output "cluster_arn" {
  description = "EKS cluster ARN"
  value       = module.eks.cluster_arn
}

output "cluster_endpoint" {
  description = "Endpoint for EKS control plane"
  value       = module.eks.cluster_endpoint
}

output "cluster_security_group_id" {
  description = "Security group ID attached to the EKS cluster"
  value       = module.eks.cluster_security_group_id
}

output "cluster_certificate_authority_data" {
  description = "Base64 encoded certificate data required to communicate with the cluster"
  value       = module.eks.cluster_certificate_authority_data
  sensitive   = true
}

output "oidc_provider_arn" {
  description = "ARN of the OIDC Provider for IRSA"
  value       = module.eks.oidc_provider_arn
}

# RDS Outputs
output "db_instance_endpoint" {
  description = "RDS instance endpoint"
  value       = module.rds.db_instance_endpoint
}

output "db_instance_port" {
  description = "RDS instance port"
  value       = module.rds.db_instance_port
}

output "db_instance_name" {
  description = "RDS database name"
  value       = module.rds.db_instance_name
}

output "db_password_secret_arn" {
  description = "ARN of the secret containing the database password"
  value       = module.rds.db_password_secret_arn
}

# ElastiCache Outputs
output "redis_primary_endpoint" {
  description = "Redis primary endpoint"
  value       = module.elasticache.primary_endpoint_address
}

output "redis_configuration_endpoint" {
  description = "Redis configuration endpoint for cluster mode"
  value       = module.elasticache.configuration_endpoint_address
}

output "redis_port" {
  description = "Redis port"
  value       = module.elasticache.port
}

output "redis_auth_token_secret_arn" {
  description = "ARN of the secret containing the Redis auth token"
  value       = module.elasticache.auth_token_secret_arn
}

# MSK Outputs
output "msk_cluster_arn" {
  description = "MSK cluster ARN"
  value       = module.msk.cluster_arn
}

output "msk_bootstrap_brokers_tls" {
  description = "MSK bootstrap brokers for TLS connection"
  value       = module.msk.bootstrap_brokers_tls
}

output "msk_bootstrap_brokers_sasl_iam" {
  description = "MSK bootstrap brokers for SASL/IAM connection"
  value       = module.msk.bootstrap_brokers_sasl_iam
}

output "msk_zookeeper_connect_string" {
  description = "MSK Zookeeper connection string"
  value       = module.msk.zookeeper_connect_string
}

# S3 Outputs
output "documents_bucket_id" {
  description = "Documents S3 bucket name"
  value       = module.s3.documents_bucket_id
}

output "documents_bucket_arn" {
  description = "Documents S3 bucket ARN"
  value       = module.s3.documents_bucket_arn
}

output "backups_bucket_id" {
  description = "Backups S3 bucket name"
  value       = module.s3.backups_bucket_id
}

output "logs_bucket_id" {
  description = "Logs S3 bucket name"
  value       = module.s3.logs_bucket_id
}

# Security Group Outputs
output "alb_security_group_id" {
  description = "ALB security group ID"
  value       = module.vpc.alb_security_group_id
}

output "eks_nodes_security_group_id" {
  description = "EKS nodes security group ID"
  value       = module.vpc.eks_nodes_security_group_id
}

# IRSA Role ARNs
output "aws_load_balancer_controller_role_arn" {
  description = "AWS Load Balancer Controller IAM role ARN"
  value       = module.eks.aws_load_balancer_controller_role_arn
}

output "ebs_csi_driver_role_arn" {
  description = "EBS CSI Driver IAM role ARN"
  value       = module.eks.ebs_csi_driver_role_arn
}

output "external_secrets_role_arn" {
  description = "External Secrets Operator IAM role ARN"
  value       = module.eks.external_secrets_role_arn
}
