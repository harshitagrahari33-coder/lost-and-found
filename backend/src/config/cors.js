/**
 * Centralized CORS Configuration
 * Supports:
 * - Localhost / 127.0.0.1 on any port (for local dev on ports 5173, 5174, 5175, etc.)
 * - Explicit origins defined in CLIENT_URL or FRONTEND_URL (supports single URL or comma-separated list)
 * - Public ngrok tunnels (*.ngrok-free.dev, *.ngrok-free.app, *.ngrok.io, *.ngrok.app)
 * - Non-browser requests (!origin) such as mobile native clients, cURL, Postman
 */

function isOriginAllowed(origin) {
  if (!origin) return true;

  const cleanOrigin = origin.trim().replace(/\/+$/, '');

  // 1. Explicitly configured origins in environment (CLIENT_URL or FRONTEND_URL)
  const envOrigins = [
    ...(process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',') : []),
    ...(process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : []),
  ]
    .map((url) => url.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  if (envOrigins.includes(cleanOrigin)) {
    return true;
  }

  // 2. Localhost, 127.0.0.1, and private LAN IP ranges on any port (for mobile/laptop testing on Wi-Fi)
  if (
    /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(
      cleanOrigin
    )
  ) {
    return true;
  }

  // 3. ngrok tunnel domains (for public mobile/remote testing)
  if (/^https?:\/\/[a-z0-9-]+\.(ngrok-free\.dev|ngrok-free\.app|ngrok\.io|ngrok\.app)(:\d+)?$/i.test(cleanOrigin)) {
    return true;
  }

  return false;
}

const corsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      return callback(null, true);
    }
    // Deny origin without using wildcard '*' when credentials are true
    callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Set-Cookie'],
  maxAge: 86400, // Cache preflight for 24 hours
};

module.exports = {
  isOriginAllowed,
  corsOptions,
};
