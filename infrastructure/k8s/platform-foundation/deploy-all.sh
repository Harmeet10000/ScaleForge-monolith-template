#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
K8S_DIR="$(dirname "${SCRIPT_DIR}")"

echo "🚀 Deploying Complete Kubernetes Platform Foundation..."
echo "=================================================="

# Set environment variables if not already set
export AWS_ACCOUNT_ID=${AWS_ACCOUNT_ID:-"123456789012"}
export AWS_REGION=${AWS_REGION:-"us-west-2"}
export EKS_CLUSTER_NAME=${EKS_CLUSTER_NAME:-"platform-production"}
export VPC_ID=${VPC_ID:-"vpc-xxxxxxxxx"}

echo "🔧 Environment Configuration:"
echo "   AWS Account ID: ${AWS_ACCOUNT_ID}"
echo "   AWS Region: ${AWS_REGION}"
echo "   EKS Cluster: ${EKS_CLUSTER_NAME}"
echo "   VPC ID: ${VPC_ID}"
echo ""

# Check if kubectl is configured
echo "🔍 Checking kubectl configuration..."
if ! kubectl cluster-info &> /dev/null; then
    echo "❌ kubectl is not configured or cluster is not accessible"
    echo "Please configure kubectl to connect to your EKS cluster:"
    echo "aws eks update-kubeconfig --region ${AWS_REGION} --name ${EKS_CLUSTER_NAME}"
    exit 1
fi

echo "✅ kubectl is configured and cluster is accessible"
echo ""

# Create all namespaces first
echo "📦 Creating all required namespaces..."
kubectl create namespace observability --dry-run=client -o yaml | kubectl apply -f -
kubectl create namespace infrastructure --dry-run=client -o yaml | kubectl apply -f -
kubectl create namespace platform --dry-run=client -o yaml | kubectl apply -f -
kubectl create namespace apps --dry-run=client -o yaml | kubectl apply -f -
kubectl create namespace workers --dry-run=client -o yaml | kubectl apply -f -
kubectl create namespace batch --dry-run=client -o yaml | kubectl apply -f -
kubectl create namespace cert-manager --dry-run=client -o yaml | kubectl apply -f -
kubectl create namespace external-secrets-system --dry-run=client -o yaml | kubectl apply -f -

echo "✅ All namespaces created"
echo ""

# Deploy observability stack
echo "📊 Deploying Observability Stack..."
echo "-----------------------------------"
cd ${K8S_DIR}/observability
./deploy.sh
echo ""

# Deploy secrets management
echo "🔐 Deploying Secrets Management..."
echo "----------------------------------"
cd ${K8S_DIR}/secrets
./deploy.sh
echo ""

# Deploy service mesh and gateway
echo "🌐 Deploying Service Mesh and Gateway..."
echo "---------------------------------------"
cd ${K8S_DIR}/gateway
./deploy.sh
echo ""

echo "🎉 Platform Foundation Deployment Complete!"
echo "==========================================="
echo ""
echo "📋 Deployment Summary:"
echo "   ✅ Observability Stack (Prometheus, Grafana, Loki, Fluent Bit, AlertManager)"
echo "   ✅ Secrets Management (External Secrets Operator, AWS Secrets Manager)"
echo "   ✅ Service Mesh & Gateway (Kong Gateway, cert-manager, AWS Load Balancer Controller)"
echo ""
echo "🔗 Access URLs (use kubectl port-forward):"
echo "   Grafana:    kubectl port-forward -n observability svc/grafana 3000:3000"
echo "   Prometheus: kubectl port-forward -n observability svc/prometheus 9090:9090"
echo "   Kong Admin: kubectl port-forward -n platform svc/kong-admin 8001:8001"
echo ""
echo "🔍 Health Check Commands:"
echo "   kubectl get pods --all-namespaces"
echo "   kubectl get ingress -n platform"
echo "   kubectl get certificates -n platform"
echo "   kubectl get externalsecrets -A"
echo ""
echo "📝 Next Steps:"
echo "1. Configure DNS records to point to the ALB created by ingress"
echo "2. Create secrets in AWS Secrets Manager (see secrets/deploy.sh output)"
echo "3. Deploy your applications to the 'apps' namespace"
echo "4. Deploy worker services to the 'workers' namespace"
echo "5. Configure monitoring dashboards in Grafana"
echo ""
echo "🚨 Important Notes:"
echo "- Update domain names in ingress.yaml from example.com to your actual domains"
echo "- Update email addresses in cert-issuers.yaml for Let's Encrypt"
echo "- Configure PagerDuty integration key in alertmanager.yaml"
echo "- Review and adjust resource limits based on your cluster capacity"
