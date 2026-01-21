import { io } from 'socket.io-client';

class LeaderboardClient {
  constructor(serverUrl, userId, options = {}) {
    this.serverUrl = serverUrl;
    this.userId = userId;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;

    // Batching
    this.scoreQueue = [];
    this.batchTimeout = null;
    this.batchSize = options.batchSize || 10;
    this.batchInterval = options.batchInterval || 200;

    // State
    this.userPosition = null;
    this.leaderboard = [];
    this.connectedAt = null;
    this.isConnected = false;

    // Callbacks
    this.callbacks = {
      onConnect: options.onConnect || (() => {}),
      onDisconnect: options.onDisconnect || (() => {}),
      onRankUpdate: options.onRankUpdate || (() => {}),
      onLeaderboardUpdate: options.onLeaderboardUpdate || (() => {}),
      onError: options.onError || (() => {})
    };

    this.init();
  }

  init() {
    this.socket = io(this.serverUrl, {
      query: { userId: this.userId },
      reconnection: true,
      reconnectionDelay: 100,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
      transports: ['websocket', 'polling']
    });

    // ===== CONNECTION =====
    this.socket.on('connect', () => {
      this.isConnected = true;
      this.connectedAt = Date.now();
      this.reconnectAttempts = 0;
      console.log(`[CLIENT] Connected as ${this.userId}`);
      this.callbacks.onConnect();
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      console.log(`[CLIENT] Disconnected: ${reason}`);
      this.callbacks.onDisconnect(reason);
    });

    this.socket.on('connect_error', (error) => {
      this.reconnectAttempts++;
      console.error(`[CLIENT] Connection error (attempt ${this.reconnectAttempts}):`, error);
      this.callbacks.onError(error);
    });

    // ===== RANK UPDATES =====
    this.socket.on('rankUpdate', (data) => {
      this.callbacks.onRankUpdate(data);
    });

    this.socket.on('scoreConfirmed', (data) => {
      console.log(`[CLIENT] Score confirmed: ${data.score}`);
    });
  }

  // ===== SUBMIT SCORE =====
  submitScore(score, callback = null) {
    if (!this.isConnected) {
      const msg = 'Not connected to server';
      if (callback) callback({ error: msg });
      this.callbacks.onError(new Error(msg));
      return;
    }

    this.socket.emit('submitScore', { score }, (response) => {
      if (response.error) {
        console.error('[CLIENT] Score submission error:', response.error);
        this.callbacks.onError(new Error(response.error));
      } else {
        console.log('[CLIENT] Score submitted:', response.score);
      }
      if (callback) callback(response);
    });
  }

  // ===== FETCH LEADERBOARD =====
  async getLeaderboard(page = 1, pageSize = 50) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected) {
        return reject(new Error('Not connected'));
      }

      this.socket.emit('getLeaderboard', { page, pageSize }, (response) => {
        if (response.error) {
          console.error('[CLIENT] Leaderboard fetch error:', response.error);
          reject(new Error(response.error));
        } else {
          this.leaderboard = response.data;
          this.callbacks.onLeaderboardUpdate(response.data);
          resolve(response.data);
        }
      });
    });
  }

  // ===== GET RANK RANGE =====
  async getLeaderboardRange(startRank = 1, endRank = 100) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected) {
        return reject(new Error('Not connected'));
      }

      this.socket.emit('getLeaderboardRange', { startRank, endRank }, (response) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response.data);
        }
      });
    });
  }

  // ===== GET USER POSITION =====
  async getUserPosition() {
    return new Promise((resolve, reject) => {
      if (!this.isConnected) {
        return reject(new Error('Not connected'));
      }

      this.socket.emit('getUserPosition', {}, (response) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          this.userPosition = response.data;
          resolve(response.data);
        }
      });
    });
  }

  // ===== WATCH USER RANK =====
  async watchUserRank(targetUserId = null) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected) {
        return reject(new Error('Not connected'));
      }

      this.socket.emit('watchUserRank', { targetUserId }, (response) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response.data);
        }
      });
    });
  }

  // ===== DISCONNECT =====
  disconnect() {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }
    this.socket.disconnect();
  }
}

// ============= OPTIMISTIC UPDATE HELPER =============

class OptimisticLeaderboardUI {
  constructor(client) {
    this.client = client;
    this.pendingScores = new Map(); // userId -> { score, pendingUpdate }
    this.displayedLeaderboard = [];
  }

  // Submit with optimistic update
  async submitScoreOptimistic(score) {
    const userId = this.client.userId;

    // Optimistic update
    this.pendingScores.set(userId, {
      score,
      confirmed: false,
      timestamp: Date.now()
    });

    // Update display immediately
    this.updateDisplayedLeaderboard();

    // Send to server
    return new Promise((resolve, reject) => {
      this.client.submitScore(score, (response) => {
        if (response.error) {
          // Rollback
          this.pendingScores.delete(userId);
          this.updateDisplayedLeaderboard();
          reject(new Error(response.error));
        } else {
          // Mark as confirmed
          const pending = this.pendingScores.get(userId);
          if (pending) {
            pending.confirmed = true;
          }
          resolve(response.score);
        }
      });
    });
  }

  updateDisplayedLeaderboard() {
    // Apply pending updates to displayed leaderboard
    const updated = this.displayedLeaderboard.map((entry) => {
      const pending = this.pendingScores.get(entry.userId);
      return pending ? { ...entry, score: pending.score } : entry;
    });
    return updated;
  }

  // Refresh display
  async refreshLeaderboard(page = 1) {
    const lb = await this.client.getLeaderboard(page);
    this.displayedLeaderboard = lb;
    return this.updateDisplayedLeaderboard();
  }
}

// ============= USAGE EXAMPLE =============

/*
const client = new LeaderboardClient(
  'http://localhost:3000',
  'user_12345',
  {
    onConnect: () => console.log('Connected!'),
    onDisconnect: () => console.log('Disconnected'),
    onRankUpdate: (data) => console.log('Rank updated:', data),
    onLeaderboardUpdate: (data) => console.log('Leaderboard:', data),
    onError: (err) => console.error('Error:', err)
  }
);

// Wait for connection
setTimeout(async () => {
  // Submit score
  await client.submitScore(9001);

  // Get leaderboard
  const lb = await client.getLeaderboard(1, 50);
  console.log('Top 50:', lb);

  // Get user position
  const pos = await client.getUserPosition();
  console.log('My position:', pos);

  // Watch specific user
  await client.watchUserRank('user_other');
}, 1000);
*/

export { LeaderboardClient, OptimisticLeaderboardUI };
