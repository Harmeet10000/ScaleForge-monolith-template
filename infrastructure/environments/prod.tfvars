# Production Environment Variables

project_name = "platform"
environment  = "prod"
aws_region   = "us-west-2"

# Network Configuration
vpc_cidr           = "10.2.0.0/16"
enable_nat_gateway = true

# EKS Configuration
eks_cluster_version        = "1.28"
cluster_log_retention_days = 30

eks_node_groups = {
  general = {
    capacity_type  = "ON_DEMAND"
    instance_types = ["m5.large", "m5.xlarge"]
    scaling_config = {
      desired_size = 3
      max_size     = 15
      min_size     = 3
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
      max_size     = 10
      min_size     = 1
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
  memory = {
    capacity_type  = "ON_DEMAND"
    instance_types = ["r5.2xlarge", "r5.4xlarge"]
    scaling_config = {
      desired_size = 1
      max_size     = 5
      min_size     = 0
    }
    labels = {
      "node-type" = "memory"
    }
    taints = [
      {
        key    = "memory-optimized"
        value  = "true"
        effect = "NO_SCHEDULE"
      }
    ]
  }
}

# RDS Configuration
rds_engine_version      = "15.4"
rds_instance_class      = "db.r6g.2xlarge"
rds_allocated_storage   = 200
rds_multi_az            = true
rds_deletion_protection = true

# ElastiCache Configuration
elasticache_node_type            = "cache.r6g.2xlarge"
elasticache_cluster_mode_enabled = true
elasticache_num_node_groups      = 3

# MSK Configuration
msk_kafka_version          = "2.8.1"
msk_number_of_broker_nodes = 6
msk_instance_type          = "kafka.m5.2xlarge"
