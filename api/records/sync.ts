import { getRecordsCollection } from '../db';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    const rawRecords = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!Array.isArray(rawRecords)) {
      return res.status(400).json({ error: 'Body must be an array of records' });
    }

    const collection = await getRecordsCollection();

    if (rawRecords.length === 0) {
      return res.status(200).json({ success: true, count: 0 });
    }

    const bulkOps = rawRecords.map((rec) => {
      const doc = {
        ...rec,
        id: rec.id ? Number(rec.id) : Date.now(),
        updatedAt: new Date().toISOString(),
      };
      return {
        updateOne: {
          filter: { id: doc.id },
          update: { $set: doc },
          upsert: true,
        },
      };
    });

    const result = await collection.bulkWrite(bulkOps);
    return res.status(200).json({
      success: true,
      upsertedCount: result.upsertedCount,
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount,
      totalReceived: rawRecords.length,
    });
  } catch (error: any) {
    console.error('API /records/sync error:', error);
    return res.status(500).json({ error: error.message || 'Database error during sync' });
  }
}
