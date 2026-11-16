const http = require('http');
const { Server } = require('socket.io');
const { env } = require('./config/env');
const { connectDB } = require('./config/db');
const app = require('./app');
const { initChatSocket } = require('./sockets/chatSocket');

async function startServer() {
  try {
    // 1. Connect Database
    await connectDB(env.MONGO_URI);
    console.log('[DB] Connected to MongoDB database');

    // 2. Create HTTP Server
    const server = http.createServer(app);

    const { corsOptions } = require('./config/cors');

    // 3. Initialize Socket.IO
    const io = new Server(server, {
      cors: corsOptions,
    });

    initChatSocket(io);

    // 4. Start Listening
    const PORT = env.PORT || 5001;
    const HOST = env.HOST || process.env.HOST || '0.0.0.0';
    server.listen(PORT, HOST, () => {
      console.log(`🚀 [SERVER] Backend API running on http://${HOST}:${PORT} [${env.NODE_ENV}]`);
      console.log(`🌐 [SERVER] Configured client origin: ${env.CLIENT_URL}`);
      const hasResend = Boolean(env.RESEND_API_KEY);
      const hasSmtp = Boolean(env.SMTP_USER && env.SMTP_PASSWORD);
      const emailStatus = hasResend
        ? 'resend (configured)'
        : (hasSmtp ? 'smtp (configured)' : 'not configured');
      console.log(`📧 [EMAIL] Email provider: ${emailStatus}`);
      if (env.DEV_OTP_LOG && env.NODE_ENV !== 'production') {
        console.log(`⚠️  [DEV] DEV_OTP_LOG is enabled. OTPs will print to server logs.`);
      }
    });

    // Graceful shutdown handling
    const shutdown = () => {
      console.log('\n[SERVER] Gracefully shutting down...');
      server.close(() => {
        console.log('[SERVER] Closed remaining connections.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

    return { server, io };
  } catch (err) {
    console.error('[FATAL] Failed to start backend server:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer };
