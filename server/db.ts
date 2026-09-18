import { MongoClient, Db, Collection } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

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

export function getDatabaseName(): string {
  if (process.env.MONGODB_DB_NAME && process.env.MONGODB_DB_NAME.trim()) {
    return process.env.MONGODB_DB_NAME.trim();
  }
  return 'duchanh';
}

export async function getMongoClient(): Promise<MongoClient> {
  const uri = getMongoUri();

  if (!global._mongoClientPromise) {
    const client = new MongoClient(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 6000,
      connectTimeoutMS: 6000,
    });

    global._mongoClientPromise = client.connect().catch((err) => {
      // Clear cached promise on connection error so subsequent requests can retry
      global._mongoClientPromise = undefined;
      throw err;
    });
  }

  return global._mongoClientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await getMongoClient();
  return client.db(getDatabaseName());
}

export async function getRecordsCollection(): Promise<Collection> {
  const db = await getDb();
  const collection = db.collection('records');
  // Ensure index on numeric id
  try {
    await collection.createIndex({ id: 1 }, { unique: true });
  } catch {
    // Index already exists
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
    let help = 'Vui lòng kiểm tra lại chuỗi kết nối MONGODB_URI.';
    let reason = 'CONNECTION_FAILED';

    if (msg.includes('bad auth') || msg.includes('Authentication failed')) {
      reason = 'AUTH_FAILED';
      help = 'Tài khoản hoặc Mật khẩu trong chuỗi MONGODB_URI không chính xác.';
    } else if (msg.includes('whitelisted') || msg.includes('timeout') || msg.includes('timed out') || msg.includes('selection timed out')) {
      reason = 'IP_NOT_WHITELISTED_OR_TIMEOUT';
      help = 'Không thể kết nối tới MongoDB Atlas. Hãy kiểm tra mục Network Access trên MongoDB Atlas đã thêm IP 0.0.0.0/0 (Allow from anywhere) chưa.';
    }

    return {
      connected: false,
      reason,
      message: err.message,
      help,
    };
  }
}
