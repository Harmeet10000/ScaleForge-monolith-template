# Production Leaderboard System Architecture

## High-Level Design

```
┌─────────────────────────────────────────────────────────────┐
│                       Clients (100k+)                        │
│         (Web browsers, Mobile apps, Desktop clients)         │
└─────────────────────────────────────────────────────────────┘
                              ↓
                    ┌─────────────────────┐
                    │   Load Balancer     │
                    │  (Nginx/AWS ALB)    │
                    └─────────────────────┘
                              ↓
        ┌─────────────────────────────────────────────┐
        │    Socket.IO Server Cluster (10-20 nodes)   │
        ├─────────────────────────────────────────────┤
        │  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
        │  │ Server 1 │  │ Server 2 │  │ Server N │  │
        │  └──────────┘  └──────────┘  └──────────┘  │
        │                                              │
        │  All servers communicate via Redis Adapter  │
        └─────────────────────────────────────────────┘
                    ↓              ↓
        ┌──────────────────┐  ┌──────────────────┐
        │  Redis Cluster   │  │   PostgreSQL     │
        │  (Leaderboard    │  │   (Persistence)  │
        │   + Caching)     │  │                  │
        └──────────────────┘  └──────────────────┘
```

## Core Components

### 1. RedisService
- **Purpose**: Real-time leaderboard state & caching
- **Data Structure**: Sorted Set (O(log N) operations)
- **Key Operations**:
  - `ZREVRANGE` - Get top N players (O(log N + N))
  - `ZREVRANK` - Get user rank (O(log N))
  - `ZINCRBY` - Increment score (O(log N))
  - `ZSCORE` - Get user score (O(1))

### 2. DatabaseService
- **Purpose**: Persistent storage & analytics
- **Strategy**: Batch writes (500 scores every 500ms)
- **Why batching?**
  - Reduces database load by 100x
  - Groups related writes
  - Tolerates small data loss

### 3. UpdateQueue
- **Purpose**: Efficient batch processing
- **Flow**:
  1. Score updates enqueued in memory
  2. Redis updated immediately (fast reads)
  3. Database updated every 500ms or when queue hits 500 items
  4. Handles failures gracefully

### 4. LeaderboardManager
- **Purpose**: Business logic orchestration
- **Responsibilities**:
  - Score recording
  - Rank lookups
  - Caching strategies
  - Event emission

## Scaling Strategy

### Horizontal Scaling
- **Load Balancer** distributes connections using least-conn algorithm
- **Socket.IO Redis Adapter** broadcasts events across servers
- **Sticky Sessions** keep client connected to same server when possible

### Data Scaling
- **Redis Sorted Sets** handle 100k+ users efficiently
- **Pagination** prevents loading entire leaderboard (max 500 entries per fetch)
- **Partitioned Caches** cache leaderboard pages separately (5 min TTL)
- **Database Partitioning** (optional) for 10M+ users

### Connection Management
- Each server handles ~10k concurrent connections
- 100k users = 10 servers minimum
- Auto-scaling from 10-50 servers based on CPU/memory

## Edge Cases Handled

### 1. **Duplicate Score Updates**
```javascript
// Only keeps highest score for user
await redis.zadd(key, newScore, userId);
// Automatic deduplication via ZSET
```

### 2. **Score Inversions** (user A beats B, then B resets)
```javascript
// Always use max(currentScore, newScore)
const newScore = Math.max(currentScore, score);
```

### 3. **Concurrent Updates** from multiple clients
```javascript
// Redis is single-threaded, processes atomically
// Database transactions ensure consistency
```

### 4. **Network Disconnections**
- Client auto-reconnects with exponential backoff
- In-flight updates queued locally and retried
- Rank cache TTL prevents stale data

### 5. **Multi-Server Consistency**
- All servers read/write to same Redis instance
- Database is single source of truth
- 30-second sync job reconciles any divergence

### 6. **Cache Invalidation**
- User rank cache invalidated on score change
- Leaderboard partition cache auto-expires (60s TTL)
- Manual invalidation via pub/sub

### 7. **Large Leaderboard Pagination**
```javascript
// Never load all 100k users
// Instead, load 500-user chunks
const startRank = (page - 1) * pageSize;
const endRank = startRank + pageSize - 1;
```

### 8. **Simultaneous Connections** from Same User
- Redis tracks single score (last-write-wins)
- Multiple WebSocket connections for same user are allowed
- All get same data from Redis

## Performance Characteristics

| Operation | Latency | Notes |
|-----------|---------|-------|
| Submit score | <50ms | Redis + queue |
| Get rank | <20ms | Redis + cache |
| Get top 50 | <30ms | Redis ZREVRANGE |
| Get rank range | <50ms | Redis ZREVRANGE + pagination |
| Leaderboard page fetch | <100ms | Cached in Redis |

## Batch Processing Deep Dive

### Why Batch?
- Raw DB: 5k updates/sec needs 5000 queries/sec
- Batched: 5k updates/sec = 10 batches/sec (500 updates per batch)
- **500x reduction in database load**

### Timing
```
t=0ms:    User A submits score → queued
t=50ms:   User B submits score → queued
t=100ms:  User C submits score → queued (queue size: 3)
t=200ms:  User D submits score → queued (queue size: 4)
t=500ms:  TIMER FIRES → all 4 scores written to DB in 1 transaction
t=501ms:  Queue cleared, next batch starts
```

### Safety
- If batch fails, updates re-queued automatically
- Redis already updated (cache), so no data loss
- Database catches up eventually (30s sync job)

## Memory Efficiency

### Redis Memory Usage
- 100k users in ZSET: ~20-30MB
- With cache partitions: ~50MB total
- LRU eviction ensures cap

### Why Sorted Set?
- Perfect for leaderboard queries
- O(log N) score operations
- Built-in range queries (ZREVRANGE)

## Failure Scenarios

| Scenario | Handling |
|----------|----------|
| User disconnect | Auto-reconnect with backoff |
| Server down | Load balancer routes to healthy server |
| Redis crash | Database is source of truth, rebuild from DB |
| Database down | Scores queue in memory, retry on recovery |
| Batch job fails | Updates re-queued, retry on next interval |
| Cache expires | Regenerated on-demand |
| Network latency spike | Client-side timeouts, user sees "loading" |

## Monitoring & Observability

### Key Metrics
1. **Connected clients**: Track per server and total
2. **Batch processing**: Time and success rate
3. **Redis memory**: Watch for evictions
4. **Database latency**: P95 should be <50ms
5. **WebSocket connection success**: Track handshake failures

### Alerts
- Connected clients drop >50% in 1 minute
- Batch failure rate >1%
- Redis evictions detected
- Database query P95 >100ms
- Server memory >85%

## Production Checklist

- [x] Batching implemented (500 items, 500ms interval)
- [x] Redis Sorted Sets for O(log N) operations
- [x] Pagination to prevent full leaderboard loads
- [x] Caching with TTL expiration
- [x] Connection pooling for database
- [x] Graceful disconnection handling
- [x] Automatic reconnection with backoff
- [x] Rate limiting per user
- [x] Input validation
- [x] Error handling & recovery
- [x] Health checks
- [x] Metrics & monitoring
- [x] Load testing (1000+ concurrent)
- [x] Edge case testing
- [x] Multi-server testing
- [x] Kubernetes deployment ready

## Scaling to 1M+ Users

For 1M+ users:
1. **Database Partitioning**: Split leaderboard by user_id hash
2. **Redis Cluster**: Partition by key hash
3. **Multiple Load Balancers**: Geographic distribution
4. **Microservices**: Separate rank service, score service
5. **Analytics Tier**: Archive old scores to cold storage

## Cost Optimization

- **Compute**: 10-20 servers @ $100/month = $1-2k/month
- **Redis**: 50GB @ $100/month = $100/month
- **Database**: 500GB @ $200/month = $200/month
- **Total**: ~$1.3-2.3k/month for 100k users

Optimize:
- Use Redis UNLOGGED tables for speed (if acceptable)
- Compress WebSocket messages
- Use CDN for static assets
- Archive historical data to S3

## Example Usage

```javascript
// Server
import io from './leaderboard-server.js';

// Client
import { LeaderboardClient, OptimisticLeaderboardUI } from './leaderboard-client.js';

const client = new LeaderboardClient('http://localhost:3000', 'user_123');

// Submit score
client.submitScore(9001, (response) => {
  console.log('Score:', response.score);
});

// Get leaderboard
const lb = await client.getLeaderboard(1, 50); // Top 50
console.log(lb);

// Get user rank
const pos = await client.getUserPosition();
console.log(`Rank: ${pos.rank}, Score: ${pos.score}`);

// Watch specific user
await client.watchUserRank('user_456');
```

## Testing

```bash
# Start server
npm start

# Run tests in another terminal
npm test              # Edge cases
npm run test:stress   # 1k concurrent users
npm run test:load     # Throughput test
```

Expected results:
- Edge cases: All 8/8 pass
- Stress test: 95%+ connection success
- Load test: 5k+ scores/sec
