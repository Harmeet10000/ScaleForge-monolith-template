# Staging Environment Variables

project_name = "platform"
environment  = "stage"
aws_region   = "us-west-2"

# Network Configuration
vpc_cidr           = "10.1.0.0/16"
enable_nat_gateway = true

# EKS Configuration
eks_cluster_version        = "1.28"
cluster_log_retention_days = 7

eks_node_groups = {
  general = {
    capacity_type  = "SPOT"
    instance_types = ["m5.large", "m5.xlarge"]
    scaling_config = {
      desired_size = 2
      max_size     = 8
      min_size     = 1
    }
    labels = {
      "node-type" = "general"
    }
  }
  compute = {
    capacity_type  = "ON_DEMAND"
    instance_types = ["c5.xlarge", "c5.2xlarge"]
    scaling_config = {
      desired_size = 1
      max_size     = 4
      min_size     = 0
    }
    labels = {
      "node-type" = "compute"
    }
  }
}

# RDS Configuration
rds_engine_version      = "15.4"
rds_instance_class      = "db.r6g.large"
rds_allocated_storage   = 50
rds_multi_az            = true
rds_deletion_protection = true

# ElastiCache Configuration
elasticache_node_type            = "cache.r6g.large"
elasticache_cluster_mode_enabled = true
elasticache_num_node_groups      = 2

# MSK Configuration
msk_kafka_version          = "2.8.1"
msk_number_of_broker_nodes = 3
msk_instance_type          = "kafka.m5.large"
