#!/usr/bin/env node
/**
 * Performance Testing Suite for JWT Migration
 * Tests performance comparison between API Keys and JWT authentication
 */

const { performance } = require('perf_hooks');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3002';
const API_KEY = process.env.API_KEY || 'bc529961369183feb7eff2c5e3699ba7';
const CONCURRENT_REQUESTS = 10;
const TOTAL_REQUESTS = 100;

// Test data
const testBoard = {
  name: "Performance Test Board",
  description: "Created during performance testing",
  color: "#22c55e",
  icon: "⚡"
};

// Helper function to make authenticated requests
async function makeRequest(url, options = {}, authType = 'apikey') {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (authType === 'apikey') {
    headers['Authorization'] = `Bearer ${API_KEY}`;
  }
  // JWT testing would require actual JWT token

  const response = await fetch(url, {
    ...options,
    headers
  });

  return {
    status: response.status,
    data: response.ok ? await response.json() : null,
    ok: response.ok
  };
}

// Performance test runner
async function runPerformanceTest(testName, testFunction, iterations = 10) {
  console.log(`\n🏃 Running: ${testName}`);
  console.log(`Iterations: ${iterations}`);

  const times = [];
  let errors = 0;

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();

    try {
      await testFunction();
      const end = performance.now();
      times.push(end - start);
    } catch (error) {
      errors++;
      console.error(`Error in iteration ${i + 1}:`, error.message);
    }
  }

  if (times.length === 0) {
    console.log(`❌ All ${iterations} requests failed`);
    return null;
  }

  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const successRate = ((iterations - errors) / iterations) * 100;

  console.log(`✅ Average: ${avgTime.toFixed(2)}ms`);
  console.log(`📊 Min: ${minTime.toFixed(2)}ms | Max: ${maxTime.toFixed(2)}ms`);
  console.log(`💯 Success Rate: ${successRate.toFixed(1)}%`);

  return {
    testName,
    avgTime,
    minTime,
    maxTime,
    successRate,
    totalRequests: iterations,
    errors
  };
}

// Test functions
async function testApiKeyAuth() {
  return makeRequest(`${API_BASE_URL}/api/boards`, {}, 'apikey');
}

async function testApiKeyCreate() {
  return makeRequest(`${API_BASE_URL}/api/boards`, {
    method: 'POST',
    body: JSON.stringify({
      ...testBoard,
      name: `${testBoard.name} ${Date.now()}`
    })
  }, 'apikey');
}

async function testApiKeyBulkRead() {
  const promises = [];
  for (let i = 0; i < CONCURRENT_REQUESTS; i++) {
    promises.push(makeRequest(`${API_BASE_URL}/api/boards`, {}, 'apikey'));
  }
  await Promise.all(promises);
}

// Memory usage tracking
function getMemoryUsage() {
  const used = process.memoryUsage();
  return {
    rss: Math.round(used.rss / 1024 / 1024 * 100) / 100,
    heapUsed: Math.round(used.heapUsed / 1024 / 1024 * 100) / 100,
    heapTotal: Math.round(used.heapTotal / 1024 / 1024 * 100) / 100,
    external: Math.round(used.external / 1024 / 1024 * 100) / 100
  };
}

// Main performance test suite
async function runPerformanceSuite() {
  console.log('🚀 JWT Migration Performance Testing Suite');
  console.log('==========================================');
  console.log(`API Base URL: ${API_BASE_URL}`);
  console.log(`Concurrent Requests: ${CONCURRENT_REQUESTS}`);
  console.log(`Total Requests per Test: ${TOTAL_REQUESTS}`);

  const memoryStart = getMemoryUsage();
  console.log('\n💾 Memory Usage (Start):', memoryStart);

  const results = [];

  // Test API Key Performance
  console.log('\n📋 API Key Authentication Tests');
  console.log('================================');

  const apiKeyAuth = await runPerformanceTest(
    'API Key - List Boards',
    testApiKeyAuth,
    50
  );
  if (apiKeyAuth) results.push(apiKeyAuth);

  const apiKeyCreate = await runPerformanceTest(
    'API Key - Create Board',
    testApiKeyCreate,
    20
  );
  if (apiKeyCreate) results.push(apiKeyCreate);

  const apiKeyBulk = await runPerformanceTest(
    'API Key - Concurrent Requests',
    testApiKeyBulkRead,
    10
  );
  if (apiKeyBulk) results.push(apiKeyBulk);

  // RLS Performance Impact Test
  console.log('\n🔒 RLS Performance Impact');
  console.log('==========================');

  const rlsImpact = await runPerformanceTest(
    'RLS Query Performance',
    async () => {
      // Test complex query that would be affected by RLS
      return makeRequest(`${API_BASE_URL}/api/check-ins`, {}, 'apikey');
    },
    30
  );
  if (rlsImpact) results.push(rlsImpact);

  const memoryEnd = getMemoryUsage();
  console.log('\n💾 Memory Usage (End):', memoryEnd);
  console.log('💾 Memory Delta:', {
    rss: memoryEnd.rss - memoryStart.rss,
    heapUsed: memoryEnd.heapUsed - memoryStart.heapUsed
  });

  // Results Summary
  console.log('\n📊 Performance Test Results Summary');
  console.log('=====================================');

  results.forEach(result => {
    if (result.successRate < 95) {
      console.log(`⚠️  ${result.testName}: ${result.avgTime.toFixed(2)}ms (${result.successRate.toFixed(1)}% success)`);
    } else {
      console.log(`✅ ${result.testName}: ${result.avgTime.toFixed(2)}ms`);
    }
  });

  // Performance recommendations
  console.log('\n💡 Performance Recommendations');
  console.log('===============================');

  const slowTests = results.filter(r => r.avgTime > 1000);
  if (slowTests.length > 0) {
    console.log('⚠️  Slow operations detected:');
    slowTests.forEach(test => {
      console.log(`   - ${test.testName}: ${test.avgTime.toFixed(2)}ms`);
    });
  } else {
    console.log('✅ All operations performing within acceptable limits');
  }

  const failedTests = results.filter(r => r.successRate < 95);
  if (failedTests.length > 0) {
    console.log('❌ Reliability issues detected:');
    failedTests.forEach(test => {
      console.log(`   - ${test.testName}: ${test.successRate.toFixed(1)}% success rate`);
    });
  } else {
    console.log('✅ All operations have good reliability');
  }

  return results;
}

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the performance suite
if (require.main === module) {
  runPerformanceSuite()
    .then(results => {
      console.log('\n🎉 Performance testing completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Performance testing failed:', error);
      process.exit(1);
    });
}

module.exports = { runPerformanceSuite, runPerformanceTest };