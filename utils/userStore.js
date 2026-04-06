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

module.exports = {
  createUser,
  findUserByEmail,
};
