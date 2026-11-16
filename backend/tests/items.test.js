const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const Item = require('../src/models/Item');
const { setupTestDB, teardownTestDB, clearTestDB } = require('./setup');
const { generateAccessToken } = require('../src/utils/generateToken');
const cloudinaryService = require('../src/services/cloudinaryService');

// Mock Cloudinary service at the service boundary
jest.mock('../src/services/cloudinaryService', () => ({
  uploadImageBuffer: jest.fn().mockResolvedValue({
    url: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
    publicId: 'sample_id_123',
  }),
  deleteImage: jest.fn().mockResolvedValue(true),
}));

beforeAll(async () => {
  await setupTestDB();
});

afterAll(async () => {
  await teardownTestDB();
});

beforeEach(async () => {
  await clearTestDB();
});

describe('4. Items API & Security Rules', () => {
  let userA, tokenA;
  let userB, tokenB;
  let adminUser, adminToken;

  beforeEach(async () => {
    const secret = process.env.JWT_SECRET;

    userA = await User.create({
      name: 'Student A',
      email: 'student.a@kiet.edu',
      collegeId: 'student.a',
      role: 'student',
    });
    tokenA = generateAccessToken(userA, secret);

    userB = await User.create({
      name: 'Student B',
      email: 'student.b@kiet.edu',
      collegeId: 'student.b',
      role: 'student',
    });
    tokenB = generateAccessToken(userB, secret);

    adminUser = await User.create({
      name: 'Campus Admin',
      email: 'admin@kiet.edu',
      collegeId: 'admin',
      role: 'admin',
    });
    adminToken = generateAccessToken(adminUser, secret);
  });

  test('POST /api/items sets reporterId strictly from token, ignoring any spoofed body reporterId', async () => {
    const itemData = {
      type: 'lost',
      title: 'Navy Blue Backpack',
      description: 'Contains lecture notes and scientific calculator',
      category: 'Bags',
      location: {
        name: 'Central Library 2nd Floor',
        address: 'Academic Block A',
        latitude: 28.7532,
        longitude: 77.4975,
      },
      reporterId: userB._id.toString(), // Attacker tries to spoof userB's ID in body!
    };

    const res = await request(app)
      .post('/api/items')
      .set('Authorization', `Bearer ${tokenA}`)
      .send(itemData);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const createdId = res.body.data.item._id;
    const dbItem = await Item.findById(createdId);

    // Source of truth: must belong to User A, NOT User B!
    expect(dbItem.reporterId.toString()).toBe(userA._id.toString());
  });

  test('non-owner cannot PATCH, DELETE, or resolve another user item (gets 403)', async () => {
    const item = await Item.create({
      type: 'found',
      title: 'Water Bottle',
      description: 'Olive green stainless steel bottle',
      category: 'Other',
      location: {
        name: 'Cafeteria',
        latitude: 28.7528,
        longitude: 77.4969,
        geo: { type: 'Point', coordinates: [77.4969, 28.7528] },
      },
      reporterId: userA._id,
    });

    // User B attempts to delete User A's item
    const resDel = await request(app)
      .delete(`/api/items/${item._id}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(resDel.status).toBe(403);
    expect(resDel.body.code).toBe('NOT_ITEM_OWNER');

    // User B attempts to resolve User A's item
    const resRes = await request(app)
      .post(`/api/items/${item._id}/resolve`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(resRes.status).toBe(403);
    expect(resRes.body.code).toBe('NOT_ITEM_OWNER');

    // User B attempts to update User A's item
    const resUpdate = await request(app)
      .patch(`/api/items/${item._id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ title: 'Hacked Title' });
    expect(resUpdate.status).toBe(403);
  });

  test('owner can resolve their own item, storing resolvedAt and resolvedBy', async () => {
    const item = await Item.create({
      type: 'lost',
      title: 'Casio Watch',
      description: 'Silver digital watch lost near sports arena',
      category: 'Accessories',
      location: {
        name: 'Sports Complex',
        latitude: 28.7521,
        longitude: 77.4989,
        geo: { type: 'Point', coordinates: [77.4989, 28.7521] },
      },
      reporterId: userA._id,
      status: 'active',
    });

    const res = await request(app)
      .post(`/api/items/${item._id}/resolve`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.data.item.status).toBe('resolved');

    const dbItem = await Item.findById(item._id);
    expect(dbItem.status).toBe('resolved');
    expect(dbItem.resolvedAt).toBeTruthy();
    expect(dbItem.resolvedBy.toString()).toBe(userA._id.toString());
  });

  test('admin can delete any item and deletes Cloudinary image asset', async () => {
    const item = await Item.create({
      type: 'found',
      title: 'Spam Item',
      description: 'Inappropriate listing test',
      category: 'Other',
      images: [{ url: 'https://cloudinary.com/test.jpg', publicId: 'test_asset_456' }],
      location: {
        name: 'Main Gate',
        latitude: 28.7545,
        longitude: 77.4962,
        geo: { type: 'Point', coordinates: [77.4962, 28.7545] },
      },
      reporterId: userA._id,
    });

    const res = await request(app)
      .delete(`/api/items/${item._id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(cloudinaryService.deleteImage).toHaveBeenCalledWith('test_asset_456');

    const check = await Item.findById(item._id);
    expect(check).toBeNull();
  });

  test('privacy-first location: unauthenticated users get rounded coordinates (~3 decimals)', async () => {
    const item = await Item.create({
      type: 'found',
      title: 'Keys with Keychain',
      description: 'Two keys on a ring',
      category: 'Keys',
      location: {
        name: 'Hostel 3 Lawn',
        address: 'Boys Hostel Cluster',
        latitude: 28.7515432,
        longitude: 77.4972891,
        geo: { type: 'Point', coordinates: [77.4972891, 28.7515432] },
      },
      reporterId: userA._id,
    });

    // Unauthenticated GET /api/items/:id/location
    const resUnauth = await request(app).get(`/api/items/${item._id}/location`);
    expect(resUnauth.status).toBe(200);
    expect(resUnauth.body.data.latitude).toBe(28.752); // Rounded to 3 decimals
    expect(resUnauth.body.data.longitude).toBe(77.497);
    expect(resUnauth.body.data.isApproximate).toBe(true);
    expect(resUnauth.body.data.mapsUrl).toContain('destination=28.752,77.497');

    // Authenticated GET /api/items/:id/location
    const resAuth = await request(app)
      .get(`/api/items/${item._id}/location`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(resAuth.status).toBe(200);
    expect(resAuth.body.data.latitude).toBe(28.7515432); // Exact coordinates
    expect(resAuth.body.data.longitude).toBe(77.4972891);
    expect(resAuth.body.data.isApproximate).toBe(false);
  });

  test('GET /api/items pagination defaults and max limit clamp', async () => {
    // Request with limit 100 exceeds max 50
    const res = await request(app).get('/api/items?limit=100');
    expect(res.status).toBe(200);
    expect(res.body.data.limit).toBe(50); // Clamped to 50
    expect(res.body.data.page).toBe(1);
  });
});
