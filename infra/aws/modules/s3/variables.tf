# S3 Module Variables

variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, stage, prod)"
  type        = string
}

variable "backup_retention_days" {
  description = "Number of days to retain backup files"
  type        = number
  default     = 2555 # 7 years
}

variable "log_retention_days" {
  description = "Number of days to retain log files"
  type        = number
  default     = 365 # 1 year
}
