#!/bin/bash

set -e

NAMESPACE="observability"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🚀 Deploying Observability Stack..."

# Create namespaces
echo "📦 Creating namespaces..."
kubectl apply -f "${SCRIPT_DIR}/namespace.yaml"

# Wait for namespaces to be ready
kubectl wait --for=condition=Ready namespace/${NAMESPACE} --timeout=60s

# Deploy Prometheus Operator first
echo "🔧 Deploying Prometheus Operator..."
kubectl apply -f "${SCRIPT_DIR}/prometheus-operator.yaml"

# Wait for Prometheus Operator to be ready
echo "⏳ Waiting for Prometheus Operator to be ready..."
kubectl wait --for=condition=available deployment/prometheus-operator -n ${NAMESPACE} --timeout=300s

# Deploy Loki for log storage
echo "📊 Deploying Loki..."
kubectl apply -f "${SCRIPT_DIR}/loki.yaml"

# Wait for Loki to be ready
echo "⏳ Waiting for Loki to be ready..."
kubectl wait --for=condition=ready pod -l app=loki -n ${NAMESPACE} --timeout=300s

# Deploy AlertManager
echo "🚨 Deploying AlertManager..."
kubectl apply -f "${SCRIPT_DIR}/alertmanager.yaml"

# Deploy Prometheus
echo "📈 Deploying Prometheus..."
kubectl apply -f "${SCRIPT_DIR}/prometheus.yaml"

# Wait for Prometheus to be ready
echo "⏳ Waiting for Prometheus to be ready..."
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=prometheus -n ${NAMESPACE} --timeout=300s

# Deploy Grafana
echo "📊 Deploying Grafana..."
kubectl apply -f "${SCRIPT_DIR}/grafana.yaml"

# Wait for Grafana to be ready
echo "⏳ Waiting for Grafana to be ready..."
kubectl wait --for=condition=available deployment/grafana -n ${NAMESPACE} --timeout=300s

# Deploy Fluent Bit
echo "📝 Deploying Fluent Bit..."
kubectl apply -f "${SCRIPT_DIR}/fluent-bit.yaml"

# Wait for Fluent Bit DaemonSet to be ready
echo "⏳ Waiting for Fluent Bit to be ready..."
kubectl rollout status daemonset/fluent-bit -n ${NAMESPACE} --timeout=300s

echo "✅ Observability stack deployed successfully!"
echo ""
echo "🔗 Access URLs (use kubectl port-forward):"
echo "   Grafana:    kubectl port-forward -n ${NAMESPACE} svc/grafana 3000:3000"
echo "   Prometheus: kubectl port-forward -n ${NAMESPACE} svc/prometheus 9090:9090"
echo "   Loki:       kubectl port-forward -n ${NAMESPACE} svc/loki 3100:3100"
echo ""
echo "📋 Default Grafana credentials:"
echo "   Username: admin"
echo "   Password: admin123"
echo ""
echo "🔍 Check deployment status:"
echo "   kubectl get pods -n ${NAMESPACE}"
