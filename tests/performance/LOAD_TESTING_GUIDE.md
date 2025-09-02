# 🚀 Load Testing & Performance Optimization Guide

## 📊 Load Testing Setup

### 1. K6 Load Testing Scripts

**Create: `tests/load/auth-load-test.js`**

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const loginTrend = new Trend('login_duration');
const registerTrend = new Trend('register_duration');

export const options = {
  stages: [
    { duration: '2m', target: 10 }, // Ramp up to 10 users
    { duration: '5m', target: 10 }, // Stay at 10 users
    { duration: '2m', target: 50 }, // Ramp up to 50 users
    { duration: '5m', target: 50 }, // Stay at 50 users
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '5m', target: 0 } // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
    http_req_failed: ['rate<0.1'], // Error rate must be below 10%
    errors: ['rate<0.1']
  }
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';

export function setup() {
  // Setup code - create test users, etc.
  console.log('Setting up load test...');
  return { baseUrl: BASE_URL };
}

export default function (data) {
  const testUser = {
    email: `test${Math.random().toString(36).substring(7)}@example.com`,
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'User'
  };

  // Test user registration
  const registerResponse = http.post(
    `${data.baseUrl}/api/v1/auth/register`,
    JSON.stringify(testUser),
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: '30s'
    }
  );

  const registerSuccess = check(registerResponse, {
    'register status is 201': (r) => r.status === 201,
    'register response time < 1000ms': (r) => r.timings.duration < 1000
  });

  registerTrend.add(registerResponse.timings.duration);
  errorRate.add(!registerSuccess);

  sleep(1);

  // Test user login
  const loginResponse = http.post(
    `${data.baseUrl}/api/v1/auth/login`,
    JSON.stringify({
      email: testUser.email,
      password: testUser.password
    }),
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: '30s'
    }
  );

  const loginSuccess = check(loginResponse, {
    'login status is 200': (r) => r.status === 200,
    'login response time < 500ms': (r) => r.timings.duration < 500,
    'login returns token': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data && body.data.accessToken;
      } catch (e) {
        return false;
      }
    }
  });

  loginTrend.add(loginResponse.timings.duration);
  errorRate.add(!loginSuccess);

  if (loginSuccess) {
    const token = JSON.parse(loginResponse.body).data.accessToken;

    // Test protected endpoint
    const profileResponse = http.get(`${data.baseUrl}/api/v1/auth/profile`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: '30s'
    });

    check(profileResponse, {
      'profile status is 200': (r) => r.status === 200,
      'profile response time < 300ms': (r) => r.timings.duration < 300
    });
  }

  sleep(Math.random() * 2 + 1); // Random sleep between 1-3 seconds
}

export function teardown(data) {
  console.log('Tearing down load test...');
}
```

**Create: `tests/load/stress-test.js`**

```javascript
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 100 }, // Ramp up
    { duration: '5m', target: 200 }, // Stress level
    { duration: '1m', target: 300 }, // Peak stress
    { duration: '5m', target: 300 }, // Maintain peak
    { duration: '2m', target: 0 } // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'], // Relaxed threshold for stress test
    http_req_failed: ['rate<0.2'] // Allow higher error rate
  }
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';

export default function () {
  // Stress test with health check endpoint
  const response = http.get(`${BASE_URL}/api/v1/health`);

  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 2000ms': (r) => r.timings.duration < 2000
  });
}
```

### 2. Artillery Load Testing (Alternative)

**Create: `tests/load/artillery-config.yml`**

```yaml
config:
  target: 'http://localhost:8000'
  phases:
    - duration: 60
      arrivalRate: 10
      name: 'Warm up'
    - duration: 300
      arrivalRate: 50
      name: 'Load test'
    - duration: 120
      arrivalRate: 100
      name: 'Stress test'
  payload:
    path: 'test-users.csv'
    fields:
      - 'email'
      - 'password'
  defaults:
    headers:
      Content-Type: 'application/json'

scenarios:
  - name: 'Authentication Flow'
    weight: 70
    flow:
      - post:
          url: '/api/v1/auth/login'
          json:
            email: '{{ email }}'
            password: '{{ password }}'
          capture:
            - json: '$.data.accessToken'
              as: 'token'
      - get:
          url: '/api/v1/auth/profile'
          headers:
            Authorization: 'Bearer {{ token }}'

  - name: 'Health Check'
    weight: 30
    flow:
      - get:
          url: '/api/v1/health'
```

### 3. Performance Monitoring Scripts

**Create: `scripts/performance-monitor.js`**

```javascript
import { performance } from 'perf_hooks';
import { logger } from '../src/utils/logger.js';

class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.intervals = new Map();
  }

  startMonitoring() {
    // Monitor memory usage
    this.intervals.set(
      'memory',
      setInterval(() => {
        const usage = process.memoryUsage();
        logger.info('Memory Usage', {
          heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
          heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
          external: Math.round(usage.external / 1024 / 1024),
          rss: Math.round(usage.rss / 1024 / 1024)
        });
      }, 30000)
    ); // Every 30 seconds

    // Monitor CPU usage
    this.intervals.set(
      'cpu',
      setInterval(() => {
        const usage = process.cpuUsage();
        logger.info('CPU Usage', {
          user: usage.user,
          system: usage.system
        });
      }, 30000)
    );

    // Monitor event loop lag
    this.intervals.set(
      'eventLoop',
      setInterval(() => {
        const start = performance.now();
        setImmediate(() => {
          const lag = performance.now() - start;
          logger.info('Event Loop Lag', { lag: Math.round(lag) });
        });
      }, 10000)
    ); // Every 10 seconds
  }

  stopMonitoring() {
    this.intervals.forEach((interval) => {
      clearInterval(interval);
    });
    this.intervals.clear();
  }

  measureAsync(name, asyncFn) {
    return async (...args) => {
      const start = performance.now();
      try {
        const result = await asyncFn(...args);
        const duration = performance.now() - start;
        this.recordMetric(name, duration);
        return result;
      } catch (error) {
        const duration = performance.now() - start;
        this.recordMetric(`${name}_error`, duration);
        throw error;
      }
    };
  }

  recordMetric(name, value) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name).push({
      value,
      timestamp: Date.now()
    });

    // Keep only last 1000 measurements
    const measurements = this.metrics.get(name);
    if (measurements.length > 1000) {
      measurements.splice(0, measurements.length - 1000);
    }
  }

  getMetrics(name) {
    const measurements = this.metrics.get(name) || [];
    if (measurements.length === 0) return null;

    const values = measurements.map((m) => m.value);
    return {
      count: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      p95: this.percentile(values, 0.95),
      p99: this.percentile(values, 0.99)
    };
  }

  percentile(values, p) {
    const sorted = values.sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[index];
  }

  getAllMetrics() {
    const result = {};
    this.metrics.forEach((_, name) => {
      result[name] = this.getMetrics(name);
    });
    return result;
  }
}

export const performanceMonitor = new PerformanceMonitor();

// Middleware to measure request performance
export const performanceMiddleware = (req, res, next) => {
  const start = performance.now();

  res.on('finish', () => {
    const duration = performance.now() - start;
    const route = req.route ? req.route.path : req.path;
    const method = req.method;
    const status = res.statusCode;

    performanceMonitor.recordMetric(`${method}_${route}`, duration);
    performanceMonitor.recordMetric(`status_${status}`, duration);

    logger.info('Request Performance', {
      method,
      route,
      status,
      duration: Math.round(duration),
      ip: req.ip
    });
  });

  next();
};
```

## 🔧 Performance Optimization Configurations

### 4. Optimized Docker Configuration

**Create: `docker/optimized.Dockerfile`**

```dockerfile
# Multi-stage build for optimal performance
FROM node:22-alpine AS dependencies

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM node:22-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runtime

# Performance optimizations
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=1024 --optimize-for-size"
ENV UV_THREADPOOL_SIZE=16

# Security and performance
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN apk add --no-cache dumb-init

WORKDIR /app

# Copy dependencies
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package*.json ./

# Set ownership
RUN chown -R appuser:appgroup /app

USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8000/api/v1/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

EXPOSE 8000

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.cjs"]
```

### 6. Production Docker Compose

**Create: `docker-compose.prod.yml`**

```yaml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - ./nginx/performance.conf:/etc/nginx/conf.d/default.conf
      - ./certs:/etc/nginx/certs
    depends_on:
      - auth-service-1
      - auth-service-2
    restart: unless-stopped

  auth-service-1:
    build:
      context: .
      dockerfile: docker/optimized.Dockerfile
    environment:
      - NODE_ENV=production
      - INSTANCE_ID=1
    env_file:
      - .env.production
    depends_on:
      - mongodb
      - redis
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'

  auth-service-2:
    build:
      context: .
      dockerfile: docker/optimized.Dockerfile
    environment:
      - NODE_ENV=production
      - INSTANCE_ID=2
    env_file:
      - .env.production
    depends_on:
      - mongodb
      - redis
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'

  mongodb:
    image: mongo:7.0
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_ROOT_USER}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_ROOT_PASSWORD}
    volumes:
      - mongo_data:/data/db
      - ./mongo-init.js:/docker-entrypoint-initdb.d/mongo-init.js:ro
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1'

  redis:
    image: redis:7.2-alpine
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 256M
          cpus: '0.25'

  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    ports:
      - '9090:9090'
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana-dashboards:/etc/grafana/provisioning/dashboards
    ports:
      - '3000:3000'
    restart: unless-stopped

volumes:
  mongo_data:
  redis_data:
  prometheus_data:
  grafana_data:
```

## 📊 Performance Testing Commands

### 7. Testing Scripts

**Create: `scripts/run-load-tests.sh`**

```bash
#!/bin/bash

echo "🚀 Starting Performance Tests..."

# Ensure the application is running
echo "Checking if application is running..."
if ! curl -f http://localhost:8000/api/v1/health > /dev/null 2>&1; then
    echo "❌ Application is not running. Please start it first."
    exit 1
fi

echo "✅ Application is running"

# Run K6 load tests
echo "Running K6 load tests..."
k6 run tests/load/auth-load-test.js --out json=results/load-test-results.json

# Run stress tests
echo "Running stress tests..."
k6 run tests/load/stress-test.js --out json=results/stress-test-results.json

# Generate performance report
echo "Generating performance report..."
node scripts/generate-performance-report.js

echo "🎉 Performance tests completed!"
echo "📊 Check results/ directory for detailed reports"
```

**Create: `scripts/generate-performance-report.js`**

```javascript
import fs from 'fs';
import path from 'path';

const generateReport = () => {
  const resultsDir = 'results';
  const reportFile = path.join(resultsDir, 'performance-report.html');

  // Ensure results directory exists
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir);
  }

  // Read test results
  let loadTestResults = {};
  let stressTestResults = {};

  try {
    const loadTestData = fs.readFileSync(path.join(resultsDir, 'load-test-results.json'), 'utf8');
    loadTestResults = JSON.parse(loadTestData);
  } catch (error) {
    console.log('No load test results found');
  }

  try {
    const stressTestData = fs.readFileSync(
      path.join(resultsDir, 'stress-test-results.json'),
      'utf8'
    );
    stressTestResults = JSON.parse(stressTestData);
  } catch (error) {
    console.log('No stress test results found');
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Performance Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .metric { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .success { color: green; }
        .warning { color: orange; }
        .error { color: red; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <h1>🚀 Performance Test Report</h1>
    <p>Generated on: ${new Date().toISOString()}</p>
    
    <h2>📊 Load Test Results</h2>
    <div class="metric">
        <h3>Response Times</h3>
        <p>Average: ${loadTestResults.http_req_duration?.avg || 'N/A'}ms</p>
        <p>95th Percentile: ${loadTestResults.http_req_duration?.p95 || 'N/A'}ms</p>
        <p>99th Percentile: ${loadTestResults.http_req_duration?.p99 || 'N/A'}ms</p>
    </div>
    
    <div class="metric">
        <h3>Request Statistics</h3>
        <p>Total Requests: ${loadTestResults.http_reqs?.count || 'N/A'}</p>
        <p>Failed Requests: ${loadTestResults.http_req_failed?.rate || 'N/A'}%</p>
        <p>Requests/Second: ${loadTestResults.http_reqs?.rate || 'N/A'}</p>
    </div>

    <h2>⚡ Stress Test Results</h2>
    <div class="metric">
        <h3>Peak Performance</h3>
        <p>Max Response Time: ${stressTestResults.http_req_duration?.max || 'N/A'}ms</p>
        <p>Error Rate: ${stressTestResults.http_req_failed?.rate || 'N/A'}%</p>
    </div>

    <h2>📋 Recommendations</h2>
    <ul>
        <li>Response times should be under 500ms for 95% of requests</li>
        <li>Error rate should be below 1%</li>
        <li>Monitor memory usage during peak load</li>
        <li>Consider horizontal scaling if CPU usage exceeds 70%</li>
    </ul>
</body>
</html>`;

  fs.writeFileSync(reportFile, html);
  console.log(`📊 Performance report generated: ${reportFile}`);
};

generateReport();
```

This comprehensive load testing guide provides everything you need to:

1. **Test your application under load** with realistic scenarios
2. **Monitor performance metrics** in real-time
3. **Identify bottlenecks** before they affect users
4. **Optimize deployment** for production workloads
5. **Generate detailed reports** for stakeholders

**To get started:**

```bash
# Install K6
curl https://github.com/grafana/k6/releases/download/v0.47.0/k6-v0.47.0-linux-amd64.tar.gz -L | tar xvz --strip-components 1

# Make scripts executable
chmod +x scripts/run-load-tests.sh

# Run the tests
./scripts/run-load-tests.sh
```

Would you like me to create additional testing scenarios or help you implement any specific performance optimizations?
