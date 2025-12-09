const request = require('supertest');
const app = require('../../app');

describe('Unit: Express app', () => {
  test('GET / returns HTML', async () => {
    const res = await request(app).get('/').expect(200);
    expect(res.text).toMatch(/<\!DOCTYPE|Attendance|<html/i);
  });

  test('GET /api/attendance returns array (200)', async () => {
    const res = await request(app).get('/api/attendance').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
