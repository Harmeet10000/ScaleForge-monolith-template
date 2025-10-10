# Development Environment Variables

project_name = "platform"
environment  = "dev"
aws_region   = "us-west-2"

# Network Configuration
vpc_cidr           = "10.0.0.0/16"
enable_nat_gateway = true

# EKS Configuration
eks_cluster_version        = "1.28"
cluster_log_retention_days = 3

eks_node_groups = {
  general = {
    capacity_type  = "SPOT"
    instance_types = ["t3.medium", "t3.large"]
    scaling_config = {
      desired_size = 2
      max_size     = 5
      min_size     = 1
    }
    labels = {
      "node-type" = "general"
    }
  }
}

# RDS Configuration (smaller for dev)
rds_engine_version      = "15.4"
rds_instance_class      = "db.t3.micro"
rds_allocated_storage   = 20
rds_multi_az            = false
rds_deletion_protection = false

# ElastiCache Configuration (smaller for dev)
elasticache_node_type            = "cache.t3.micro"
elasticache_cluster_mode_enabled = false
elasticache_num_node_groups      = 1

# MSK Configuration (smaller for dev)
msk_kafka_version          = "2.8.1"
msk_number_of_broker_nodes = 3
msk_instance_type          = "kafka.t3.small"
