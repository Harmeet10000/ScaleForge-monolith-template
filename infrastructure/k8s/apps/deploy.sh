#!/bin/bash

# Deploy Applications to Kubernetes
# This script deploys FastAPI and Express applications to the apps namespace

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="apps"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

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

# Function to check if kubectl is available
check_kubectl() {
    if ! command -v kubectl &> /dev/null; then
        print_error "kubectl is not installed or not in PATH"
        exit 1
    fi
}

# Function to check if namespace exists
check_namespace() {
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        print_warning "Namespace $NAMESPACE does not exist. Creating it..."
        kubectl apply -f "$SCRIPT_DIR/namespace.yaml"
    else
        print_status "Namespace $NAMESPACE already exists"
    fi
}

# Function to validate environment variables
validate_env() {
    local required_vars=(
        "ECR_REGISTRY"
        "IMAGE_TAG"
        "AWS_ACCOUNT_ID"
    )

    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            print_error "Required environment variable $var is not set"
            exit 1
        fi
    done
}

# Function to substitute environment variables in YAML files
substitute_vars() {
    local file="$1"
    local temp_file=$(mktemp)

    envsubst < "$file" > "$temp_file"
    echo "$temp_file"
}

# Function to deploy application
deploy_app() {
    local app_name="$1"
    local deployment_file="$2"

    print_status "Deploying $app_name..."

    # Substitute environment variables
    local processed_file
    processed_file=$(substitute_vars "$deployment_file")

    # Apply the deployment
    if kubectl apply -f "$processed_file"; then
        print_status "$app_name deployment applied successfully"
    else
        print_error "Failed to deploy $app_name"
        rm -f "$processed_file"
        exit 1
    fi

    # Clean up temporary file
    rm -f "$processed_file"

    # Wait for deployment to be ready
    print_status "Waiting for $app_name deployment to be ready..."
    if kubectl rollout status deployment/"$app_name" -n "$NAMESPACE" --timeout=300s; then
        print_status "$app_name is ready"
    else
        print_error "$app_name deployment failed to become ready"
        exit 1
    fi
}

# Function to verify deployment
verify_deployment() {
    local app_name="$1"

    print_status "Verifying $app_name deployment..."

    # Check if pods are running
    local running_pods
    running_pods=$(kubectl get pods -n "$NAMESPACE" -l app="$app_name" --field-selector=status.phase=Running --no-headers | wc -l)

    if [[ "$running_pods" -gt 0 ]]; then
        print_status "$app_name has $running_pods running pods"
    else
        print_error "$app_name has no running pods"
        return 1
    fi

    # Check service endpoints
    local service_name="${app_name//-app/}-service"
    if kubectl get endpoints "$service_name" -n "$NAMESPACE" &> /dev/null; then
        local endpoints
        endpoints=$(kubectl get endpoints "$service_name" -n "$NAMESPACE" -o jsonpath='{.subsets[*].addresses[*].ip}' | wc -w)
        if [[ "$endpoints" -gt 0 ]]; then
            print_status "$service_name has $endpoints endpoints"
        else
            print_warning "$service_name has no endpoints"
        fi
    else
        print_error "Service $service_name not found"
        return 1
    fi
}

# Main deployment function
main() {
    print_status "Starting application deployment..."

    # Validate prerequisites
    check_kubectl
    validate_env
    check_namespace

    # Deploy applications
    deploy_app "fastapi-app" "$SCRIPT_DIR/fastapi-deployment.yaml"
    deploy_app "express-app" "$SCRIPT_DIR/express-deployment.yaml"

    # Verify deployments
    print_status "Verifying deployments..."
    verify_deployment "fastapi-app"
    verify_deployment "express-app"

    # Show deployment status
    print_status "Deployment Summary:"
    kubectl get deployments,services,hpa,pdb -n "$NAMESPACE"

    print_status "Application deployment completed successfully!"
}

# Help function
show_help() {
    cat << EOF
Usage: $0 [OPTIONS]

Deploy FastAPI and Express applications to Kubernetes

OPTIONS:
    -h, --help      Show this help message
    -n, --namespace Set the target namespace (default: apps)
    -v, --verify    Only verify existing deployments

ENVIRONMENT VARIABLES:
    ECR_REGISTRY    ECR registry URL (required)
    IMAGE_TAG       Docker image tag (required)
    AWS_ACCOUNT_ID  AWS account ID (required)

EXAMPLES:
    # Deploy applications
    ECR_REGISTRY=123456789.dkr.ecr.us-west-2.amazonaws.com \\
    IMAGE_TAG=v1.0.0 \\
    AWS_ACCOUNT_ID=123456789 \\
    $0

    # Verify existing deployments
    $0 --verify

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -n|--namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        -v|--verify)
            print_status "Verifying existing deployments..."
            verify_deployment "fastapi-app"
            verify_deployment "express-app"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Run main function
main
