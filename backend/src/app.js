require('./config/env');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const { globalLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const ApiError = require('./utils/ApiError');

// Routes
const authRoutes = require('./routes/authRoutes');
const itemRoutes = require('./routes/itemRoutes');
const chatRoutes = require('./routes/chatRoutes');
const reportRoutes = require('./routes/reportRoutes');
const locationRoutes = require('./routes/locationRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// Trust proxy for rate limiting & secure cookies behind reverse proxies (Render, Railway, etc.)
app.set('trust proxy', 1);

// Security headers with Helmet - allow cross-origin resource sharing for API consumption
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

const { corsOptions } = require('./config/cors');
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Body parsing with safe size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// NoSQL injection prevention
app.use(
  mongoSanitize({
    allowDots: true,
    replaceWith: '_',
  })
);

// Rate limiting
app.use(globalLimiter);

// Root & Health check endpoints
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Lost and Found API is running',
    version: '1.0.0',
    status: 'healthy',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      items: '/api/items',
      conversations: '/api/conversations',
      reports: '/api/reports',
      locations: '/api/locations',
      admin: '/api/admin',
    },
  });
});

app.get('/api', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Lost and Found API root',
    health: '/api/health',
  });
});

app.get('/api/health', (req, res) => {
  const hasResend = Boolean(process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim());
  const hasSmtp = Boolean(process.env.SMTP_USER && process.env.SMTP_PASSWORD);
  res.status(200).json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    diagnostics: {
      emailProvider: hasResend ? 'resend' : (hasSmtp ? 'smtp' : 'none'),
      resendConfigured: hasResend,
      smtpConfigured: hasSmtp,
    },
  });
});

// Mount modular API routers
app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/conversations', chatRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/admin', adminRoutes);

// 404 Route handler
app.use('*', (req, res, next) => {
  next(ApiError.notFound(`Endpoint ${req.originalUrl} not found`, 'ENDPOINT_NOT_FOUND'));
});

// Centralized error handler
app.use(errorHandler);

module.exports = app;
