const { MongoClient } = require('mongodb');

const DEFAULT_MONGODB_URI = 'mongodb+srv://khoitn:123@khoitn.el641ab.mongodb.net/duchanh?retryWrites=true&w=majority&appName=khoitn';

function getMongoUri() {
  if (process.env.MONGODB_URI && process.env.MONGODB_URI.trim()) {
    return process.env.MONGODB_URI.trim();
  }
  return DEFAULT_MONGODB_URI;
}

function getMongoClient() {
  const uri = getMongoUri();
  if (!global._mongoClientPromise) {
    const client = new MongoClient(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 8000,
    });
    global._mongoClientPromise = client.connect();
  }
  return global._mongoClientPromise;
}

async function getDb() {
  const c = await getMongoClient();
  return c.db('duchanh');
}

async function getRecordsCollection() {
  const db = await getDb();
  const col = db.collection('records');
  try {
    await col.createIndex({ id: 1 }, { unique: true });
  } catch {}
  return col;
}

async function checkMongoStatus() {
  try {
    const db = await getDb();
    const count = await db.collection('records').countDocuments();
    return {
      connected: true,
      database: db.databaseName,
      recordsCount: count,
    };
  } catch (err) {
    return {
      connected: false,
      reason: 'CONNECTION_FAILED',
      message: err.message,
    };
  }
}

module.exports = {
  getMongoUri,
  getMongoClient,
  getDb,
  getRecordsCollection,
  checkMongoStatus,
};
