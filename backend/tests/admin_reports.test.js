const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const Item = require('../src/models/Item');
const Report = require('../src/models/Report');
const { setupTestDB, teardownTestDB, clearTestDB } = require('./setup');
const { generateAccessToken } = require('../src/utils/generateToken');

beforeAll(async () => {
  await setupTestDB();
});

afterAll(async () => {
  await teardownTestDB();
});

beforeEach(async () => {
  await clearTestDB();
});

describe('6. Reports and Admin Panel Security', () => {
  let studentUser, studentToken;
  let adminUser, adminToken;
  let sampleItem;

  beforeEach(async () => {
    const secret = process.env.JWT_SECRET;

    studentUser = await User.create({
      name: 'Priya Sharma',
      email: 'priya@kiet.edu',
      collegeId: 'priya',
      role: 'student',
    });
    studentToken = generateAccessToken(studentUser, secret);

    adminUser = await User.create({
      name: 'Dean Student Welfare',
      email: 'dsw@kiet.edu',
      collegeId: 'dsw',
      role: 'admin',
    });
    adminToken = generateAccessToken(adminUser, secret);

    sampleItem = await Item.create({
      type: 'found',
      title: 'Lab Notebook',
      description: 'Found in chemistry lab',
      category: 'Documents',
      location: {
        name: 'Science Quad',
        latitude: 28.752,
        longitude: 77.498,
        geo: { type: 'Point', coordinates: [77.498, 28.752] },
      },
      reporterId: studentUser._id,
    });
  });

  test('POST /api/reports creates a pending report and blocks duplicate pending reports', async () => {
    // 1. Create first report
    const res1 = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        itemId: sampleItem._id.toString(),
        reason: 'suspicious',
        description: 'Looks like duplicate post',
      });

    expect(res1.status).toBe(201);
    expect(res1.body.data.report.status).toBe('pending');

    // 2. Attempt duplicate pending report for same item
    const res2 = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        itemId: sampleItem._id.toString(),
        reason: 'spam',
        description: 'Another report from same user',
      });

    expect(res2.status).toBe(409);
    expect(res2.body.code).toBe('PENDING_REPORT_EXISTS');
  });

  test('non-admin student gets 403 on /api/admin/* routes', async () => {
    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('ADMIN_ONLY');
  });

  test('admin user can view admin stats and manage reports', async () => {
    // Admin gets stats
    const statsRes = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(statsRes.status).toBe(200);
    expect(statsRes.body.data.stats.totalUsers).toBeGreaterThanOrEqual(2);

    // Create a report first
    const report = await Report.create({
      reporterId: studentUser._id,
      itemId: sampleItem._id,
      reason: 'fake',
      status: 'pending',
    });

    // Admin reviews report
    const updateRes = await request(app)
      .patch(`/api/admin/reports/${report._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'reviewed' });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.report.status).toBe('reviewed');
  });

  test('admin can suspend and unsuspend a user', async () => {
    const resSuspend = await request(app)
      .patch(`/api/admin/users/${studentUser._id}/suspend`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Spamming listings' });

    expect(resSuspend.status).toBe(200);
    expect(resSuspend.body.data.user.isSuspended).toBe(true);

    const resUnsuspend = await request(app)
      .patch(`/api/admin/users/${studentUser._id}/unsuspend`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(resUnsuspend.status).toBe(200);
    expect(resUnsuspend.body.data.user.isSuspended).toBe(false);
  });
});
