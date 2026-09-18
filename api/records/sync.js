const { getRecordsCollection } = require('../_db.js');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const records = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!Array.isArray(records)) {
      return res.status(400).json({ error: 'Body must be an array of records' });
    }

    const collection = await getRecordsCollection();

    if (records.length === 0) {
      return res.json({ success: true, count: 0 });
    }

    const bulkOps = records.map((rec) => {
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
      totalReceived: records.length,
    });
  } catch (error) {
    console.error('API /records/sync error:', error);
    return res.status(500).json({ error: error.message || 'Failed to sync records' });
  }
};
