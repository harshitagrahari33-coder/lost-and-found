const mongoose = require('mongoose');

async function connectDB(mongoUri) {
  try {
    const conn = await mongoose.connect(mongoUri, {
      autoIndex: true,
    });
    return conn;
  } catch (err) {
    console.error('[DB] MongoDB connection failed:', err.message);
    throw err;
  }
}

async function disconnectDB() {
  await mongoose.disconnect();
}

module.exports = {
  connectDB,
  disconnectDB,
};
