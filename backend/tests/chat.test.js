const http = require('http');
const { Server } = require('socket.io');
const ioClient = require('socket.io-client');
const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const Item = require('../src/models/Item');
const Conversation = require('../src/models/Conversation');
const Message = require('../src/models/Message');
const { initChatSocket } = require('../src/sockets/chatSocket');
const { setupTestDB, teardownTestDB, clearTestDB } = require('./setup');
const { generateAccessToken } = require('../src/utils/generateToken');

let server;
let io;
let port;
let userA, tokenA;
let userB, tokenB;
let userC, tokenC;
let testItem;

beforeAll(async () => {
  await setupTestDB();

  server = http.createServer(app);
  io = new Server(server, { cors: { origin: '*' } });
  initChatSocket(io);

  await new Promise((resolve) => {
    server.listen(0, () => {
      port = server.address().port;
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  await teardownTestDB();
});

beforeEach(async () => {
  await clearTestDB();
  const secret = process.env.JWT_SECRET;

  userA = await User.create({
    name: 'User A',
    email: 'usera@kiet.edu',
    collegeId: 'usera',
    role: 'student',
  });
  tokenA = generateAccessToken(userA, secret);

  userB = await User.create({
    name: 'User B',
    email: 'userb@kiet.edu',
    collegeId: 'userb',
    role: 'student',
  });
  tokenB = generateAccessToken(userB, secret);

  userC = await User.create({
    name: 'User C',
    email: 'userc@kiet.edu',
    collegeId: 'userc',
    role: 'student',
  });
  tokenC = generateAccessToken(userC, secret);

  testItem = await Item.create({
    type: 'lost',
    title: 'Silver Earbuds Case',
    description: 'Found on lawn',
    category: 'Electronics',
    location: {
      name: 'Lawn',
      latitude: 28.75,
      longitude: 77.49,
      geo: { type: 'Point', coordinates: [77.49, 28.75] },
    },
    reporterId: userA._id, // User A is the reporter
  });
});

describe('5. Chat & Real-Time Socket Architecture', () => {
  test('self-chat is rejected when reporter tries to converse with themselves', async () => {
    const res = await request(app)
      .post('/api/conversations')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ itemId: testItem._id.toString() });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('SELF_CHAT_DISALLOWED');
  });

  test('creates conversation and prevents duplicates across concurrent requests', async () => {
    // Two simultaneous requests from User B for testItem
    const [res1, res2] = await Promise.all([
      request(app)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ itemId: testItem._id.toString() }),
      request(app)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ itemId: testItem._id.toString() }),
    ]);

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);

    const convId1 = res1.body.data.conversation._id;
    const convId2 = res2.body.data.conversation._id;

    // Both requests resolve to the EXACT SAME conversation ID
    expect(convId1).toBe(convId2);

    // Database has strictly 1 conversation document
    const count = await Conversation.countDocuments({ itemId: testItem._id });
    expect(count).toBe(1);
  });

  test('non-participant user cannot read conversation messages (gets 403)', async () => {
    const convRes = await request(app)
      .post('/api/conversations')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ itemId: testItem._id.toString() });

    const convId = convRes.body.data.conversation._id;

    // User C is NOT a participant in this conversation
    const res = await request(app)
      .get(`/api/conversations/${convId}/messages`)
      .set('Authorization', `Bearer ${tokenC}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('NOT_PARTICIPANT');
  });

  test('unauthenticated socket connection is rejected', (done) => {
    const client = ioClient(`http://localhost:${port}`, {
      transports: ['websocket'],
      auth: { token: 'invalid.jwt.token' },
    });

    client.on('connect_error', (err) => {
      expect(err.message).toMatch(/invalid or expired/i);
      client.close();
      done();
    });
  });

  test('real-time messaging: sendMessage broadcasts receiveMessage to room', (done) => {
    (async () => {
      const convRes = await request(app)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ itemId: testItem._id.toString() });

      const convId = convRes.body.data.conversation._id;

      // Connect Client A (User A) and Client B (User B)
      const clientA = ioClient(`http://localhost:${port}`, {
        transports: ['websocket'],
        auth: { token: tokenA },
      });

      const clientB = ioClient(`http://localhost:${port}`, {
        transports: ['websocket'],
        auth: { token: tokenB },
      });

      let clientAReceived = false;

      clientA.on('connect', () => {
        clientA.emit('joinConversation', { conversationId: convId });
      });

      clientB.on('connect', () => {
        clientB.emit('joinConversation', { conversationId: convId });
      });

      clientA.on('receiveMessage', ({ message, conversationId }) => {
        expect(conversationId).toBe(convId);
        expect(message.text).toBe('Hey, I think I found your earbuds!');
        expect(message.senderId._id.toString()).toBe(userB._id.toString());
        clientAReceived = true;
        clientA.close();
        clientB.close();
        done();
      });

      // Give sockets a brief moment to establish and join
      setTimeout(() => {
        clientB.emit('sendMessage', {
          conversationId: convId,
          text: 'Hey, I think I found your earbuds!',
        });
      }, 100);
    })();
  });

  test('typing indicator and read receipts', (done) => {
    (async () => {
      const convRes = await request(app)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ itemId: testItem._id.toString() });

      const convId = convRes.body.data.conversation._id;

      const clientA = ioClient(`http://localhost:${port}`, {
        transports: ['websocket'],
        auth: { token: tokenA },
      });

      const clientB = ioClient(`http://localhost:${port}`, {
        transports: ['websocket'],
        auth: { token: tokenB },
      });

      clientA.on('connect', () => {
        clientA.emit('joinConversation', { conversationId: convId });
      });

      clientB.on('connect', () => {
        clientB.emit('joinConversation', { conversationId: convId });
      });

      clientA.on('typing', ({ conversationId, userId }) => {
        expect(conversationId).toBe(convId);
        expect(userId).toBe(userB._id.toString());

        clientA.close();
        clientB.close();
        done();
      });

      setTimeout(() => {
        clientB.emit('typing', { conversationId: convId });
      }, 100);
    })();
  });
});
