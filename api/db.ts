import { MongoClient, Db, Collection } from 'mongodb';

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

const DEFAULT_MONGODB_URI = 'mongodb+srv://khoitn:123@khoitn.el641ab.mongodb.net/duchanh?retryWrites=true&w=majority&appName=khoitn';

export function getMongoUri(): string {
  if (process.env.MONGODB_URI && process.env.MONGODB_URI.trim()) {
    return process.env.MONGODB_URI.trim();
  }
  return DEFAULT_MONGODB_URI;
}

export async function getMongoClient(): Promise<MongoClient> {
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

export async function getDb(): Promise<Db> {
  const client = await getMongoClient();
  return client.db('duchanh');
}

export async function getRecordsCollection(): Promise<Collection> {
  const db = await getDb();
  const collection = db.collection('records');
  try {
    await collection.createIndex({ id: 1 }, { unique: true });
  } catch {
    // index exists
  }
  return collection;
}

export async function checkMongoStatus() {
  try {
    const db = await getDb();
    const count = await db.collection('records').countDocuments();
    return {
      connected: true,
      database: db.databaseName,
      recordsCount: count,
    };
  } catch (err: any) {
    const msg = err.message || '';
    let reason = 'CONNECTION_FAILED';
    let help = 'Vui lòng kiểm tra lại kết nối MongoDB.';
    if (msg.includes('bad auth') || msg.includes('Authentication failed')) {
      reason = 'AUTH_FAILED';
      help = 'Tài khoản hoặc Mật khẩu trong chuỗi MONGODB_URI không chính xác.';
    } else if (msg.includes('whitelisted') || msg.includes('timeout') || msg.includes('timed out')) {
      reason = 'IP_NOT_WHITELISTED_OR_TIMEOUT';
      help = 'Không thể kết nối tới MongoDB Atlas. Hãy kiểm tra Network Access trên Atlas đã có 0.0.0.0/0 chưa.';
    }

    return {
      connected: false,
      reason,
      message: err.message,
      help,
    };
  }
}
