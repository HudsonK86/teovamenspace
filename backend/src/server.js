import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';

// Load environment variables
dotenv.config();

// Route imports
import authRouter from './routes/auth.js';
import preferencesRouter from './routes/preferences.js';
import memoriesRouter from './routes/memories.js';
import eventsRouter from './routes/events.js';
import wishlistRouter from './routes/wishlist.js';
import coupleRouter from './routes/couple.js';

const app = express();
const PORT = process.env.PORT || 5001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Rate limiting configuration
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 auth attempts per window (more forgiving for testing/setup)
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again later' }
});

// Disable global rate limiter for private couples app to prevent browsing/image loading blocks
// app.use(globalLimiter);

// CORS setup - restrict origins based on environment
const getCorsOrigins = () => {
  if (NODE_ENV === 'production') {
    // In production, use explicit allowed origins from env var
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || [];
    if (allowedOrigins.length === 0) {
      console.warn('⚠️ WARNING: ALLOWED_ORIGINS not set in production! Using restrictive fallback.');
      return false; // Deny all in production if not configured
    }
    return allowedOrigins;
  }
  // In development, allow localhost origins (including alternative Vite ports)
  return ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174', 'http://127.0.0.1:5175', 'http://127.0.0.1:3000'];
};

// Get allowed origins for CSP headers
const getAllowedOriginsForCSP = () => {
  if (NODE_ENV === 'production') {
    const origins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || [];
    return origins.join(' ');
  }
  return "http://localhost:5001 http://localhost:5173 http://localhost:5174 http://localhost:5175 http://localhost:3000";
};

app.use(cors({
  origin: getCorsOrigins(),
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Security headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", getAllowedOriginsForCSP(), "https://api.dicebear.com"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "http://localhost:5001", "https://oauth2.googleapis.com"],
      fontSrc: ["'self'", "data:"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable if you use external images
}));

// Body parsing middleware with size limits
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Setup static file serving for local upload fallbacks
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_PATH = path.join(__dirname, '../uploads');
app.use('/uploads', express.static(UPLOADS_PATH, {
  setHeaders: (res) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));

// Apply auth rate limiter only to Google login endpoint to prevent brute-forcing
app.use('/api/auth/google', authLimiter);

// Mount APIs
app.use('/api/auth', authRouter);
app.use('/api/preferences', preferencesRouter);
app.use('/api/memories', memoriesRouter);
app.use('/api/events', eventsRouter);
app.use('/api/wishlist', wishlistRouter);
app.use('/api/couple', coupleRouter);

// Debug route to log frontend errors (restricted to localhost in production)
app.post('/api/debug/log', (req, res) => {
  // Only allow from localhost in production
  if (NODE_ENV === 'production' && req.ip !== '127.0.0.1' && req.ip !== '::1' && req.ip !== '::ffff:127.0.0.1') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  try {
    const logMsg = `[${new Date().toISOString()}] ${JSON.stringify(req.body)}\n`;
    fs.appendFileSync(path.join(__dirname, '../frontend_errors.log'), logMsg);
    console.log("FRONTEND DEBUG LOG:", req.body);
  } catch (err) {
    console.error("Failed to write debug log:", err);
  }
  res.sendStatus(200);
});

// Basic health check route
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.stack || err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// Start listening - bind to all interfaces for external access
const HOST = '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`============================================`);
  console.log(`💖 Couples Memory Server is running on port ${PORT}`);
  console.log(`👉 http://0.0.0.0:${PORT}`);
  console.log(`🔒 Security: Rate limiting enabled`);
  console.log(`🔒 Security: Helmet headers enabled`);
  console.log(`🔒 Security: CORS restricted to ${NODE_ENV === 'production' ? 'configured origins' : 'localhost'}`);
  console.log(`============================================`);
});
