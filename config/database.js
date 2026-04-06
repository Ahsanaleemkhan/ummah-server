const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'ummah_travel_local';
const USE_MONGODB = String(process.env.USE_MONGODB || 'true').toLowerCase() !== 'false';

let cachedClient = null;
let cachedDb = null;
let lastConnectionFailureAt = 0;

async function connectMongo() {
  if (!USE_MONGODB) {
    return { connected: false, reason: 'MongoDB usage disabled via USE_MONGODB=false' };
  }

  if (cachedDb) {
    return { connected: true, db: cachedDb };
  }

  const now = Date.now();
  if (lastConnectionFailureAt && now - lastConnectionFailureAt < 3000) {
    return { connected: false, reason: 'MongoDB connection cooling down after recent failure' };
  }

  try {
    if (!cachedClient) {
      cachedClient = new MongoClient(MONGODB_URI, {
        serverSelectionTimeoutMS: 2500,
      });
    }

    await cachedClient.connect();
    cachedDb = cachedClient.db(MONGODB_DB_NAME);

    return { connected: true, db: cachedDb };
  } catch (error) {
    cachedDb = null;
    lastConnectionFailureAt = Date.now();

    return {
      connected: false,
      reason: error.message,
      error,
    };
  }
}

async function getDbOrNull() {
  const status = await connectMongo();
  return status.connected ? status.db : null;
}

async function ensureMongoIndexes() {
  const db = await getDbOrNull();
  if (!db) return;

  await db.collection('users').createIndex({ emailLower: 1 }, { unique: true });
}

function getMongoConfig() {
  return {
    uri: MONGODB_URI,
    dbName: MONGODB_DB_NAME,
    enabled: USE_MONGODB,
  };
}

function isMongoConnected() {
  return Boolean(cachedDb);
}

module.exports = {
  connectMongo,
  ensureMongoIndexes,
  getDbOrNull,
  getMongoConfig,
  isMongoConnected,
};
