# ElastiCache Module Variables

variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, stage, prod)"
  type        = string
}

variable "cluster_id" {
  description = "Group identifier for the ElastiCache replication group"
  type        = string
}

variable "node_type" {
  description = "The compute and memory capacity of the nodes"
  type        = string
  default     = "cache.r6g.large"
}

variable "engine_version" {
  description = "Version number of the cache engine"
  type        = string
  default     = "7.0"
}

variable "redis_version" {
  description = "Redis version for parameter group family"
  type        = string
  default     = "7.x"
}

variable "subnet_ids" {
  description = "List of VPC subnet IDs for the cache subnet group"
  type        = list(string)
}

variable "security_group_ids" {
  description = "List of security group IDs to associate"
  type        = list(string)
}

variable "cluster_mode_enabled" {
  description = "Enable Redis cluster mode"
  type        = bool
  default     = true
}

variable "num_cache_nodes" {
  description = "Number of cache nodes (used when cluster mode is disabled)"
  type        = number
  default     = 3
}

variable "num_node_groups" {
  description = "Number of node groups (shards) for this Redis replication group"
  type        = number
  default     = 2
}

variable "replicas_per_node_group" {
  description = "Number of replica nodes in each node group"
  type        = number
  default     = 1
}

variable "auth_token_enabled" {
  description = "Enable auth token for Redis"
  type        = bool
  default     = true
}

variable "snapshot_retention_limit" {
  description = "Number of days for which ElastiCache retains automatic cache cluster snapshots"
  type        = number
  default     = 5
}

variable "snapshot_window" {
  description = "Daily time range for ElastiCache to begin taking a daily snapshot"
  type        = string
  default     = "03:00-05:00"
}

variable "maintenance_window" {
  description = "Weekly time range for system maintenance"
  type        = string
  default     = "sun:05:00-sun:09:00"
}

variable "auto_minor_version_upgrade" {
  description = "Specifies whether minor version engine upgrades will be applied automatically"
  type        = bool
  default     = true
}

variable "notification_topic_arn" {
  description = "ARN of an Amazon SNS topic to send ElastiCache notifications"
  type        = string
  default     = null
}

variable "parameters" {
  description = "List of ElastiCache parameters to apply"
  type = list(object({
    name  = string
    value = string
  }))
  default = [
    {
      name  = "maxmemory-policy"
      value = "allkeys-lru"
    }
  ]
}

variable "log_delivery_configuration" {
  description = "Specifies the destination and format of Redis SLOWLOG or Redis Engine Log"
  type = list(object({
    destination      = string
    destination_type = string
    log_format       = string
    log_type         = string
  }))
  default = []
}
