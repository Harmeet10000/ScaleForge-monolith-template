#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ACCOUNT_ID=${AWS_ACCOUNT_ID:-"123456789012"}
REGION=${AWS_REGION:-"us-west-2"}
CLUSTER_NAME=${EKS_CLUSTER_NAME:-"platform-production"}
VPC_ID=${VPC_ID:-"vpc-xxxxxxxxx"}

echo "🌐 Deploying Service Mesh and Gateway..."

# Update placeholders in configuration files
echo "🔧 Updating configuration with environment values..."
sed -i "s/ACCOUNT_ID/${ACCOUNT_ID}/g" ${SCRIPT_DIR}/cert-manager.yaml
sed -i "s/ACCOUNT_ID/${ACCOUNT_ID}/g" ${SCRIPT_DIR}/aws-load-balancer-controller.yaml
sed -i "s/ACCOUNT_ID/${ACCOUNT_ID}/g" ${SCRIPT_DIR}/ingress.yaml
sed -i "s/vpc-xxxxxxxxx/${VPC_ID}/g" ${SCRIPT_DIR}/aws-load-balancer-controller.yaml

# Create namespaces
echo "📦 Creating namespaces..."
kubectl apply -f ${SCRIPT_DIR}/namespace.yaml

# Deploy cert-manager first
echo "🔐 Deploying cert-manager..."
kubectl apply -f ${SCRIPT_DIR}/cert-manager-rbac.yaml
kubectl apply -f ${SCRIPT_DIR}/cert-manager.yaml

# Wait for cert-manager to be ready
echo "⏳ Waiting for cert-manager to be ready..."
kubectl wait --for=condition=available deployment/cert-manager -n cert-manager --timeout=300s
kubectl wait --for=condition=available deployment/cert-manager-webhook -n cert-manager --timeout=300s

# Deploy certificate issuers
echo "📜 Deploying certificate issuers..."
kubectl apply -f ${SCRIPT_DIR}/cert-issuers.yaml

# Deploy AWS Load Balancer Controller
echo "⚖️  Deploying AWS Load Balancer Controller..."
kubectl apply -f ${SCRIPT_DIR}/aws-load-balancer-controller.yaml

# Wait for AWS Load Balancer Controller to be ready
echo "⏳ Waiting for AWS Load Balancer Controller to be ready..."
kubectl wait --for=condition=available deployment/aws-load-balancer-controller -n kube-system --timeout=300s

# Deploy Kong Gateway
echo "🦍 Deploying Kong Gateway..."
kubectl apply -f ${SCRIPT_DIR}/kong-gateway.yaml

# Wait for Kong Gateway to be ready
echo "⏳ Waiting for Kong Gateway to be ready..."
kubectl wait --for=condition=available deployment/kong-gateway -n platform --timeout=300s

# Deploy ingress configurations
echo "🚪 Deploying ingress configurations..."
kubectl apply -f ${SCRIPT_DIR}/ingress.yaml

# Deploy network policies
echo "🔒 Deploying network policies..."
kubectl apply -f ${SCRIPT_DIR}/network-policies.yaml

echo "✅ Service Mesh and Gateway deployed successfully!"
echo ""
echo "🔗 Service URLs:"
echo "   API Gateway:  https://api.example.com"
echo "   Chat Gateway: https://chat.example.com"
echo ""
echo "🔍 Check deployment status:"
echo "   kubectl get pods -n platform"
echo "   kubectl get pods -n cert-manager"
echo "   kubectl get pods -n kube-system -l app.kubernetes.io/name=aws-load-balancer-controller"
echo ""
echo "📋 Check ingress status:"
echo "   kubectl get ingress -n platform"
echo "   kubectl describe ingress api-ingress -n platform"
echo "   kubectl describe ingress chat-ingress -n platform"
echo ""
echo "🔐 Check certificates:"
echo "   kubectl get certificates -n platform"
echo "   kubectl describe certificate api-tls-certificate -n platform"
echo ""
echo "📊 Kong Gateway Admin API (port-forward):"
echo "   kubectl port-forward -n platform svc/kong-admin 8001:8001"
echo "   curl http://localhost:8001/status"
echo ""
echo "📈 Kong Metrics (for Prometheus):"
echo "   kubectl port-forward -n platform svc/kong-metrics 9542:9542"
echo "   curl http://localhost:9542/metrics"
