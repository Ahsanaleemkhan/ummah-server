const bcrypt = require('bcryptjs');
const { getDbOrNull } = require('../config/database');

const memoryUsers = [];

function normalizeUser(record) {
  if (!record) return null;

  const { _id, ...rest } = record;
  return rest;
}

async function getUserCollection() {
  const db = await getDbOrNull();
  if (!db) return null;
  return db.collection('users');
}

async function findUserByEmail(email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) return null;

  const collection = await getUserCollection();
  if (collection) {
    const user = await collection.findOne({ emailLower: normalizedEmail });
    return normalizeUser(user);
  }

  return memoryUsers.find((user) => user.emailLower === normalizedEmail) || null;
}

async function createUser(userPayload) {
  const emailLower = String(userPayload?.email || '').trim().toLowerCase();

  const nextUser = {
    ...userPayload,
    emailLower,
  };

  const collection = await getUserCollection();
  if (collection) {
    await collection.insertOne(nextUser);
    return nextUser;
  }

  memoryUsers.push(nextUser);
  return nextUser;
}

async function buildAdminPasswordHash() {
  const configuredHash = String(process.env.ADMIN_PASSWORD_HASH || '').trim();
  if (configuredHash) {
    return configuredHash;
  }

  const rawAdminPassword = String(process.env.ADMIN_PASSWORD || '').trim();
  if (!rawAdminPassword) {
    return '';
  }

  return bcrypt.hash(rawAdminPassword, 10);
}

async function upsertAdminUserFromEnv() {
  const adminEmail = String(process.env.ADMIN_EMAIL || 'admin@ummahtravel.com').trim().toLowerCase();
  const adminName = String(process.env.ADMIN_NAME || 'Super Admin').trim() || 'Super Admin';
  const now = new Date().toISOString();

  if (!adminEmail) {
    return { seeded: false, reason: 'missing-admin-email' };
  }

  const collection = await getUserCollection();

  if (collection) {
    const existingAdmin = await collection.findOne({ emailLower: adminEmail });

    if (existingAdmin) {
      await collection.updateOne(
        { emailLower: adminEmail },
        {
          $set: {
            id: existingAdmin.id || 'ADM001',
            name: adminName,
            role: 'admin',
            updatedAt: now,
          },
        },
      );

      return { seeded: false, reason: 'already-exists', email: adminEmail };
    }

    const adminPasswordHash = await buildAdminPasswordHash();
    if (!adminPasswordHash) {
      return { seeded: false, reason: 'missing-admin-password' };
    }

    await collection.insertOne({
      id: 'ADM001',
      name: adminName,
      email: adminEmail,
      emailLower: adminEmail,
      password: adminPasswordHash,
      role: 'admin',
      createdAt: now,
      updatedAt: now,
    });

    return { seeded: true, reason: 'created', email: adminEmail };
  }

  const existingMemoryAdmin = memoryUsers.find((user) => user.emailLower === adminEmail);
  if (existingMemoryAdmin) {
    existingMemoryAdmin.name = adminName;
    existingMemoryAdmin.role = 'admin';
    existingMemoryAdmin.updatedAt = now;

    return { seeded: false, reason: 'already-exists', email: adminEmail };
  }

  const adminPasswordHash = await buildAdminPasswordHash();
  if (!adminPasswordHash) {
    return { seeded: false, reason: 'missing-admin-password' };
  }

  memoryUsers.push({
    id: 'ADM001',
    name: adminName,
    email: adminEmail,
    emailLower: adminEmail,
    password: adminPasswordHash,
    role: 'admin',
    createdAt: now,
    updatedAt: now,
  });

  return { seeded: true, reason: 'created', email: adminEmail };
}

module.exports = {
  createUser,
  findUserByEmail,
  upsertAdminUserFromEnv,
};
