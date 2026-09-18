import { getRecordsCollection } from '../../server/db';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const id = Number(req.query.id);
  if (!id || isNaN(id)) {
    return res.status(400).json({ error: 'Valid numeric record ID is required' });
  }

  try {
    const collection = await getRecordsCollection();

    if (req.method === 'GET') {
      const record = await collection.findOne({ id }, { projection: { _id: 0 } });
      if (!record) {
        return res.status(404).json({ error: 'Record not found' });
      }
      return res.status(200).json(record);
    }

    if (req.method === 'PUT') {
      const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const updateDoc = {
        ...data,
        id,
        updatedAt: new Date().toISOString(),
      };
      await collection.updateOne({ id }, { $set: updateDoc }, { upsert: true });
      return res.status(200).json({ success: true, data: updateDoc });
    }

    if (req.method === 'DELETE') {
      const result = await collection.deleteOne({ id });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Record not found' });
      }
      return res.status(200).json({ success: true, deletedCount: result.deletedCount });
    }

    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  } catch (error: any) {
    console.error(`API /records/${id} error:`, error);
    return res.status(500).json({ error: error.message || 'Database error' });
  }
}
