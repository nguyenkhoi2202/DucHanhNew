const { getRecordsCollection } = require('../_db.js');
const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    let records = null;
    try {
      records = require('../../data/defaultRecords.json');
    } catch {
      const candidatePaths = [
        path.resolve(__dirname, '../../data/defaultRecords.json'),
        path.resolve(__dirname, '../../data/DucHanh-27-08-2024.txt'),
        path.resolve(process.cwd(), 'data/defaultRecords.json'),
        path.resolve(process.cwd(), 'data/DucHanh-27-08-2024.txt'),
      ];
      for (const p of candidatePaths) {
        if (fs.existsSync(p)) {
          records = JSON.parse(fs.readFileSync(p, 'utf8'));
          break;
        }
      }
    }

    if (!Array.isArray(records)) {
      return res.status(404).json({ error: 'Default data file not found or invalid' });
    }

    const collection = await getRecordsCollection();
    const bulkOps = records.map((rec) => ({
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
      message: `Đã nạp thành công ${records.length} hồ sơ vào MongoDB`,
      upsertedCount: result.upsertedCount,
      modifiedCount: result.modifiedCount,
      totalInDatabase: totalCount,
    });
  } catch (error) {
    console.error('API /records/import-default error:', error);
    return res.status(500).json({ error: error.message || 'Failed to import default data' });
  }
};
