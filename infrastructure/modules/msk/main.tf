# MSK (Managed Streaming for Apache Kafka) Module

locals {
  common_tags = {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "terraform"
  }
}

# KMS Key for MSK encryption
resource "aws_kms_key" "msk" {
  description             = "MSK encryption key for ${var.project_name}-${var.environment}"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-msk-key"
  })
}

resource "aws_kms_alias" "msk" {
  name          = "alias/${var.project_name}-${var.environment}-msk"
  target_key_id = aws_kms_key.msk.key_id
}

# CloudWatch Log Group for MSK
resource "aws_cloudwatch_log_group" "msk" {
  name              = "/aws/msk/${var.cluster_name}"
  retention_in_days = var.log_retention_days

  tags = local.common_tags
}

# MSK Configuration
resource "aws_msk_configuration" "main" {
  kafka_versions = [var.kafka_version]
  name           = "${var.project_name}-${var.environment}-msk-config"

  server_properties = var.server_properties

  lifecycle {
    create_before_destroy = true
  }
}

# MSK Cluster
resource "aws_msk_cluster" "main" {
  cluster_name           = var.cluster_name
  kafka_version          = var.kafka_version
  number_of_broker_nodes = var.number_of_broker_nodes

  broker_node_group_info {
    instance_type   = var.instance_type
    client_subnets  = var.subnet_ids
    security_groups = var.security_group_ids

    storage_info {
      ebs_storage_info {
        volume_size = var.ebs_volume_size
      }
    }
  }

  configuration_info {
    arn      = aws_msk_configuration.main.arn
    revision = aws_msk_configuration.main.latest_revision
  }

  encryption_info {
    encryption_at_rest_kms_key_id = aws_kms_key.msk.key_id

    encryption_in_transit {
      client_broker = var.client_broker_encryption
      in_cluster    = true
    }
  }

  client_authentication {
    dynamic "sasl" {
      for_each = var.client_authentication.sasl_enabled ? [1] : []
      content {
        scram = var.client_authentication.scram_enabled
        iam   = var.client_authentication.iam_enabled
      }
    }

    dynamic "tls" {
      for_each = var.client_authentication.tls_enabled ? [1] : []
      content {
        certificate_authority_arns = var.client_authentication.certificate_authority_arns
      }
    }

    unauthenticated = var.client_authentication.unauthenticated_enabled
  }

  logging_info {
    broker_logs {
      cloudwatch_logs {
        enabled   = var.cloudwatch_logs_enabled
        log_group = aws_cloudwatch_log_group.msk.name
      }

      firehose {
        enabled         = var.firehose_logs_enabled
        delivery_stream = var.firehose_delivery_stream
      }

      s3 {
        enabled = var.s3_logs_enabled
        bucket  = var.s3_logs_bucket
        prefix  = var.s3_logs_prefix
      }
    }
  }

  tags = merge(local.common_tags, {
    Name = var.cluster_name
  })

  depends_on = [
    aws_msk_configuration.main,
    aws_cloudwatch_log_group.msk
  ]
}
