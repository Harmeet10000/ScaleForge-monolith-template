#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ACCOUNT_ID=${AWS_ACCOUNT_ID:-"123456789012"}
REGION=${AWS_REGION:-"us-west-2"}
CLUSTER_NAME=${EKS_CLUSTER_NAME:-"platform-production"}

echo "🔐 Deploying External Secrets Operator..."

# Create IAM role for External Secrets Operator
echo "🏗️  Creating IAM role and policy..."
ROLE_NAME="external-secrets-role"
POLICY_NAME="external-secrets-policy"

# Create IAM policy
aws iam create-policy \
  --policy-name ${POLICY_NAME} \
  --policy-document file://${SCRIPT_DIR}/aws-iam-policy.json \
  --description "Policy for External Secrets Operator to access AWS Secrets Manager" \
  || echo "Policy ${POLICY_NAME} already exists"

# Create trust policy for IRSA
cat > /tmp/trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::${ACCOUNT_ID}:oidc-provider/oidc.eks.${REGION}.amazonaws.com/id/$(aws eks describe-cluster --name ${CLUSTER_NAME} --query 'cluster.identity.oidc.issuer' --output text | cut -d'/' -f5)"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "oidc.eks.${REGION}.amazonaws.com/id/$(aws eks describe-cluster --name ${CLUSTER_NAME} --query 'cluster.identity.oidc.issuer' --output text | cut -d'/' -f5):sub": "system:serviceaccount:external-secrets-system:external-secrets",
          "oidc.eks.${REGION}.amazonaws.com/id/$(aws eks describe-cluster --name ${CLUSTER_NAME} --query 'cluster.identity.oidc.issuer' --output text | cut -d'/' -f5):aud": "sts.amazonaws.com"
        }
      }
    }
  ]
}
EOF

# Create IAM role
aws iam create-role \
  --role-name ${ROLE_NAME} \
  --assume-role-policy-document file:///tmp/trust-policy.json \
  --description "Role for External Secrets Operator" \
  || echo "Role ${ROLE_NAME} already exists"

# Attach policy to role
aws iam attach-role-policy \
  --role-name ${ROLE_NAME} \
  --policy-arn arn:aws:iam::${ACCOUNT_ID}:policy/${POLICY_NAME}

# Update the external-secrets-operator.yaml with the correct role ARN
sed -i "s/ACCOUNT_ID/${ACCOUNT_ID}/g" ${SCRIPT_DIR}/external-secrets-operator.yaml

echo "📦 Deploying External Secrets Operator..."

# Deploy RBAC
kubectl apply -f ${SCRIPT_DIR}/rbac.yaml

# Deploy External Secrets Operator
kubectl apply -f ${SCRIPT_DIR}/external-secrets-operator.yaml

# Wait for External Secrets Operator to be ready
echo "⏳ Waiting for External Secrets Operator to be ready..."
kubectl wait --for=condition=available deployment/external-secrets -n external-secrets-system --timeout=300s
kubectl wait --for=condition=available deployment/external-secrets-webhook -n external-secrets-system --timeout=300s

# Create namespaces if they don't exist
kubectl create namespace apps --dry-run=client -o yaml | kubectl apply -f -
kubectl create namespace workers --dry-run=client -o yaml | kubectl apply -f -
kubectl create namespace platform --dry-run=client -o yaml | kubectl apply -f -

# Deploy AWS Secret Store
echo "🏪 Deploying AWS Secret Store..."
kubectl apply -f ${SCRIPT_DIR}/aws-secret-store.yaml

# Deploy External Secret templates
echo "📋 Deploying External Secret templates..."
kubectl apply -f ${SCRIPT_DIR}/external-secrets-templates.yaml

echo "✅ External Secrets Operator deployed successfully!"
echo ""
echo "🔍 Check deployment status:"
echo "   kubectl get pods -n external-secrets-system"
echo "   kubectl get secretstores -A"
echo "   kubectl get externalsecrets -A"
echo ""
echo "📝 Next steps:"
echo "1. Create secrets in AWS Secrets Manager with the following keys:"
echo "   - platform/database (username, password, host, port, database)"
echo "   - platform/redis (host, port, password)"
echo "   - platform/pinecone (api_key, environment, index_name)"
echo "   - platform/gemini (api_key)"
echo "   - platform/opensearch (username, password, host, port)"
echo "   - platform/jwt (access_token_secret, refresh_token_secret)"
echo "   - platform/tls (certificate, private_key)"
echo ""
echo "2. Verify secrets are synchronized:"
echo "   kubectl get secrets -n apps"
echo "   kubectl get secrets -n workers"
echo "   kubectl get secrets -n platform"

# Clean up temporary files
rm -f /tmp/trust-policy.json
