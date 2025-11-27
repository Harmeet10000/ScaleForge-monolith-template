# Terraform Backend Configuration for Development Environment

bucket         = "platform-terraform-state-dev"
key            = "dev/terraform.tfstate"
region         = "us-west-2"
encrypt        = true
dynamodb_table = "platform-terraform-locks-dev"

# Optional: Enable versioning and lifecycle policies on the S3 bucket
# These should be configured separately via AWS CLI or console
