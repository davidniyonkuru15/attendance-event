const request = require('supertest');
const app = require('../../app');

let server;

beforeAll(async () => {
  // start server which will wait for DB
  server = await app.startServer();
});

afterAll(async () => {
  if (server && server.close) await new Promise(r => server.close(r));
});

describe('Integration: running server with DB', () => {
  test('GET / returns HTML', async () => {
    const res = await request(server).get('/').expect(200);
    expect(res.text).toMatch(/<\!DOCTYPE|Attendance|<html/i);
  });

  test('GET /api/attendance returns array', async () => {
    const res = await request(server).get('/api/attendance').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
