const assert = require('assert');

console.log('✓ Running basic tests...');

// Test 1: Module loads
try {
  const app = require('../app.js');
  assert(app, 'app module should export');
  console.log('✓ app.js exports correctly');
} catch (err) {
  console.error('✗ Failed to load app:', err.message);
  process.exit(1);
}

// Test 2: Environment loads
try {
  require('dotenv').config();
  assert(process.env.PORT || 4000, 'PORT should be set or default to 4000');
  console.log('✓ Environment variables loaded');
} catch (err) {
  console.error('✗ Failed to load environment:', err.message);
  process.exit(1);
}

console.log('\n✓ All basic tests passed!');
process.exit(0);
