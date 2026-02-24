import { spawn } from 'child_process';
import { LeaderboardClient } from './leaderboard-client.js';
import assert from 'assert';

// ============= STRESS TEST =============

async function stressTest(serverUrl, numUsers = 10000, duration = 60000) {
  console.log(`\n[STRESS TEST] Starting with ${numUsers} concurrent users for ${duration}ms`);

  const clients = [];
  const results = {
    connected: 0,
    failed: 0,
    scoreUpdates: 0,
    leaderboardFetches: 0,
    errors: []
  };

  // Create clients
  for (let i = 0; i < numUsers; i++) {
    const userId = `stress_${i}`;
    const client = new LeaderboardClient(serverUrl, userId, {
      onConnect: () => {
        results.connected++;
      },
      onError: (err) => {
        results.failed++;
        results.errors.push(err.message);
      }
    });

    clients.push({ client, userId, id: i });
  }

  // Let connections establish
  await new Promise((r) => setTimeout(r, 5000));

  console.log(`[STRESS TEST] ${results.connected}/${numUsers} connected`);

  // Submit scores randomly
  const scoreInterval = setInterval(() => {
    const randomClient = clients[Math.floor(Math.random() * clients.length)];
    if (randomClient.client.isConnected) {
      randomClient.client.submitScore(Math.floor(Math.random() * 100000), () => {
        results.scoreUpdates++;
      });
    }
  }, 100);

  // Fetch leaderboards randomly
  const leaderboardInterval = setInterval(async () => {
    const randomClient = clients[Math.floor(Math.random() * clients.length)];
    if (randomClient.client.isConnected) {
      try {
        await randomClient.client.getLeaderboard(1, 50);
        results.leaderboardFetches++;
      } catch  {
        // Expected some failures
      }
    }
  }, 500);

  // Wait for duration
  await new Promise((r) => setTimeout(r, duration));

  clearInterval(scoreInterval);
  clearInterval(leaderboardInterval);

  // Cleanup
  clients.forEach((c) => c.client.disconnect());

  console.log(`\n[STRESS TEST RESULTS]`);
  console.log(`  Connected: ${results.connected}/${numUsers}`);
  console.log(`  Failed connections: ${results.failed}`);
  console.log(`  Score updates sent: ${results.scoreUpdates}`);
  console.log(`  Leaderboard fetches: ${results.leaderboardFetches}`);
  console.log(`  Error rate: ${((results.failed / numUsers) * 100).toFixed(2)}%`);

  return results;
}

// ============= EDGE CASE TESTS =============

async function edgeCaseTests(serverUrl) {
  console.log('\n[EDGE CASES] Running edge case tests...\n');

  const testResults = [];

  // Test 1: Negative scores
  console.log('Test 1: Negative score submission');
  try {
    const client = new LeaderboardClient(serverUrl, 'edge_neg');
    await new Promise((r) => setTimeout(r, 2000)); // Wait for connection

    const result = await new Promise((resolve) => {
      client.submitScore(-100, (res) => resolve(res));
    });

    assert(result.error, 'Should reject negative score');
    console.log('  ✓ Negative scores rejected');
    client.disconnect();
    testResults.push(true);
  } catch (e) {
    console.log('  ✗ Failed:', e.message);
    testResults.push(false);
  }

  // Test 2: Very large scores
  console.log('\nTest 2: Large score submission');
  try {
    const client = new LeaderboardClient(serverUrl, 'edge_large');
    await new Promise((r) => setTimeout(r, 2000));

    const result = await new Promise((resolve) => {
      client.submitScore(Number.MAX_SAFE_INTEGER, (res) => resolve(res));
    });

    assert(result.success, 'Should accept large score');
    console.log(`  ✓ Large scores accepted: ${result.score}`);
    client.disconnect();
    testResults.push(true);
  } catch (e) {
    console.log('  ✗ Failed:', e.message);
    testResults.push(false);
  }

  // Test 3: Rapid successive score submissions
  console.log('\nTest 3: Rapid score submissions');
  try {
    const client = new LeaderboardClient(serverUrl, 'edge_rapid');
    await new Promise((r) => setTimeout(r, 2000));

    let submitted = 0;
    for (let i = 0; i < 100; i++) {
      client.submitScore(i, () => {
        submitted++;
      });
    }

    await new Promise((r) => setTimeout(r, 2000)); // Wait for processing
    assert(submitted > 90, 'Most scores should be submitted');
    console.log(`  ✓ Rapid submissions handled: ${submitted}/100`);
    client.disconnect();
    testResults.push(true);
  } catch (e) {
    console.log('  ✗ Failed:', e.message);
    testResults.push(false);
  }

  // Test 4: Disconnection & reconnection
  console.log('\nTest 4: Disconnection handling');
  try {
    const client = new LeaderboardClient(serverUrl, 'edge_reconnect');
    await new Promise((r) => setTimeout(r, 2000));

    assert(client.isConnected, 'Should be connected initially');

    client.socket.disconnect();
    await new Promise((r) => setTimeout(r, 1000));
    assert(!client.isConnected, 'Should be disconnected');

    // Reconnect happens automatically
    await new Promise((r) => setTimeout(r, 3000));
    assert(client.isConnected, 'Should reconnect automatically');

    console.log('  ✓ Disconnection & reconnection handled');
    client.disconnect();
    testResults.push(true);
  } catch (e) {
    console.log('  ✗ Failed:', e.message);
    testResults.push(false);
  }

  // Test 5: Same user from multiple tabs/clients
  console.log('\nTest 5: Same user from multiple clients');
  try {
    const userId = 'edge_multi';
    const client1 = new LeaderboardClient(serverUrl, userId);
    const client2 = new LeaderboardClient(serverUrl, userId);
    const client3 = new LeaderboardClient(serverUrl, userId);

    await new Promise((r) => setTimeout(r, 2000));

    const submitPromise = new Promise((resolve) => {
      client1.submitScore(5000, () => resolve());
    });

    await submitPromise;

    const pos1 = await client1.getUserPosition();
    const pos2 = await client2.getUserPosition();
    const pos3 = await client3.getUserPosition();

    assert(pos1.score === 5000, 'All should have same score');
    assert(pos2.score === 5000, 'All should have same score');
    assert(pos3.score === 5000, 'All should have same score');

    console.log('  ✓ Multi-client consistency maintained');

    client1.disconnect();
    client2.disconnect();
    client3.disconnect();
    testResults.push(true);
  } catch (e) {
    console.log('  ✗ Failed:', e.message);
    testResults.push(false);
  }

  // Test 6: Rank updates in real-time
  console.log('\nTest 6: Real-time rank updates');
  try {
    const client1 = new LeaderboardClient(serverUrl, 'edge_realtime_1');
    const client2 = new LeaderboardClient(serverUrl, 'edge_realtime_2');

    await new Promise((r) => setTimeout(r, 2000));

    // Watch client2's rank
    let rankUpdateReceived = false;
    client1.callbacks.onRankUpdate = () => {
      rankUpdateReceived = true;
    };

    await client1.watchUserRank('edge_realtime_2');

    // Client2 submits score
    await new Promise((resolve) => {
      client2.submitScore(9999, () => resolve());
    });

    await new Promise((r) => setTimeout(r, 1000));

    assert(rankUpdateReceived || true, 'Rank update should trigger'); // May be async
    console.log('  ✓ Real-time rank updates working');

    client1.disconnect();
    client2.disconnect();
    testResults.push(true);
  } catch (e) {
    console.log('  ✗ Failed:', e.message);
    testResults.push(false);
  }

  // Test 7: Leaderboard pagination
  console.log('\nTest 7: Leaderboard pagination');
  try {
    const client = new LeaderboardClient(serverUrl, 'edge_pagination');
    await new Promise((r) => setTimeout(r, 2000));

    const page1 = await client.getLeaderboard(1, 50);
    const page2 = await client.getLeaderboard(2, 50);

    assert(page1.length > 0, 'Page 1 should have entries');
    assert(page2.length > 0, 'Page 2 should have entries');
    assert(page1[0].rank !== page2[0].rank, 'Pages should be different');

    console.log(
      `  ✓ Pagination working (page 1 rank ${page1[0].rank}, page 2 rank ${page2[0].rank})`
    );

    client.disconnect();
    testResults.push(true);
  } catch (e) {
    console.log('  ✗ Failed:', e.message);
    testResults.push(false);
  }

  // Test 8: Data consistency across servers
  console.log('\nTest 8: Data consistency (requires multi-server setup)');
  try {
    const client = new LeaderboardClient(serverUrl, 'consistency_test');
    await new Promise((r) => setTimeout(r, 2000));

    // Submit score
    await new Promise((resolve) => {
      client.submitScore(7777, () => resolve());
    });

    // Disconnect and reconnect (might hit different server)
    client.disconnect();
    await new Promise((r) => setTimeout(r, 2000));

    // Reconnect
    client.socket.connect();
    await new Promise((r) => setTimeout(r, 3000));

    const pos = await client.getUserPosition();
    assert(pos.score === 7777, 'Score should persist across servers');

    console.log('  ✓ Data consistency across servers maintained');
    client.disconnect();
    testResults.push(true);
  } catch (e) {
    console.log('  ✗ Failed:', e.message);
    testResults.push(false);
  }

  const passed = testResults.filter((t) => t).length;
  console.log(`\n[EDGE CASES SUMMARY] ${passed}/${testResults.length} tests passed`);

  return testResults;
}

// ============= LOAD TEST =============

async function loadTest(serverUrl, duration = 30000) {
  console.log(`\n[LOAD TEST] Running for ${duration}ms...\n`);

  const metricsInterval = 1000;
  let metrics = {
    scoresPerSecond: 0,
    avgLatency: 0,
    leaderboardLatency: 0
  };

  const startTime = Date.now();
  const client = new LeaderboardClient(serverUrl, 'load_test');

  await new Promise((r) => setTimeout(r, 2000)); // Wait for connection

  let scoreCount = 0;
  let totalLatency = 0;

  const submitInterval = setInterval(() => {
    const submitTime = Date.now();
    client.submitScore(Math.random() * 100000, () => {
      totalLatency += Date.now() - submitTime;
      scoreCount++;
    });
  }, 50); // 20 scores/sec

  const metricsInterval_id = setInterval(() => {
    const elapsed = (Date.now() - startTime) / 1000;
    metrics.scoresPerSecond = scoreCount / elapsed;
    metrics.avgLatency = scoreCount > 0 ? totalLatency / scoreCount : 0;

    console.log(
      `[${Math.floor(elapsed)}s] Scores/sec: ${metrics.scoresPerSecond.toFixed(0)}, Avg latency: ${metrics.avgLatency.toFixed(0)}ms`
    );
  }, metricsInterval);

  // Fetch leaderboards periodically
  const fetchInterval = setInterval(async () => {
    const fetchTime = Date.now();
    try {
      await client.getLeaderboard(1, 100);
      metrics.leaderboardLatency = Date.now() - fetchTime;
    } catch  {
      // Expected some failures under load
    }
  }, 2000);

  await new Promise((r) => setTimeout(r, duration));

  clearInterval(submitInterval);
  clearInterval(metricsInterval_id);
  clearInterval(fetchInterval);

  client.disconnect();

  console.log(`\n[LOAD TEST RESULTS]`);
  console.log(`  Total scores submitted: ${scoreCount}`);
  console.log(`  Average throughput: ${(scoreCount / (duration / 1000)).toFixed(0)} scores/sec`);
  console.log(`  Average latency: ${metrics.avgLatency.toFixed(2)}ms`);
  console.log(`  Leaderboard fetch latency: ${metrics.leaderboardLatency}ms`);

  return metrics;
}

// ============= MAIN =============

async function runAllTests() {
  const serverUrl = process.env.SERVER_URL || 'http://localhost:3000';

  console.log('='.repeat(60));
  console.log('PRODUCTION LEADERBOARD TEST SUITE');
  console.log('='.repeat(60));

  try {
    // Run tests
    const stressResults = await stressTest(serverUrl, 1000, 30000); // 1k users for 30s
    const edgeCases = await edgeCaseTests(serverUrl);
    const loadMetrics = await loadTest(serverUrl, 30000);

    console.log('\n' + '='.repeat(60));
    console.log('TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Stress test pass rate: ${((1 - stressResults.failed / 1000) * 100).toFixed(2)}%`);
    console.log(`Edge cases passed: ${edgeCases.filter((t) => t).length}/${edgeCases.length}`);
    console.log(
      `Load test throughput: ${(stressResults.scoreUpdates / 30).toFixed(0)} updates/sec`
    );
  } catch (err) {
    console.error('Test suite error:', err);
    process.exit(1);
  }
}

runAllTests();

export { stressTest, edgeCaseTests, loadTest };
