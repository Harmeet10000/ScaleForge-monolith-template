# Terraform Backend Configuration for Production Environment

bucket         = "platform-terraform-state-prod"
key            = "prod/terraform.tfstate"
region         = "us-west-2"
encrypt        = true
dynamodb_table = "platform-terraform-locks-prod"
