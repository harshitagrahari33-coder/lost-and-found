process.env.PORT = '5099';
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/matching-test-placeholder';
process.env.JWT_SECRET = 'test_jwt_secret_key_12345';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_key_12345';
process.env.OTP_HMAC_SECRET = 'test_otp_hmac_secret_key_12345';
process.env.CLIENT_URL = 'http://localhost:5174';

const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const Item = require('../src/models/Item');
const matchingService = require('../src/services/matchingService');
const { generateAccessToken } = require('../src/utils/generateToken');
const { setupTestDB, teardownTestDB, clearTestDB } = require('./setup');

const location = (name = 'Central Library', latitude = 28.7532, longitude = 77.4975) => ({
  name,
  address: 'Academic Block A',
  latitude,
  longitude,
  geo: { type: 'Point', coordinates: [longitude, latitude] },
});

beforeAll(() => setupTestDB());
afterAll(() => teardownTestDB());
beforeEach(() => clearTestDB());

describe('Smart matching', () => {
  test('scores matching category, text, location, and date highly', () => {
    const result = matchingService.calculateMatch(
      { type: 'lost', title: 'Black Samsung Galaxy phone', description: 'Blue protective case and scratch', category: 'Electronics', location: location(), date: '2026-11-16' },
      { type: 'found', title: 'Samsung Galaxy phone black', description: 'Black phone with blue case and scratched back', category: 'Electronics', location: location(), date: '2026-11-17' }
    );
    expect(result.score).toBeGreaterThanOrEqual(75);
    expect(result.confidence).toBe('High');
  });

  test('does not award category points for different categories', () => {
    const source = { category: 'Bags', title: 'blue bag', description: 'blue', location: location(), date: '2026-11-16' };
    const same = matchingService.calculateMatch(source, { ...source, type: 'found' });
    const different = matchingService.calculateMatch(source, { ...source, type: 'found', category: 'Clothing' });
    expect(same.score - different.score).toBe(25);
  });

  test('gives nearby locations more points than distant locations', () => {
    const source = { category: 'Keys', title: 'locker keys', description: 'metal keys', location: location(), date: '2026-11-16' };
    const nearby = matchingService.calculateLocationSimilarity(source.location, location());
    const distant = matchingService.calculateLocationSimilarity(source.location, location('Main Gate', 28.760, 77.510));
    expect(nearby.points).toBeGreaterThan(distant.points);
  });

  test('matches a lost report against a similar found report', async () => {
    const user = await User.create({ name: 'Student', email: 'lost-match@kiet.edu', collegeId: 'lost-match', role: 'student' });
    const source = { type: 'lost', title: 'Black Samsung Galaxy phone', description: 'Blue protective case and scratched back', category: 'Electronics', location: location(), date: '2026-11-16' };
    const candidate = { type: 'found', title: 'Samsung Galaxy phone black', description: 'Black phone with blue case and scratched back', category: 'Electronics', location: location(), date: '2026-11-17', reporterId: user._id };
    await Item.create({ ...candidate, reporterId: user._id });

    const matches = await matchingService.findMatches(source);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].score).toBeGreaterThanOrEqual(75);
    expect(matches[0].confidence).toBe('High');
  });

  test('matches a found report against a similar lost report', async () => {
    const user = await User.create({ name: 'Student', email: 'found-match@kiet.edu', collegeId: 'found-match', role: 'student' });
    const source = { type: 'found', title: 'Samsung Galaxy phone black', description: 'Blue protective case and scratched back', category: 'Electronics', location: location(), date: '2026-11-17' };
    const candidate = { type: 'lost', title: 'Black Samsung Galaxy phone', description: 'Black phone with blue case and scratch', category: 'Electronics', location: location(), date: '2026-11-16', reporterId: user._id };
    await Item.create({ ...candidate, reporterId: user._id });

    const matches = await matchingService.findMatches(source);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].score).toBeGreaterThanOrEqual(75);
  });

  test('excludes resolved candidate reports from matches', async () => {
    const user = await User.create({ name: 'Student', email: 'resolved-candidate@kiet.edu', collegeId: 'resolved-candidate', role: 'student' });
    const source = { type: 'lost', title: 'Black Samsung phone', description: 'Blue case', category: 'Electronics', location: location(), date: '2026-11-16' };
    await Item.create({ ...source, status: 'resolved', type: 'found', reporterId: user._id });
    const live = await Item.create({ ...source, type: 'found', title: 'Black Samsung phone', reporterId: user._id });

    const matches = await matchingService.findMatches(source);
    expect(matches.some((match) => match.item._id.toString() === live._id.toString())).toBe(true);
    expect(matches.some((match) => match.item.status === 'resolved')).toBe(false);
  });

  test('excludes archived candidate reports from matches', async () => {
    const user = await User.create({ name: 'Student', email: 'archived-candidate@kiet.edu', collegeId: 'archived-candidate', role: 'student' });
    const source = { type: 'lost', title: 'Black Samsung phone', description: 'Blue case', category: 'Electronics', location: location(), date: '2026-11-16' };
    await Item.create({ ...source, status: 'archived', type: 'found', reporterId: user._id });
    const live = await Item.create({ ...source, type: 'found', title: 'Black Samsung phone', reporterId: user._id });

    const matches = await matchingService.findMatches(source);
    expect(matches.some((match) => match.item._id.toString() === live._id.toString())).toBe(true);
    expect(matches.some((match) => match.item.status === 'archived')).toBe(false);
  });

  test('returns no matches for a resolved source report', async () => {
    const user = await User.create({ name: 'Student', email: 'resolved-source@kiet.edu', collegeId: 'resolved-source', role: 'student' });
    const source = await Item.create({ type: 'lost', title: 'Black Samsung phone', description: 'Blue case', category: 'Electronics', location: location(), reporterId: user._id, status: 'resolved' });
    await Item.create({ type: 'found', title: 'Black Samsung phone', description: 'Blue case', category: 'Electronics', location: location(), reporterId: user._id });

    const matches = await matchingService.getMatchesForItem(source._id, { _id: user._id, role: 'student' });
    expect(matches).toEqual([]);
  });

  test('returns no matches for an archived source report', async () => {
    const user = await User.create({ name: 'Student', email: 'archived-source@kiet.edu', collegeId: 'archived-source', role: 'student' });
    const source = await Item.create({ type: 'lost', title: 'Black Samsung phone', description: 'Blue case', category: 'Electronics', location: location(), reporterId: user._id, status: 'archived' });
    await Item.create({ type: 'found', title: 'Black Samsung phone', description: 'Blue case', category: 'Electronics', location: location(), reporterId: user._id });

    const matches = await matchingService.getMatchesForItem(source._id, { _id: user._id, role: 'student' });
    expect(matches).toEqual([]);
  });

  test('rejects false positives when title and description are unrelated', async () => {
    const source = { type: 'lost', title: 'Black Samsung phone', description: 'Blue protective case', category: 'Electronics', location: location(), date: '2026-11-16' };
    const candidate = { type: 'found', title: 'Dell laptop charger', description: 'White power adapter', category: 'Electronics', location: location(), date: '2026-11-16' };

    const matches = await matchingService.findMatches(source);
    expect(matches.some((match) => match.item.title === candidate.title)).toBe(false);
  });

  test('filters candidates by active opposite type and keeps five ranked results', async () => {
    const user = await User.create({ name: 'Student', email: 'matching@kiet.edu', collegeId: 'matching', role: 'student' });
    const base = { title: 'Black Samsung phone', description: 'blue case', category: 'Electronics', location: location(), date: new Date('2026-11-16') };
    await Item.create({ ...base, type: 'lost', reporterId: user._id });
    await Item.create({ ...base, type: 'found', reporterId: user._id });
    await Item.create({ ...base, type: 'found', status: 'resolved', reporterId: user._id });
    await Promise.all(Array.from({ length: 7 }, (_, index) => Item.create({
      ...base,
      type: 'found',
      title: `Black Samsung phone ${index}`,
      reporterId: user._id,
    })));

    const matches = await matchingService.findMatches({ ...base, type: 'lost' });
    expect(matches).toHaveLength(5);
    expect(matches.every((match) => match.item.type === 'found' && match.item.status === 'active')).toBe(true);
    expect(matches.map((match) => match.score)).toEqual([...matches.map((match) => match.score)].sort((a, b) => b - a));
  });

  test('enforces preview and saved-match authorization and hides candidate coordinates', async () => {
    const owner = await User.create({ name: 'Owner', email: 'owner@kiet.edu', collegeId: 'owner', role: 'student' });
    const other = await User.create({ name: 'Other', email: 'other@kiet.edu', collegeId: 'other', role: 'student' });
    const admin = await User.create({ name: 'Admin', email: 'admin@kiet.edu', collegeId: 'admin', role: 'admin' });
    const ownerToken = generateAccessToken(owner, process.env.JWT_SECRET);
    const otherToken = generateAccessToken(other, process.env.JWT_SECRET);
    const adminToken = generateAccessToken(admin, process.env.JWT_SECRET);
    const source = await Item.create({ type: 'lost', title: 'Black phone', description: 'Blue case', category: 'Electronics', location: location(), reporterId: owner._id });
    await Item.create({ type: 'found', title: 'Black phone', description: 'Blue case', category: 'Electronics', location: location(), reporterId: other._id });
    const draft = { type: 'lost', title: 'Black phone', description: 'Blue case', category: 'Electronics', location: { name: 'Central Library', address: 'Academic Block A', latitude: 28.7532, longitude: 77.4975 }, date: '2026-11-16' };

    expect((await request(app).post('/api/items/matches/preview').send(draft)).status).toBe(401);
    const previewResponse = await request(app).post('/api/items/matches/preview').set('Authorization', `Bearer ${ownerToken}`).send(draft);
    expect(previewResponse.status).toBe(200);
    expect(previewResponse.body.data.matches[0]).not.toHaveProperty('distance');
    expect(previewResponse.body.data.matches[0].item.location.latitude).toBeUndefined();
    expect(previewResponse.body.data.matches[0].item.location.longitude).toBeUndefined();
    expect((await request(app).get(`/api/items/${source._id}/matches`).set('Authorization', `Bearer ${otherToken}`)).status).toBe(403);
    const ownerResponse = await request(app).get(`/api/items/${source._id}/matches`).set('Authorization', `Bearer ${ownerToken}`);
    expect(ownerResponse.status).toBe(200);
    expect(ownerResponse.body.data.matches[0]).not.toHaveProperty('distance');
    expect(ownerResponse.body.data.matches[0].item.location.latitude).toBeUndefined();
    expect(ownerResponse.body.data.matches[0].item.location.longitude).toBeUndefined();
    const adminResponse = await request(app).get(`/api/items/${source._id}/matches`).set('Authorization', `Bearer ${adminToken}`);
    expect(adminResponse.status).toBe(200);
    expect(adminResponse.body.data.matches[0].item.location.latitude).toBeUndefined();
  });

  test('returns 404 for nonexistent report matches', async () => {
    const owner = await User.create({ name: 'Owner', email: 'missing-owner@kiet.edu', collegeId: 'missing-owner', role: 'student' });
    const token = generateAccessToken(owner, process.env.JWT_SECRET);
    const response = await request(app).get('/api/items/507f1f77bcf86cd799439011/matches').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(404);
  });

  test('rejects invalid preview payloads with null or empty coordinates', async () => {
    const user = await User.create({ name: 'Student', email: 'preview-invalid@kiet.edu', collegeId: 'preview-invalid', role: 'student' });
    const token = generateAccessToken(user, process.env.JWT_SECRET);
    const invalidPayload = {
      type: 'lost',
      title: 'Black phone',
      description: 'Blue case',
      category: 'Electronics',
      location: { name: 'Central Library', address: 'Academic Block A', latitude: null, longitude: 77.4975 },
      date: '2026-11-16',
    };

    const response = await request(app).post('/api/items/matches/preview').set('Authorization', `Bearer ${token}`).send(invalidPayload);
    expect(response.status).toBe(400);
  });

  test('rejects invalid dates in preview payloads', async () => {
    const user = await User.create({ name: 'Student', email: 'preview-date@kiet.edu', collegeId: 'preview-date', role: 'student' });
    const token = generateAccessToken(user, process.env.JWT_SECRET);
    const invalidPayload = {
      type: 'lost',
      title: 'Black phone',
      description: 'Blue case',
      category: 'Electronics',
      location: { name: 'Central Library', address: 'Academic Block A', latitude: 28.7532, longitude: 77.4975 },
      date: 'not-a-date',
    };

    const response = await request(app).post('/api/items/matches/preview').set('Authorization', `Bearer ${token}`).send(invalidPayload);
    expect(response.status).toBe(400);
  });
});
