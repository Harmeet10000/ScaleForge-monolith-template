# 🚀 Deployment & Infrastructure Optimization Guide

## 🏗️ Production Architecture Recommendations

### Current vs Recommended Architecture

1. Implement a OpenFGA (Open Federated Gateway Architecture) to enhance scalability,    reliability, and security of your authentication service. with permissions
2. make a branch for drizzle + JS for AI features and Postgres extensions
3. add ELK stack for logging and monitoring
4. properly implement RabbitMQ for message queuing for modularity and decoupling
5. add recommendation system using convex or something else
6. add prometheus, loki and grafana for monitoring and alerting
7. lastly make a fastify version
8. make a Golang version of the same
9. check if I can deploy it on AWS Lambda or Google Cloud Functions for serverless architecture
10. make a fucking awesome documentation for the same in Postman or Swagger
11. add tests in CI before deploying to production
12. also add a search engine like Algolia or Elasticsearch/Postgres Extensions for better search capabilities
13. check performance/stress testing
14. add SAGA pattern for managing complex workflows and state transitions
15. make AI-driven features for enhanced user experience and personalization using Gemini API

**Current Architecture:**
```
[Client] → [Single Auth Service] → [MongoDB + Redis]
```

**Recommended Production Architecture:**
```
[CDN/WAF] → [Load Balancer] → [Multiple Auth Services] → [Database Cluster]
    ↓              ↓                    ↓                      ↓
[Cloudflare]   [Nginx/HAProxy]    [Docker Swarm/K8s]    [MongoDB Replica Set]
                                                              [Redis Cluster]
```

## 🐳 Container Orchestration

### 1. Docker Swarm Configuration

**Create: `docker-swarm.yml`**
```yaml
version: '3.8'

services:
  auth-service:
    image: your-registry/auth-service:latest
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
        failure_action: rollback
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'
    environment:
      - NODE_ENV=production
    secrets:
      - jwt_access_secret
      - jwt_refresh_secret
      - database_url
    networks:
      - auth_network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/v1/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    deploy:
      replicas: 2
      placement:
        constraints:
          - node.role == manager
    configs:
      - source: nginx_config
        target: /etc/nginx/conf.d/default.conf
    networks:
      - auth_network
    depends_on:
      - auth-service

  mongodb:
    image: mongo:7.0
    deploy:
      replicas: 1
      placement:
        constraints:
          - node.labels.database == true
      resources:
        limits:
          memory: 2G
          cpus: '1'
    environment:
      MONGO_INITDB_ROOT_USERNAME_FILE: /run/secrets/mongo_root_user
      MONGO_INITDB_ROOT_PASSWORD_FILE: /run/secrets/mongo_root_password
    secrets:
      - mongo_root_user
      - mongo_root_password
    volumes:
      - mongo_data:/data/db
    networks:
      - auth_network

  redis:
    image: redis:7.2-alpine
    deploy:
      replicas: 1
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    networks:
      - auth_network

networks:
  auth_network:
    driver: overlay
    attachable: true

volumes:
  mongo_data:
  redis_data:

secrets:
  jwt_access_secret:
    external: true
  jwt_refresh_secret:
    external: true
  database_url:
    external: true
  mongo_root_user:
    external: true
  mongo_root_password:
    external: true

configs:
  nginx_config:
    file: ./nginx/production.conf
```

### 2. Kubernetes Configuration

**Create: `k8s/namespace.yaml`**
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: auth-service
  labels:
    name: auth-service
```

**Create: `k8s/configmap.yaml`**
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: auth-config
  namespace: auth-service
data:
  NODE_ENV: "production"
  PORT: "8000"
  DB_POOL_SIZE: "10"
  ACCESS_TOKEN_EXPIRY: "3600"
  REFRESH_TOKEN_EXPIRY: "604800"
```

**Create: `k8s/secrets.yaml`**
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: auth-secrets
  namespace: auth-service
type: Opaque
data:
  # Base64 encoded values
  DATABASE_URL: <base64-encoded-database-url>
  JWT_ACCESS_SECRET: <base64-encoded-jwt-secret>
  JWT_REFRESH_SECRET: <base64-encoded-jwt-refresh-secret>
  REDIS_PASSWORD: <base64-encoded-redis-password>
```

**Create: `k8s/deployment.yaml`**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-service
  namespace: auth-service
  labels:
    app: auth-service
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: auth-service
  template:
    metadata:
      labels:
        app: auth-service
    spec:
      containers:
      - name: auth-service
        image: your-registry/auth-service:latest
        ports:
        - containerPort: 8000
        env:
        - name: NODE_ENV
          valueFrom:
            configMapKeyRef:
              name: auth-config
              key: NODE_ENV
        - name: PORT
          valueFrom:
            configMapKeyRef:
              name: auth-config
              key: PORT
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: auth-secrets
              key: DATABASE_URL
        - name: JWT_ACCESS_SECRET
          valueFrom:
            secretKeyRef:
              name: auth-secrets
              key: JWT_ACCESS_SECRET
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/v1/health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /api/v1/health
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
        securityContext:
          runAsNonRoot: true
          runAsUser: 1000
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
```

**Create: `k8s/service.yaml`**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: auth-service
  namespace: auth-service
  labels:
    app: auth-service
spec:
  selector:
    app: auth-service
  ports:
  - port: 80
    targetPort: 8000
    protocol: TCP
  type: ClusterIP
```

**Create: `k8s/ingress.yaml`**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: auth-ingress
  namespace: auth-service
  annotations:
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/use-regex: "true"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
  - hosts:
    - api.yourdomain.com
    secretName: auth-tls
  rules:
  - host: api.yourdomain.com
    http:
      paths:
      - path: /api/v1/auth
        pathType: Prefix
        backend:
          service:
            name: auth-service
            port:
              number: 80
```

**Create: `k8s/hpa.yaml`**
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: auth-service-hpa
  namespace: auth-service
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: auth-service
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
```

## 📊 Monitoring & Observability

### 3. Prometheus Configuration

**Create: `monitoring/prometheus.yml`**
```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  - job_name: 'auth-service'
    static_configs:
      - targets: ['auth-service:8000']
    metrics_path: '/metrics'
    scrape_interval: 10s

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

  - job_name: 'mongodb-exporter'
    static_configs:
      - targets: ['mongodb-exporter:9216']

  - job_name: 'redis-exporter'
    static_configs:
      - targets: ['redis-exporter:9121']
```

**Create: `monitoring/alert_rules.yml`**
```yaml
groups:
- name: auth-service-alerts
  rules:
  - alert: HighErrorRate
    expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "High error rate detected"
      description: "Error rate is {{ $value }} errors per second"

  - alert: HighResponseTime
    expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 0.5
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High response time detected"
      description: "95th percentile response time is {{ $value }} seconds"

  - alert: DatabaseConnectionFailure
    expr: up{job="mongodb-exporter"} == 0
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "Database connection failure"
      description: "MongoDB is not responding"

  - alert: RedisConnectionFailure
    expr: up{job="redis-exporter"} == 0
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "Redis connection failure"
      description: "Redis is not responding"

  - alert: HighMemoryUsage
    expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes > 0.9
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High memory usage"
      description: "Memory usage is {{ $value | humanizePercentage }}"

  - alert: HighCPUUsage
    expr: 100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High CPU usage"
      description: "CPU usage is {{ $value }}%"
```

### 4. Grafana Dashboard Configuration

**Create: `monitoring/grafana-dashboard.json`**
```json
{
  "dashboard": {
    "id": null,
    "title": "Auth Service Dashboard",
    "tags": ["auth", "nodejs"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{method}} {{route}}"
          }
        ],
        "yAxes": [
          {
            "label": "Requests/sec"
          }
        ]
      },
      {
        "id": 2,
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          },
          {
            "expr": "histogram_quantile(0.50, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "50th percentile"
          }
        ],
        "yAxes": [
          {
            "label": "Seconds"
          }
        ]
      },
      {
        "id": 3,
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"4..|5..\"}[5m])",
            "legendFormat": "{{status}}"
          }
        ],
        "yAxes": [
          {
            "label": "Errors/sec"
          }
        ]
      },
      {
        "id": 4,
        "title": "Memory Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "process_resident_memory_bytes",
            "legendFormat": "RSS Memory"
          },
          {
            "expr": "nodejs_heap_size_used_bytes",
            "legendFormat": "Heap Used"
          }
        ],
        "yAxes": [
          {
            "label": "Bytes"
          }
        ]
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "refresh": "5s"
  }
}
```

## 🔧 CI/CD Pipeline

### 5. GitHub Actions Workflow

**Create: `.github/workflows/deploy.yml`**
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '22'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run linting
      run: npm run lint
    
    - name: Run tests
      run: npm test
    
    - name: Run security audit
      run: npm audit --audit-level high

  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
    - uses: actions/checkout@v4
    
    - name: Log in to Container Registry
      uses: docker/login-action@v3
      with:
        registry: ${{ env.REGISTRY }}
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}
    
    - name: Extract metadata
      id: meta
      uses: docker/metadata-action@v5
      with:
        images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
        tags: |
          type=ref,event=branch
          type=sha,prefix={{branch}}-
          type=raw,value=latest,enable={{is_default_branch}}
    
    - name: Build and push Docker image
      uses: docker/build-push-action@v5
      with:
        context: .
        file: ./docker/prod.Dockerfile
        push: true
        tags: ${{ steps.meta.outputs.tags }}
        labels: ${{ steps.meta.outputs.labels }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
    - uses: actions/checkout@v4
    
    - name: Deploy to Kubernetes
      run: |
        echo "${{ secrets.KUBECONFIG }}" | base64 -d > kubeconfig
        export KUBECONFIG=kubeconfig
        
        # Update image in deployment
        kubectl set image deployment/auth-service \
          auth-service=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }} \
          -n auth-service
        
        # Wait for rollout to complete
        kubectl rollout status deployment/auth-service -n auth-service --timeout=300s
        
        # Verify deployment
        kubectl get pods -n auth-service
```

### 6. Deployment Scripts

**Create: `scripts/deploy.sh`**
```bash
#!/bin/bash

set -e

# Configuration
ENVIRONMENT=${1:-production}
IMAGE_TAG=${2:-latest}
NAMESPACE="auth-service"

echo "🚀 Deploying Auth Service to $ENVIRONMENT"
echo "📦 Image tag: $IMAGE_TAG"

# Validate environment
if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
    echo "❌ Invalid environment. Use 'staging' or 'production'"
    exit 1
fi

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl is not installed"
    exit 1
fi

# Apply Kubernetes configurations
echo "📋 Applying Kubernetes configurations..."
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml

# Update deployment with new image
echo "🔄 Updating deployment..."
kubectl set image deployment/auth-service \
    auth-service=your-registry/auth-service:$IMAGE_TAG \
    -n $NAMESPACE

# Wait for rollout
echo "⏳ Waiting for rollout to complete..."
kubectl rollout status deployment/auth-service -n $NAMESPACE --timeout=300s

# Verify deployment
echo "✅ Verifying deployment..."
kubectl get pods -n $NAMESPACE
kubectl get services -n $NAMESPACE

# Run health check
echo "🏥 Running health check..."
HEALTH_URL=$(kubectl get ingress auth-ingress -n $NAMESPACE -o jsonpath='{.spec.rules[0].host}')
if curl -f "https://$HEALTH_URL/api/v1/health" > /dev/null 2>&1; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed"
    exit 1
fi

echo "🎉 Deployment completed successfully!"
```

**Create: `scripts/rollback.sh`**
```bash
#!/bin/bash

set -e

NAMESPACE="auth-service"
REVISION=${1:-}

echo "🔄 Rolling back Auth Service deployment..."

if [[ -n "$REVISION" ]]; then
    echo "📋 Rolling back to revision $REVISION"
    kubectl rollout undo deployment/auth-service --to-revision=$REVISION -n $NAMESPACE
else
    echo "📋 Rolling back to previous revision"
    kubectl rollout undo deployment/auth-service -n $NAMESPACE
fi

# Wait for rollback
echo "⏳ Waiting for rollback to complete..."
kubectl rollout status deployment/auth-service -n $NAMESPACE --timeout=300s

# Verify rollback
echo "✅ Verifying rollback..."
kubectl get pods -n $NAMESPACE

echo "🎉 Rollback completed successfully!"
```

## 📈 Performance Optimization Checklist

### Infrastructure Level
- [ ] **Load Balancer**: Nginx/HAProxy with proper upstream configuration
- [ ] **Container Orchestration**: Docker Swarm or Kubernetes with auto-scaling
- [ ] **Database Optimization**: MongoDB replica set with read preferences
- [ ] **Caching Strategy**: Redis cluster with proper eviction policies
- [ ] **CDN Integration**: Cloudflare or AWS CloudFront for static assets

### Application Level
- [ ] **Connection Pooling**: Optimized database and Redis connections
- [ ] **Response Caching**: Redis-based caching for frequently accessed data
- [ ] **Compression**: Gzip compression for API responses
- [ ] **Rate Limiting**: Redis-backed rate limiting with different tiers
- [ ] **Security Headers**: Comprehensive security headers with Helmet.js

### Monitoring & Observability
- [ ] **Metrics Collection**: Prometheus metrics for all key performance indicators
- [ ] **Log Aggregation**: Centralized logging with structured JSON logs
- [ ] **Alerting**: Proactive alerts for critical issues
- [ ] **Dashboards**: Grafana dashboards for real-time monitoring
- [ ] **Health Checks**: Comprehensive health checks for all dependencies

### Security & Compliance
- [ ] **Secrets Management**: External secrets management (not in environment files)
- [ ] **Network Security**: Proper network segmentation and firewall rules
- [ ] **SSL/TLS**: End-to-end encryption with proper certificate management
- [ ] **Security Scanning**: Regular vulnerability scans and dependency audits
- [ ] **Access Control**: RBAC and principle of least privilege

This deployment optimization guide provides a complete production-ready setup for your authentication service with proper scaling, monitoring, and security measures in place.

**Next Steps:**
1. Choose your orchestration platform (Docker Swarm or Kubernetes)
2. Set up monitoring infrastructure (Prometheus + Grafana)
3. Implement CI/CD pipeline
4. Configure secrets management
5. Set up alerting and incident response procedures

Would you like me to help you implement any specific part of this deployment strategy?
