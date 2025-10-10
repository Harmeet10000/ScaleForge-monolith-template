# MSK Module Variables

variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, stage, prod)"
  type        = string
}

variable "cluster_name" {
  description = "Name of the MSK cluster"
  type        = string
}

variable "kafka_version" {
  description = "Specify the desired Kafka software version"
  type        = string
  default     = "2.8.1"
}

variable "number_of_broker_nodes" {
  description = "The desired total number of broker nodes in the kafka cluster"
  type        = number
  default     = 3
}

variable "instance_type" {
  description = "Specify the instance type to use for the kafka brokers"
  type        = string
  default     = "kafka.m5.large"
}

variable "ebs_volume_size" {
  description = "The size in GiB of the EBS volume for the data drive on each broker node"
  type        = number
  default     = 100
}

variable "subnet_ids" {
  description = "A list of subnets to connect to in client VPC"
  type        = list(string)
}

variable "security_group_ids" {
  description = "A list of the security groups to associate with the elastic network interfaces"
  type        = list(string)
}

variable "client_broker_encryption" {
  description = "Encryption setting for data in transit between clients and brokers"
  type        = string
  default     = "TLS"
  validation {
    condition     = contains(["PLAINTEXT", "TLS", "TLS_PLAINTEXT"], var.client_broker_encryption)
    error_message = "Valid values are PLAINTEXT, TLS, or TLS_PLAINTEXT."
  }
}

variable "client_authentication" {
  description = "Configuration block for specifying a client authentication"
  type = object({
    sasl_enabled               = optional(bool, false)
    scram_enabled              = optional(bool, false)
    iam_enabled                = optional(bool, true)
    tls_enabled                = optional(bool, false)
    certificate_authority_arns = optional(list(string), [])
    unauthenticated_enabled    = optional(bool, false)
  })
  default = {
    sasl_enabled               = false
    scram_enabled              = false
    iam_enabled                = true
    tls_enabled                = false
    certificate_authority_arns = []
    unauthenticated_enabled    = false
  }
}

variable "server_properties" {
  description = "Contents of the server.properties file for Kafka brokers"
  type        = string
  default     = <<-EOT
    auto.create.topics.enable=true
    default.replication.factor=3
    min.insync.replicas=2
    num.io.threads=8
    num.network.threads=5
    num.partitions=1
    num.replica.fetchers=2
    replica.lag.time.max.ms=30000
    socket.receive.buffer.bytes=102400
    socket.request.max.bytes=104857600
    socket.send.buffer.bytes=102400
    unclean.leader.election.enable=true
    zookeeper.session.timeout.ms=18000
  EOT
}

variable "log_retention_days" {
  description = "Number of days to retain MSK logs in CloudWatch"
  type        = number
  default     = 7
}

variable "cloudwatch_logs_enabled" {
  description = "Indicates whether you want to enable or disable streaming broker logs to Cloudwatch Logs"
  type        = bool
  default     = true
}

variable "firehose_logs_enabled" {
  description = "Indicates whether you want to enable or disable streaming broker logs to Kinesis Data Firehose"
  type        = bool
  default     = false
}

variable "firehose_delivery_stream" {
  description = "Name of the Kinesis Data Firehose delivery stream"
  type        = string
  default     = null
}

variable "s3_logs_enabled" {
  description = "Indicates whether you want to enable or disable streaming broker logs to S3"
  type        = bool
  default     = false
}

variable "s3_logs_bucket" {
  description = "Name of the S3 bucket to deliver logs to"
  type        = string
  default     = null
}

variable "s3_logs_prefix" {
  description = "Prefix to append to the folder name"
  type        = string
  default     = null
}
