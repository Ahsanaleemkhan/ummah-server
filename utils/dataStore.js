const fs = require('fs/promises');
const path = require('path');
const { getDbOrNull } = require('../config/database');

const DATA_DIR = path.join(__dirname, '..', 'data');

const RESOURCE_FILE_MAP = Object.freeze({
  flights: 'flights.json',
  hotels: 'hotels.json',
  tours: 'tours.json',
  umrah: 'umrah.json',
  visas: 'visas.json',
});

const RESOURCE_COLLECTION_MAP = Object.freeze({
  flights: 'flights',
  hotels: 'hotels',
  tours: 'tours',
  umrah: 'umrah_packages',
  visas: 'visa_catalog',
});

const RESOURCE_ID_PREFIX = Object.freeze({
  flights: 'FL',
  hotels: 'HT',
  tours: 'TR',
  umrah: 'UM',
  visas: 'VS',
});

function normalizeResourceKey(resource) {
  return String(resource || '').toLowerCase().trim();
}

function resolveResourceFile(resource) {
  const normalized = normalizeResourceKey(resource);
  const fileName = RESOURCE_FILE_MAP[normalized];

  if (!fileName) {
    const error = new Error(`Unsupported resource: ${resource}`);
    error.statusCode = 400;
    throw error;
  }

  return fileName;
}

async function getResourceCollection(resource) {
  const normalized = normalizeResourceKey(resource);
  const collectionName = RESOURCE_COLLECTION_MAP[normalized];

  if (!collectionName) {
    return null;
  }

  const db = await getDbOrNull();
  if (!db) {
    return null;
  }

  return db.collection(collectionName);
}

function removeMongoInternalFields(record) {
  if (!record || typeof record !== 'object') {
    return record;
  }

  const { _id, ...rest } = record;
  return rest;
}

async function readDataFile(fileName, fallbackValue = null) {
  const fullPath = path.join(DATA_DIR, fileName);

  try {
    const content = await fs.readFile(fullPath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    if (error.code === 'ENOENT' && fallbackValue !== null) {
      return fallbackValue;
    }

    throw error;
  }
}

async function writeDataFile(fileName, value) {
  const fullPath = path.join(DATA_DIR, fileName);
  const serialized = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(fullPath, serialized, 'utf8');
}

async function readResource(resource) {
  const normalized = normalizeResourceKey(resource);
  const fileName = resolveResourceFile(resource);
  const collection = await getResourceCollection(normalized);

  if (collection) {
    const mongoRecords = (await collection.find({}).toArray()).map(removeMongoInternalFields);

    if (mongoRecords.length > 0) {
      return mongoRecords;
    }

    // Seed MongoDB from existing JSON files on first run for local development.
    const seedRecords = await readDataFile(fileName, []);

    if (!Array.isArray(seedRecords)) {
      const error = new Error(`Data file ${fileName} is not an array`);
      error.statusCode = 500;
      throw error;
    }

    if (seedRecords.length > 0) {
      await collection.insertMany(seedRecords);
    }

    return seedRecords;
  }

  const records = await readDataFile(fileName, []);

  if (!Array.isArray(records)) {
    const error = new Error(`Data file ${fileName} is not an array`);
    error.statusCode = 500;
    throw error;
  }

  return records;
}

async function writeResource(resource, data) {
  if (!Array.isArray(data)) {
    const error = new Error('Resource payload must be an array');
    error.statusCode = 400;
    throw error;
  }

  const normalized = normalizeResourceKey(resource);
  const fileName = resolveResourceFile(resource);
  const collection = await getResourceCollection(normalized);

  if (collection) {
    await collection.deleteMany({});

    if (data.length > 0) {
      await collection.insertMany(data);
    }
  }

  // Keep file snapshot updated as local backup.
  await writeDataFile(fileName, data);
}

function createResourceId(resource, currentRecords = []) {
  const normalized = String(resource || '').toLowerCase().trim();
  const prefix = RESOURCE_ID_PREFIX[normalized] || normalized.slice(0, 2).toUpperCase();

  const maxNumericId = currentRecords.reduce((highest, record) => {
    const rawId = String(record?.id || '');
    const match = rawId.match(/(\d+)$/);

    if (!match) {
      return highest;
    }

    const value = Number(match[1]);
    return Number.isNaN(value) ? highest : Math.max(highest, value);
  }, 0);

  return `${prefix}${String(maxNumericId + 1).padStart(3, '0')}`;
}

module.exports = {
  RESOURCE_COLLECTION_MAP,
  RESOURCE_FILE_MAP,
  createResourceId,
  readDataFile,
  readResource,
  writeDataFile,
  writeResource,
};
