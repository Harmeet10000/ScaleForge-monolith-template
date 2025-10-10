#!/bin/bash

# Terraform Deployment Script
# Usage: ./deploy.sh <environment> <action>
# Example: ./deploy.sh dev plan
# Example: ./deploy.sh prod apply

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(dirname "${SCRIPT_DIR}")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

print_header() {
    echo -e "${BLUE}[DEPLOY]${NC} $1"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 <environment> <action>"
    echo ""
    echo "Environments:"
    echo "  dev     - Development environment"
    echo "  stage   - Staging environment"
    echo "  prod    - Production environment"
    echo ""
    echo "Actions:"
    echo "  init    - Initialize Terraform"
    echo "  plan    - Create execution plan"
    echo "  apply   - Apply changes"
    echo "  destroy - Destroy infrastructure (use with caution)"
    echo "  output  - Show outputs"
    echo ""
    echo "Examples:"
    echo "  $0 dev init"
    echo "  $0 dev plan"
    echo "  $0 dev apply"
    echo "  $0 prod plan"
    echo ""
}

# Validate inputs
if [ $# -ne 2 ]; then
    print_error "Invalid number of arguments"
    show_usage
    exit 1
fi

ENVIRONMENT=$1
ACTION=$2

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|stage|prod)$ ]]; then
    print_error "Invalid environment: $ENVIRONMENT"
    show_usage
    exit 1
fi

# Validate action
if [[ ! "$ACTION" =~ ^(init|plan|apply|destroy|output)$ ]]; then
    print_error "Invalid action: $ACTION"
    show_usage
    exit 1
fi

# Check if required files exist
BACKEND_CONFIG="${INFRA_DIR}/backend-config/${ENVIRONMENT}.hcl"
VAR_FILE="${INFRA_DIR}/environments/${ENVIRONMENT}.tfvars"

if [ ! -f "$BACKEND_CONFIG" ]; then
    print_error "Backend config file not found: $BACKEND_CONFIG"
    exit 1
fi

if [ ! -f "$VAR_FILE" ]; then
    print_error "Variables file not found: $VAR_FILE"
    exit 1
fi

# Change to infrastructure directory
cd "$INFRA_DIR"

print_header "Terraform Deployment"
print_status "Environment: $ENVIRONMENT"
print_status "Action: $ACTION"
print_status "Working directory: $(pwd)"
echo ""

# Execute the requested action
case $ACTION in
    init)
        print_status "Initializing Terraform..."
        terraform init -backend-config="$BACKEND_CONFIG"
        ;;

    plan)
        print_status "Creating execution plan..."
        terraform plan -var-file="$VAR_FILE" -out="${ENVIRONMENT}.tfplan"
        print_status "Plan saved to ${ENVIRONMENT}.tfplan"
        ;;

    apply)
        # Check if plan file exists
        if [ -f "${ENVIRONMENT}.tfplan" ]; then
            print_status "Applying from existing plan file..."
            terraform apply "${ENVIRONMENT}.tfplan"
            rm -f "${ENVIRONMENT}.tfplan"
        else
            print_warning "No plan file found, creating and applying plan..."
            terraform apply -var-file="$VAR_FILE"
        fi
        ;;

    destroy)
        print_warning "This will DESTROY all infrastructure in the $ENVIRONMENT environment!"
        read -p "Are you sure you want to continue? (type 'yes' to confirm): " confirm
        if [ "$confirm" = "yes" ]; then
            terraform destroy -var-file="$VAR_FILE"
        else
            print_status "Destroy cancelled"
            exit 0
        fi
        ;;

    output)
        print_status "Showing outputs..."
        terraform output
        ;;
esac

print_status "Action completed successfully!"
echo ""

# Show next steps based on action
case $ACTION in
    init)
        print_status "Next steps:"
        echo "  1. Run: $0 $ENVIRONMENT plan"
        echo "  2. Review the plan output"
        echo "  3. Run: $0 $ENVIRONMENT apply"
        ;;

    plan)
        print_status "Next steps:"
        echo "  1. Review the plan output above"
        echo "  2. Run: $0 $ENVIRONMENT apply"
        ;;

    apply)
        print_status "Infrastructure deployed successfully!"
        echo "  Run: $0 $ENVIRONMENT output (to see resource details)"
        ;;
esac
