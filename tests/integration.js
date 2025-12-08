const http = require('http');
const assert = require('assert');

console.log('=== Integration Test ===\n');

// Test 1: GET / should return HTML
function testRoot() {
  return new Promise((resolve, reject) => {
    const req = http.get('http://localhost:4000/', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          assert.strictEqual(res.statusCode, 200, `Expected 200, got ${res.statusCode}`);
          assert(data.includes('Attendance') || data.includes('DOCTYPE'), 'Response should contain HTML');
          console.log('✓ GET / returns 200 with HTML');
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(3000, () => reject(new Error('Request timeout')));
  });
}

// Test 2: GET /api/attendance should return JSON array
function testApiAttendance() {
  return new Promise((resolve, reject) => {
    const req = http.get('http://localhost:4000/api/attendance', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          assert.strictEqual(res.statusCode, 200, `Expected 200, got ${res.statusCode}`);
          const json = JSON.parse(data);
          assert(Array.isArray(json), 'Response should be an array');
          console.log(`✓ GET /api/attendance returns 200 with ${json.length} records`);
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(3000, () => reject(new Error('Request timeout')));
  });
}

// Test 3: 404 for unknown route
function test404() {
  return new Promise((resolve, reject) => {
    const req = http.get('http://localhost:4000/unknown-route', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          assert.strictEqual(res.statusCode, 404, `Expected 404, got ${res.statusCode}`);
          console.log('✓ GET /unknown-route returns 404');
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(3000, () => reject(new Error('Request timeout')));
  });
}

// Run tests
async function runTests() {
  console.log('Waiting 2s for server to be ready...\n');
  await new Promise(r => setTimeout(r, 2000));

  try {
    await testRoot();
    await testApiAttendance();
    await test404();
    console.log('\n✓ All integration tests passed!');
    process.exit(0);
  } catch (err) {
    console.error('\n✗ Test failed:', err.message);
    process.exit(1);
  }
}

runTests();
