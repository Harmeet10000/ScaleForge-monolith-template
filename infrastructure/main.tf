# Main Terraform Configuration
# Multi-environment deployment infrastructure

terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.1"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }

  backend "s3" {
    # Backend configuration will be provided via backend config file
    # terraform init -backend-config=backend-config/dev.hcl
  }
}

# Configure the AWS Provider
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Environment = var.environment
      Project     = var.project_name
      ManagedBy   = "terraform"
    }
  }
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

# Local values
locals {
  availability_zones = slice(data.aws_availability_zones.available.names, 0, 3)

  # Network configuration
  vpc_cidr = var.vpc_cidr
  public_subnets = [
    cidrsubnet(local.vpc_cidr, 8, 1),
    cidrsubnet(local.vpc_cidr, 8, 2),
    cidrsubnet(local.vpc_cidr, 8, 3)
  ]
  private_subnets = [
    cidrsubnet(local.vpc_cidr, 8, 10),
    cidrsubnet(local.vpc_cidr, 8, 20),
    cidrsubnet(local.vpc_cidr, 8, 30)
  ]
}

# VPC Module
module "vpc" {
  source = "./modules/vpc"

  project_name       = var.project_name
  environment        = var.environment
  cidr_block         = local.vpc_cidr
  availability_zones = local.availability_zones
  public_subnets     = local.public_subnets
  private_subnets    = local.private_subnets
  enable_nat_gateway = var.enable_nat_gateway
}

# EKS Module
module "eks" {
  source = "./modules/eks"

  project_name                  = var.project_name
  environment                   = var.environment
  cluster_name                  = "${var.project_name}-${var.environment}"
  cluster_version               = var.eks_cluster_version
  subnet_ids                    = module.vpc.private_subnets
  additional_security_group_ids = [module.vpc.eks_cluster_security_group_id]
  cluster_log_retention_days    = var.cluster_log_retention_days
  node_groups                   = var.eks_node_groups

  depends_on = [module.vpc]
}

# RDS Module
module "rds" {
  source = "./modules/rds"

  project_name        = var.project_name
  environment         = var.environment
  identifier          = "${var.project_name}-${var.environment}-postgres"
  engine_version      = var.rds_engine_version
  instance_class      = var.rds_instance_class
  allocated_storage   = var.rds_allocated_storage
  subnet_ids          = module.vpc.private_subnets
  security_group_ids  = [module.vpc.rds_security_group_id]
  multi_az            = var.rds_multi_az
  deletion_protection = var.rds_deletion_protection

  depends_on = [module.vpc]
}

# ElastiCache Module
module "elasticache" {
  source = "./modules/elasticache"

  project_name         = var.project_name
  environment          = var.environment
  cluster_id           = "${var.project_name}-${var.environment}-redis"
  node_type            = var.elasticache_node_type
  subnet_ids           = module.vpc.private_subnets
  security_group_ids   = [module.vpc.elasticache_security_group_id]
  cluster_mode_enabled = var.elasticache_cluster_mode_enabled
  num_node_groups      = var.elasticache_num_node_groups

  depends_on = [module.vpc]
}

# MSK Module
module "msk" {
  source = "./modules/msk"

  project_name           = var.project_name
  environment            = var.environment
  cluster_name           = "${var.project_name}-${var.environment}-kafka"
  kafka_version          = var.msk_kafka_version
  number_of_broker_nodes = var.msk_number_of_broker_nodes
  instance_type          = var.msk_instance_type
  subnet_ids             = module.vpc.private_subnets
  security_group_ids     = [module.vpc.msk_security_group_id]

  depends_on = [module.vpc]
}

# S3 Module
module "s3" {
  source = "./modules/s3"

  project_name = var.project_name
  environment  = var.environment
}
