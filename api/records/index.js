const { getRecordsCollection } = require('../_db.js');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const collection = await getRecordsCollection();

    // GET: Return all records
    if (req.method === 'GET') {
      const records = await collection
        .find({}, { projection: { _id: 0 } })
        .sort({ visitDate: -1, id: -1 })
        .toArray();
      return res.status(200).json(records);
    }

    // POST: Create or upsert a single record
    if (req.method === 'POST') {
      const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (!data || !data.name) {
        return res.status(400).json({ error: 'Patient name is required' });
      }

      const record = {
        ...data,
        id: data.id ? Number(data.id) : Date.now(),
        updatedAt: new Date().toISOString(),
      };

      await collection.updateOne(
        { id: record.id },
        { $set: record },
        { upsert: true }
      );

      return res.status(201).json({ success: true, data: record });
    }

    // DELETE: Delete all records (reset database)
    if (req.method === 'DELETE') {
      const result = await collection.deleteMany({});
      return res.status(200).json({ success: true, deletedCount: result.deletedCount });
    }

    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  } catch (error) {
    console.error('API /records error:', error);
    return res.status(500).json({ error: error.message || 'Database error' });
  }
};
