import { MongoClient, Db, Collection } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

export function getMongoUri(): string {
  if (process.env.MONGODB_URI) {
    return process.env.MONGODB_URI.trim();
  }
  // If running on Vercel and MONGODB_URI is not set, don't use 127.0.0.1
  if (process.env.VERCEL) {
    throw new Error('MISSING_MONGODB_URI: Bạn chưa thêm biến môi trường MONGODB_URI trên Vercel Project Settings!');
  }
  return 'mongodb://127.0.0.1:27017/duchanh';
}

export function getDatabaseName(): string {
  if (process.env.MONGODB_DB_NAME) {
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
  const uri = process.env.MONGODB_URI;
  if (!uri && process.env.VERCEL) {
    return {
      connected: false,
      reason: 'MISSING_MONGODB_URI',
      message: 'Chưa cấu hình biến môi trường MONGODB_URI trên Vercel!',
      help: 'Vào Vercel Dashboard -> Project Settings -> Environment Variables -> Thêm MONGODB_URI',
    };
  }

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
