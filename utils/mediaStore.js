const fs = require('fs/promises');
const path = require('path');
const { randomUUID } = require('crypto');
const { getDbOrNull } = require('../config/database');
const { readDataFile, writeDataFile } = require('./dataStore');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const MEDIA_FILE = 'admin-media.json';
const MEDIA_COLLECTION = 'media_assets';

function normalizeMediaId(mediaId) {
  return String(mediaId || '').trim();
}

function removeMongoInternalFields(record) {
  if (!record || typeof record !== 'object') {
    return record;
  }

  const { _id, ...rest } = record;
  return rest;
}

async function getMediaCollectionOrNull() {
  const db = await getDbOrNull();
  if (!db) return null;
  return db.collection(MEDIA_COLLECTION);
}

async function ensureUploadsDir() {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
}

async function readMediaRecords() {
  const collection = await getMediaCollectionOrNull();

  if (collection) {
    const mongoRecords = (await collection.find({}).toArray()).map(removeMongoInternalFields);

    if (mongoRecords.length > 0) {
      return mongoRecords;
    }

    const snapshot = await readDataFile(MEDIA_FILE, []);
    if (Array.isArray(snapshot) && snapshot.length > 0) {
      await collection.insertMany(snapshot);
    }

    return Array.isArray(snapshot) ? snapshot : [];
  }

  const snapshot = await readDataFile(MEDIA_FILE, []);
  return Array.isArray(snapshot) ? snapshot : [];
}

async function writeMediaRecords(records) {
  const normalized = Array.isArray(records) ? records : [];
  const collection = await getMediaCollectionOrNull();

  if (collection) {
    await collection.deleteMany({});

    if (normalized.length > 0) {
      await collection.insertMany(normalized);
    }
  }

  await writeDataFile(MEDIA_FILE, normalized);
}

function createPublicUrl(publicBaseUrl, fileName) {
  const base = String(publicBaseUrl || '').replace(/\/$/, '');
  return `${base}/uploads/${fileName}`;
}

function buildStoragePath(fileName) {
  return path.join(UPLOADS_DIR, fileName);
}

function createMediaId() {
  return `MED-${Date.now()}-${randomUUID().slice(0, 8)}`;
}

async function registerMediaAsset({
  file,
  publicBaseUrl,
  actor = null,
  pageKey = '',
  sectionKey = '',
  fieldPath = '',
}) {
  if (!file) {
    const error = new Error('No file provided for media registration.');
    error.statusCode = 400;
    throw error;
  }

  await ensureUploadsDir();

  const mediaId = createMediaId();
  const now = new Date().toISOString();

  const record = {
    id: mediaId,
    fileName: file.filename,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    storagePath: buildStoragePath(file.filename),
    url: createPublicUrl(publicBaseUrl, file.filename),
    pageKey: String(pageKey || '').trim().toLowerCase(),
    sectionKey: String(sectionKey || '').trim(),
    fieldPath: String(fieldPath || '').trim(),
    createdAt: now,
    uploadedBy: actor,
  };

  const records = await readMediaRecords();
  records.unshift(record);
  await writeMediaRecords(records);

  return record;
}

async function listMediaAssets({ query = '', limit = 200 } = {}) {
  const records = await readMediaRecords();
  const normalizedQuery = String(query || '').trim().toLowerCase();
  const normalizedLimit = Math.min(Math.max(Number(limit) || 200, 1), 2000);

  const filtered = normalizedQuery
    ? records.filter((record) => JSON.stringify(record).toLowerCase().includes(normalizedQuery))
    : records;

  return filtered.slice(0, normalizedLimit);
}

async function deleteMediaAsset(mediaId, { silent = false } = {}) {
  const normalizedMediaId = normalizeMediaId(mediaId);
  if (!normalizedMediaId) {
    const error = new Error('mediaId is required.');
    error.statusCode = 400;
    throw error;
  }

  const records = await readMediaRecords();
  const index = records.findIndex((record) => String(record.id) === normalizedMediaId);

  if (index === -1) {
    if (silent) return null;

    const error = new Error(`Media ${normalizedMediaId} not found.`);
    error.statusCode = 404;
    throw error;
  }

  const [deleted] = records.splice(index, 1);
  await writeMediaRecords(records);

  try {
    if (deleted.storagePath) {
      await fs.unlink(deleted.storagePath);
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  return deleted;
}

module.exports = {
  UPLOADS_DIR,
  ensureUploadsDir,
  registerMediaAsset,
  listMediaAssets,
  deleteMediaAsset,
};
