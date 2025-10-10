# Terraform Variables for Multi-Environment Deployment

# General Configuration
variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "platform"
}

variable "environment" {
  description = "Environment name (dev, stage, prod)"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-west-2"
}

# Network Configuration
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "enable_nat_gateway" {
  description = "Enable NAT Gateway for private subnets"
  type        = bool
  default     = true
}

# EKS Configuration
variable "eks_cluster_version" {
  description = "Kubernetes version for the EKS cluster"
  type        = string
  default     = "1.28"
}

variable "cluster_log_retention_days" {
  description = "Number of days to retain cluster logs"
  type        = number
  default     = 7
}

variable "eks_node_groups" {
  description = "EKS node group configurations"
  type = map(object({
    capacity_type              = string
    instance_types             = list(string)
    ami_type                   = optional(string, "AL2_x86_64")
    disk_size                  = optional(number, 50)
    max_unavailable_percentage = optional(number, 25)
    scaling_config = object({
      desired_size = number
      max_size     = number
      min_size     = number
    })
    launch_template = optional(object({
      id      = string
      version = string
    }))
    taints = optional(list(object({
      key    = string
      value  = string
      effect = string
    })))
    labels = optional(map(string), {})
  }))
  default = {
    general = {
      capacity_type  = "SPOT"
      instance_types = ["m5.large", "m5.xlarge", "m5a.large", "m5a.xlarge"]
      scaling_config = {
        desired_size = 3
        max_size     = 10
        min_size     = 1
      }
      labels = {
        "node-type" = "general"
      }
    }
    compute = {
      capacity_type  = "ON_DEMAND"
      instance_types = ["c5.2xlarge", "c5.4xlarge"]
      scaling_config = {
        desired_size = 2
        max_size     = 8
        min_size     = 0
      }
      labels = {
        "node-type" = "compute"
      }
      taints = [
        {
          key    = "compute-optimized"
          value  = "true"
          effect = "NO_SCHEDULE"
        }
      ]
    }
  }
}

# RDS Configuration
variable "rds_engine_version" {
  description = "PostgreSQL engine version"
  type        = string
  default     = "15.4"
}

variable "rds_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.r6g.large"
}

variable "rds_allocated_storage" {
  description = "RDS allocated storage in GB"
  type        = number
  default     = 100
}

variable "rds_multi_az" {
  description = "Enable Multi-AZ deployment for RDS"
  type        = bool
  default     = true
}

variable "rds_deletion_protection" {
  description = "Enable deletion protection for RDS"
  type        = bool
  default     = true
}

# ElastiCache Configuration
variable "elasticache_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.r6g.large"
}

variable "elasticache_cluster_mode_enabled" {
  description = "Enable Redis cluster mode"
  type        = bool
  default     = true
}

variable "elasticache_num_node_groups" {
  description = "Number of node groups (shards) for Redis cluster"
  type        = number
  default     = 2
}

# MSK Configuration
variable "msk_kafka_version" {
  description = "Kafka version for MSK"
  type        = string
  default     = "2.8.1"
}

variable "msk_number_of_broker_nodes" {
  description = "Number of broker nodes for MSK"
  type        = number
  default     = 3
}

variable "msk_instance_type" {
  description = "MSK broker instance type"
  type        = string
  default     = "kafka.m5.large"
}
