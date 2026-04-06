const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const { connectMongo, ensureMongoIndexes, getMongoConfig, isMongoConnected } = require('./config/database');
const { upsertAdminUserFromEnv } = require('./utils/userStore');

const app = express();
const DEFAULT_CORS_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000'];

const parseCorsOrigins = () => {
  const rawOrigins = String(process.env.CORS_ORIGINS || '').trim();

  if (!rawOrigins) {
    return DEFAULT_CORS_ORIGINS;
  }

  return rawOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
};

const corsOrigins = parseCorsOrigins();
const allowAllCorsOrigins = corsOrigins.includes('*');
const corsCredentials = String(process.env.CORS_CREDENTIALS || 'true').toLowerCase() !== 'false';

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (allowAllCorsOrigins || corsOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(null, false);
  },
  credentials: corsCredentials,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/flights', require('./routes/flights'));
app.use('/api/hotels', require('./routes/hotels'));
app.use('/api/umrah', require('./routes/umrah'));
app.use('/api/tours', require('./routes/tours'));
app.use('/api/visas', require('./routes/visas'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/content', require('./routes/content'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Ummah Travel API is running',
    storage: isMongoConnected() ? 'mongodb' : 'json-fallback',
  });
});

// Error handling middleware
app.use(require('./middleware/errorHandler'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  const mongoConfig = getMongoConfig();
  const mongoStatus = await connectMongo();

  if (mongoStatus.connected) {
    await ensureMongoIndexes();
    const adminSeedStatus = await upsertAdminUserFromEnv();

    if (adminSeedStatus.seeded) {
      console.log(`👤 Admin user seeded: ${adminSeedStatus.email}`);
    } else if (adminSeedStatus.reason === 'already-exists') {
      console.log(`👤 Admin user already exists: ${adminSeedStatus.email}`);
    } else {
      console.warn(`⚠️  Admin seeding skipped (${adminSeedStatus.reason})`);
    }

    console.log(`🗄️  MongoDB connected: ${mongoConfig.uri}/${mongoConfig.dbName}`);
  } else {
    console.warn(`⚠️  MongoDB unavailable (${mongoStatus.reason}). Falling back to JSON file snapshots.`);
  }

  app.listen(PORT, () => {
    const corsValue = allowAllCorsOrigins ? '*' : corsOrigins.join(', ');

    console.log(`🌐 CORS origins: ${corsValue}`);
    console.log(`🚀 Ummah Travel API running on port ${PORT}`);
  });
};

startServer();
