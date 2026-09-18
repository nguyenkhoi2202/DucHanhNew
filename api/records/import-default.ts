import { getRecordsCollection } from '../db';
import defaultRecords from '../../data/defaultRecords.json';

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
    const collection = await getRecordsCollection();
    const bulkOps = (defaultRecords as any[]).map((rec) => ({
      updateOne: {
        filter: { id: rec.id },
        update: { $set: rec },
        upsert: true,
      },
    }));

    const result = await collection.bulkWrite(bulkOps);
    const totalCount = await collection.countDocuments();

    return res.status(200).json({
      success: true,
      message: `Đã nạp thành công ${(defaultRecords as any[]).length} hồ sơ vào MongoDB`,
      upsertedCount: result.upsertedCount,
      modifiedCount: result.modifiedCount,
      totalInDatabase: totalCount,
    });
  } catch (error: any) {
    console.error('API /records/import-default error:', error);
    return res.status(500).json({ error: error.message || 'Failed to import default records' });
  }
}
