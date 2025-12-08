const request = require('supertest');
const app = require('../app');
const db = require('../models');

beforeAll(async () => {
  await db.sequelize.sync({ force: true }); // recreate tables
});

afterAll(async () => {
  await db.sequelize.close();
});

describe('Attendance API', () => {
  it('should mark attendance', async () => {
    const res = await request(app)
      .post('/api/attendance')
      .send({ userId: 'U1', eventId: 'E1', status: 'present' });
    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
  });

  it('should get attendance for an event', async () => {
    const res = await request(app).get('/api/attendance/E1');
    expect(res.statusCode).toEqual(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});
