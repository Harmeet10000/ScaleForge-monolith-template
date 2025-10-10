# EKS Module Variables

variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, stage, prod)"
  type        = string
}

variable "cluster_name" {
  description = "Name of the EKS cluster"
  type        = string
}

variable "cluster_version" {
  description = "Kubernetes version for the EKS cluster"
  type        = string
  default     = "1.28"
}

variable "subnet_ids" {
  description = "List of subnet IDs for the EKS cluster"
  type        = list(string)
}

variable "endpoint_private_access" {
  description = "Enable private API server endpoint"
  type        = bool
  default     = true
}

variable "endpoint_public_access" {
  description = "Enable public API server endpoint"
  type        = bool
  default     = true
}

variable "public_access_cidrs" {
  description = "List of CIDR blocks that can access the public endpoint"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "additional_security_group_ids" {
  description = "Additional security group IDs to attach to the cluster"
  type        = list(string)
  default     = []
}

variable "cluster_log_types" {
  description = "List of control plane logging types to enable"
  type        = list(string)
  default     = ["api", "audit", "authenticator", "controllerManager", "scheduler"]
}

variable "cluster_log_retention_days" {
  description = "Number of days to retain cluster logs"
  type        = number
  default     = 7
}

variable "node_groups" {
  description = "Map of EKS node group configurations"
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
  default = {}
}
