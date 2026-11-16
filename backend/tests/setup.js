const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer;

async function setupTestDB() {
  process.env.NODE_ENV = 'test';
  process.env.PORT = '5099';
  process.env.JWT_SECRET = 'test_jwt_secret_key_12345';
  process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_key_12345';
  process.env.OTP_HMAC_SECRET = 'test_otp_hmac_secret_key_12345';
  process.env.CLIENT_URL = 'http://localhost:5174';
  process.env.DEV_OTP_LOG = 'false';

  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGO_URI = uri;

  await mongoose.connect(uri);
}

async function teardownTestDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
}

async function clearTestDB() {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}

module.exports = {
  setupTestDB,
  teardownTestDB,
  clearTestDB,
};
