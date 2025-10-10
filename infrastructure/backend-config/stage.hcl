# Terraform Backend Configuration for Staging Environment

bucket         = "platform-terraform-state-stage"
key            = "stage/terraform.tfstate"
region         = "us-west-2"
encrypt        = true
dynamodb_table = "platform-terraform-locks-stage"
