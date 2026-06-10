import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

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

// CORS setup - allow local Vite dev server and custom origins
app.use(cors({
  origin: '*', // Allow all in local/development. Customize for production.
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Setup static file serving for local upload fallbacks
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_PATH = path.join(__dirname, '../uploads');
app.use('/uploads', express.static(UPLOADS_PATH));

// Mount APIs
app.use('/api/auth', authRouter);
app.use('/api/preferences', preferencesRouter);
app.use('/api/memories', memoriesRouter);
app.use('/api/events', eventsRouter);
app.use('/api/wishlist', wishlistRouter);
app.use('/api/couple', coupleRouter);

// Debug route to log frontend errors
app.post('/api/debug/log', (req, res) => {
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

// Start listening
app.listen(PORT, '0.0.0.0', () => {
  console.log(`============================================`);
  console.log(`💖 Couples Memory Server is running on port ${PORT}`);
  console.log(`👉 http://localhost:${PORT}`);
  console.log(`============================================`);
});
