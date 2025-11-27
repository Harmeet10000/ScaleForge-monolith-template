#!/bin/bash

# Setup Terraform Backend Infrastructure
# This script creates the S3 bucket and DynamoDB table for Terraform state management

set -e

# Configuration
PROJECT_NAME="platform"
AWS_REGION="us-west-2"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to create backend resources for an environment
create_backend_resources() {
    local env=$1
    local bucket_name="${PROJECT_NAME}-terraform-state-${env}"
    local table_name="${PROJECT_NAME}-terraform-locks-${env}"

    print_status "Creating backend resources for environment: ${env}"

    # Create S3 bucket
    print_status "Creating S3 bucket: ${bucket_name}"
    if aws s3api head-bucket --bucket "${bucket_name}" 2>/dev/null; then
        print_warning "S3 bucket ${bucket_name} already exists"
    else
        aws s3api create-bucket \
            --bucket "${bucket_name}" \
            --region "${AWS_REGION}" \
            --create-bucket-configuration LocationConstraint="${AWS_REGION}"

        # Enable versioning
        aws s3api put-bucket-versioning \
            --bucket "${bucket_name}" \
            --versioning-configuration Status=Enabled

        # Enable server-side encryption
        aws s3api put-bucket-encryption \
            --bucket "${bucket_name}" \
            --server-side-encryption-configuration '{
                "Rules": [
                    {
                        "ApplyServerSideEncryptionByDefault": {
                            "SSEAlgorithm": "AES256"
                        }
                    }
                ]
            }'

        # Block public access
        aws s3api put-public-access-block \
            --bucket "${bucket_name}" \
            --public-access-block-configuration \
            BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

        print_status "S3 bucket ${bucket_name} created successfully"
    fi

    # Create DynamoDB table
    print_status "Creating DynamoDB table: ${table_name}"
    if aws dynamodb describe-table --table-name "${table_name}" 2>/dev/null; then
        print_warning "DynamoDB table ${table_name} already exists"
    else
        aws dynamodb create-table \
            --table-name "${table_name}" \
            --attribute-definitions AttributeName=LockID,AttributeType=S \
            --key-schema AttributeName=LockID,KeyType=HASH \
            --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
            --region "${AWS_REGION}"

        # Wait for table to be active
        print_status "Waiting for DynamoDB table to be active..."
        aws dynamodb wait table-exists --table-name "${table_name}" --region "${AWS_REGION}"

        print_status "DynamoDB table ${table_name} created successfully"
    fi

    print_status "Backend resources for ${env} environment created successfully"
    echo ""
}

# Main execution
print_status "Setting up Terraform backend infrastructure"
print_status "Project: ${PROJECT_NAME}"
print_status "Region: ${AWS_REGION}"
echo ""

# Check if AWS CLI is configured
if ! aws sts get-caller-identity >/dev/null 2>&1; then
    print_error "AWS CLI is not configured or credentials are invalid"
    exit 1
fi

# Create backend resources for each environment
for env in dev stage prod; do
    create_backend_resources "${env}"
done

print_status "All backend resources created successfully!"
print_status "You can now initialize Terraform with:"
echo ""
echo "  cd infrastructure"
echo "  terraform init -backend-config=backend-config/dev.hcl"
echo "  terraform plan -var-file=environments/dev.tfvars"
echo ""
