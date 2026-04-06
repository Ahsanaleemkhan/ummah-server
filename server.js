const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const { connectMongo, ensureMongoIndexes, getMongoConfig, isMongoConnected } = require('./config/database');

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
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
    console.log(`🗄️  MongoDB connected: ${mongoConfig.uri}/${mongoConfig.dbName}`);
  } else {
    console.warn(`⚠️  MongoDB unavailable (${mongoStatus.reason}). Falling back to JSON file snapshots.`);
  }

  app.listen(PORT, () => {
    console.log(`🚀 Ummah Travel API running on port ${PORT}`);
  });
};

startServer();
