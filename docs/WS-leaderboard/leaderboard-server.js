import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import Redis from 'ioredis';
import pg from 'pg';
import { EventEmitter } from 'events';

// ============= CONFIG =============
const PORT = process.env.PORT || 3000;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const DB_URL = process.env.DATABASE_URL || 'postgres://user:pass@localhost/leaderboard';
const BATCH_SIZE = 500;
const BATCH_INTERVAL = 500; // ms
const RANK_CACHE_TTL = 60; // seconds
const PARTITION_SIZE = 500; // load 500 ranks at a time

// ============= SERVICES =============

class RedisService {
  constructor(redisUrl) {
    this.client = new Redis(redisUrl);
    this.subscriber = new Redis(redisUrl);
    this.client.on('error', (err) => console.error('Redis error:', err));
  }

  async getLeaderboard(startRank, endRank) {
    const key = `leaderboard:scores`;
    return this.client.zrevrange(key, startRank, endRank, 'WITHSCORES');
  }

  async getUserRank(userId) {
    const key = `leaderboard:scores`;
    return this.client.zrevrank(key, userId);
  }

  async getScore(userId) {
    const key = `leaderboard:scores`;
    return this.client.zscore(key, userId);
  }

  async setScore(userId, score) {
    const key = `leaderboard:scores`;
    return this.client.zadd(key, score, userId);
  }

  async incrementScore(userId, delta) {
    const key = `leaderboard:scores`;
    return this.client.zincrby(key, delta, userId);
  }

  async invalidateRankCache(userId) {
    const patterns = [`rank:${userId}:*`, `leaderboard:partition:*`];
    for (const pattern of patterns) {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) await this.client.del(...keys);
    }
  }

  async cacheUserRank(userId, rank, ttl = RANK_CACHE_TTL) {
    return this.client.setex(`rank:${userId}:cached`, ttl, rank);
  }

  async getCachedUserRank(userId) {
    return this.client.get(`rank:${userId}:cached`);
  }

  subscribe(channel, handler) {
    this.subscriber.subscribe(channel, (err) => {
      if (err) console.error('Subscribe error:', err);
    });
    this.subscriber.on('message', (ch, msg) => {
      if (ch === channel) handler(JSON.parse(msg));
    });
  }

  async publish(channel, data) {
    return this.client.publish(channel, JSON.stringify(data));
  }

  async close() {
    await this.client.quit();
    await this.subscriber.quit();
  }
}

class DatabaseService {
  constructor(dbUrl) {
    this.pool = new pg.Pool({ connectionString: dbUrl });
    this.pool.on('error', (err) => console.error('DB pool error:', err));
  }

  async init() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS leaderboard (
        user_id VARCHAR(255) PRIMARY KEY,
        score BIGINT NOT NULL DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        metadata JSONB
      );
      CREATE INDEX IF NOT EXISTS idx_leaderboard_score ON leaderboard(score DESC);
    `);
  }

  async batchUpdateScores(updates) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      for (const { userId, score } of updates) {
        await client.query(
          `INSERT INTO leaderboard (user_id, score, updated_at) 
           VALUES ($1, $2, CURRENT_TIMESTAMP)
           ON CONFLICT (user_id) DO UPDATE SET 
           score = $2, updated_at = CURRENT_TIMESTAMP`,
          [userId, score]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getLeaderboardSnapshot(limit = 1000) {
    const result = await this.pool.query(
      `SELECT user_id, score FROM leaderboard 
       ORDER BY score DESC LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  async getUserRank(userId) {
    const result = await this.pool.query(
      `SELECT COUNT(*) as rank FROM leaderboard 
       WHERE score > (SELECT score FROM leaderboard WHERE user_id = $1)`,
      [userId]
    );
    return parseInt(result.rows[0].rank) + 1;
  }

  async close() {
    await this.pool.end();
  }
}

class UpdateQueue {
  constructor(batchSize, batchInterval, onBatch) {
    this.queue = new Map(); // userId -> score
    this.batchSize = batchSize;
    this.batchInterval = batchInterval;
    this.onBatch = onBatch;
    this.timer = null;
  }

  enqueue(userId, score) {
    this.queue.set(userId, score);

    if (this.queue.size >= this.batchSize) {
      this.flush();
    } else if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), this.batchInterval);
    }
  }

  async flush() {
    if (this.queue.size === 0) return;

    const updates = Array.from(this.queue.entries()).map(([userId, score]) => ({
      userId,
      score
    }));

    this.queue.clear();
    clearTimeout(this.timer);
    this.timer = null;

    await this.onBatch(updates);
  }

  async close() {
    await this.flush();
  }
}

class LeaderboardManager extends EventEmitter {
  constructor(redisService, dbService) {
    super();
    this.redis = redisService;
    this.db = dbService;
    this.updateQueue = new UpdateQueue(BATCH_SIZE, BATCH_INTERVAL, (updates) =>
      this.processBatch(updates)
    );
  }

  async recordScore(userId, score) {
    const currentScore = await this.redis.getScore(userId);
    const newScore = Math.max(currentScore ? parseFloat(currentScore) : 0, score);

    // Queue for batch DB write
    this.updateQueue.enqueue(userId, newScore);

    // Immediate Redis update for fast reads
    await this.redis.setScore(userId, newScore);
    await this.redis.invalidateRankCache(userId);

    // Emit for WebSocket broadcast
    this.emit('scoreUpdate', { userId, score: newScore });

    return newScore;
  }

  async processBatch(updates) {
    try {
      await this.db.batchUpdateScores(updates);

      // Publish to all servers via Redis
      await this.redis.publish('leaderboard:updates', {
        count: updates.length,
        timestamp: Date.now()
      });

      console.log(`[BATCH] Processed ${updates.length} score updates`);
    } catch (err) {
      console.error('[BATCH] Error processing updates:', err);
      // Re-queue failed updates
      updates.forEach((u) => this.updateQueue.enqueue(u.userId, u.score));
    }
  }

  async getLeaderboard(page = 1, pageSize = 50) {
    const startRank = (page - 1) * pageSize;
    const endRank = startRank + pageSize - 1;

    const cacheKey = `leaderboard:partition:${page}`;
    const cached = await this.redis.client.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const raw = await this.redis.getLeaderboard(startRank, endRank);
    const leaderboard = [];

    for (let i = 0; i < raw.length; i += 2) {
      leaderboard.push({
        rank: startRank + Math.floor(i / 2) + 1,
        userId: raw[i],
        score: parseInt(raw[i + 1])
      });
    }

    await this.redis.client.setex(cacheKey, RANK_CACHE_TTL, JSON.stringify(leaderboard));
    return leaderboard;
  }

  async getUserPosition(userId) {
    // Check cache first
    const cached = await this.redis.getCachedUserRank(userId);
    if (cached !== null) {
      const score = await this.redis.getScore(userId);
      return {
        userId,
        rank: parseInt(cached),
        score: score ? parseInt(score) : 0
      };
    }

    // Get from Redis, fallback to DB
    let rank = await this.redis.getUserRank(userId);
    if (rank === null) {
      rank = await this.db.getUserRank(userId);
    } else {
      rank += 1; // zrevrank is 0-indexed
    }

    const score = await this.redis.getScore(userId);

    await this.redis.cacheUserRank(userId, rank);

    return {
      userId,
      rank,
      score: score ? parseInt(score) : 0
    };
  }

  async close() {
    await this.updateQueue.close();
  }
}

// ============= SOCKET.IO SETUP =============

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  adapter: require('socket.io-redis')(Redis, new Redis(REDIS_URL), new Redis(REDIS_URL)),
  transports: ['websocket', 'polling'],
  pingInterval: 25000,
  pingTimeout: 60000,
  maxHttpBufferSize: 1e6, // 1MB
  cors: { origin: '*' }
});

const redis = new RedisService(REDIS_URL);
const db = new DatabaseService(DB_URL);
const leaderboard = new LeaderboardManager(redis, db);

// ============= SOCKET HANDLERS =============

io.on('connection', (socket) => {
  const userId = socket.handshake.query.userId;

  if (!userId) {
    socket.disconnect();
    return;
  }

  console.log(`[USER CONNECTED] ${userId} from ${socket.handshake.address}`);

  // Join user room for targeted updates
  socket.join(`user:${userId}`);

  // ===== SCORE SUBMISSION =====
  socket.on('submitScore', async (data, callback) => {
    const { score } = data;

    if (!Number.isInteger(score) || score < 0) {
      return callback({ error: 'Invalid score' });
    }

    try {
      const newScore = await leaderboard.recordScore(userId, score);
      callback({ success: true, score: newScore });
    } catch (err) {
      console.error(`[ERROR] Submit score ${userId}:`, err);
      callback({ error: 'Server error' });
    }
  });

  // ===== LEADERBOARD FETCH =====
  socket.on('getLeaderboard', async (data, callback) => {
    const { page = 1, pageSize = 50 } = data || {};

    if (pageSize > 100) {
      return callback({ error: 'Max pageSize is 100' });
    }

    try {
      const lb = await leaderboard.getLeaderboard(page, pageSize);
      callback({ success: true, data: lb });
    } catch (err) {
      console.error(`[ERROR] Get leaderboard:`, err);
      callback({ error: 'Server error' });
    }
  });

  // ===== USER POSITION =====
  socket.on('getUserPosition', async (data, callback) => {
    try {
      const position = await leaderboard.getUserPosition(userId);
      callback({ success: true, data: position });
    } catch (err) {
      console.error(`[ERROR] Get position ${userId}:`, err);
      callback({ error: 'Server error' });
    }
  });

  // ===== WATCH USER RANK CHANGES =====
  socket.on('watchUserRank', async (data, callback) => {
    const { targetUserId } = data;

    try {
      const position = await leaderboard.getUserPosition(targetUserId || userId);

      socket.join(`rank:${targetUserId || userId}`);
      callback({ success: true, data: position });
    } catch (err) {
      console.error(`[ERROR] Watch rank:`, err);
      callback({ error: 'Server error' });
    }
  });

  // ===== BATCH LEADERBOARD UPDATES =====
  socket.on('getLeaderboardRange', async (data, callback) => {
    const { startRank = 1, endRank = 100 } = data || {};

    if (endRank - startRank > 500) {
      return callback({ error: 'Max range is 500' });
    }

    try {
      const raw = await redis.getLeaderboard(startRank - 1, endRank - 1);
      const lb = [];

      for (let i = 0; i < raw.length; i += 2) {
        lb.push({
          rank: startRank + Math.floor(i / 2),
          userId: raw[i],
          score: parseInt(raw[i + 1])
        });
      }

      callback({ success: true, data: lb });
    } catch (err) {
      console.error(`[ERROR] Get range:`, err);
      callback({ error: 'Server error' });
    }
  });

  socket.on('disconnect', () => {
    console.log(`[USER DISCONNECTED] ${userId}`);
  });

  socket.on_error = (err) => {
    console.error(`[SOCKET ERROR] ${userId}:`, err);
  };
});

// ============= BROADCAST SCORE UPDATES =============

leaderboard.on('scoreUpdate', ({ userId, score }) => {
  // Broadcast to all clients watching this user's rank
  io.to(`rank:${userId}`).emit('rankUpdate', {
    userId,
    score,
    timestamp: Date.now()
  });

  // Send to user themselves
  io.to(`user:${userId}`).emit('scoreConfirmed', { score });
});

// ============= BACKGROUND TASKS =====

// Periodically sync Redis to DB (safety net)
setInterval(async () => {
  try {
    const snapshot = await redis.client.zrevrange('leaderboard:scores', 0, -1, 'WITHSCORES');
    const updates = [];

    for (let i = 0; i < Math.min(snapshot.length, 100); i += 2) {
      updates.push({
        userId: snapshot[i],
        score: parseInt(snapshot[i + 1])
      });
    }

    if (updates.length > 0) {
      await db.batchUpdateScores(updates);
      console.log('[SYNC] DB sync completed');
    }
  } catch (err) {
    console.error('[SYNC] Error:', err);
  }
}, 30000); // Every 30 seconds

// Publish connection metrics
setInterval(() => {
  const clients = io.sockets.sockets.size;
  redis.publish('metrics:connections', { count: clients, timestamp: Date.now() });
  console.log(`[METRICS] Connected clients: ${clients}`);
}, 10000);

// ============= STARTUP =============

async function start() {
  try {
    await db.init();
    console.log('[DB] Connected and initialized');

    httpServer.listen(PORT, () => {
      console.log(`[SERVER] Leaderboard server running on port ${PORT}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('[SHUTDOWN] SIGTERM received, gracefully shutting down...');

      await leaderboard.close();
      await redis.close();
      await db.close();

      httpServer.close(() => {
        console.log('[SHUTDOWN] Server closed');
        process.exit(0);
      });
    });
  } catch (err) {
    console.error('[STARTUP] Error:', err);
    process.exit(1);
  }
}

start();

export default io;
