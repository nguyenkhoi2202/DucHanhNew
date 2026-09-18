import express, { Request, Response } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb, getRecordsCollection, checkMongoStatus } from './db';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health Check & DB Status
const handleHealth = async (_req: Request, res: Response) => {
  const status = await checkMongoStatus();
  res.json({
    status: status.connected ? 'ok' : 'error',
    ...status,
    isVercel: !!process.env.VERCEL,
    timestamp: new Date().toISOString(),
  });
};

app.get('/api/health', handleHealth);
app.get('/health', handleHealth);

// GET /api/records - Retrieve all records
app.get('/api/records', async (_req: Request, res: Response) => {
  try {
    const collection = await getRecordsCollection();
    const records = await collection
      .find({}, { projection: { _id: 0 } })
      .sort({ visitDate: -1, id: -1 })
      .toArray();
    res.json(records);
  } catch (error: any) {
    console.error('Error fetching records:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch records' });
  }
});

// GET /api/records/:id - Retrieve a single record by id
app.get('/api/records/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const collection = await getRecordsCollection();
    const record = await collection.findOne({ id }, { projection: { _id: 0 } });
    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }
    res.json(record);
  } catch (error: any) {
    console.error('Error fetching record:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch record' });
  }
});

// POST /api/records - Create or Upsert a record
app.post('/api/records', async (req: Request, res: Response) => {
  try {
    const data = req.body;
    if (!data.name) {
      return res.status(400).json({ error: 'Patient name is required' });
    }

    const record = {
      ...data,
      id: data.id ? Number(data.id) : Date.now(),
      updatedAt: new Date().toISOString(),
    };

    const collection = await getRecordsCollection();
    await collection.updateOne(
      { id: record.id },
      { $set: record },
      { upsert: true }
    );

    res.status(201).json({ success: true, data: record });
  } catch (error: any) {
    console.error('Error saving record:', error);
    res.status(500).json({ error: error.message || 'Failed to save record' });
  }
});

// PUT /api/records/:id - Update an existing record
app.put('/api/records/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const data = req.body;
    const collection = await getRecordsCollection();

    const updateDoc = {
      ...data,
      id,
      updatedAt: new Date().toISOString(),
    };

    const result = await collection.updateOne({ id }, { $set: updateDoc }, { upsert: true });
    res.json({ success: true, matchedCount: result.matchedCount, modifiedCount: result.modifiedCount, data: updateDoc });
  } catch (error: any) {
    console.error('Error updating record:', error);
    res.status(500).json({ error: error.message || 'Failed to update record' });
  }
});

// DELETE /api/records/:id - Delete a record
app.delete('/api/records/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const collection = await getRecordsCollection();
    const result = await collection.deleteOne({ id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }
    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (error: any) {
    console.error('Error deleting record:', error);
    res.status(500).json({ error: error.message || 'Failed to delete record' });
  }
});

// DELETE /api/records - Delete all records (Reset database)
app.delete('/api/records', async (_req: Request, res: Response) => {
  try {
    const collection = await getRecordsCollection();
    const result = await collection.deleteMany({});
    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (error: any) {
    console.error('Error clearing records:', error);
    res.status(500).json({ error: error.message || 'Failed to clear records' });
  }
});

// Sync handler
const handleSync = async (req: Request, res: Response) => {
  try {
    const records = req.body;
    if (!Array.isArray(records)) {
      return res.status(400).json({ error: 'Body must be an array of records' });
    }

    const collection = await getRecordsCollection();

    if (records.length === 0) {
      return res.json({ success: true, count: 0 });
    }

    // Bulk upsert each record by its id
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
    res.json({
      success: true,
      upsertedCount: result.upsertedCount,
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount,
      totalReceived: records.length,
    });
  } catch (error: any) {
    console.error('Error syncing records:', error);
    res.status(500).json({ error: error.message || 'Failed to sync records' });
  }
};

app.post('/api/records/sync', handleSync);
app.post('/api/sync', handleSync);

// Import default handler
const handleImportDefault = async (_req: Request, res: Response) => {
  try {
    const candidatePaths = [
      path.resolve(__dirname, '../data/DucHanh-27-08-2024.txt'),
      path.resolve(__dirname, '../../DucHanh-27-08-2024.txt'),
      path.resolve(process.cwd(), 'data/DucHanh-27-08-2024.txt'),
    ];

    let foundPath = '';
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        foundPath = p;
        break;
      }
    }

    if (!foundPath) {
      return res.status(404).json({ error: 'Data file DucHanh-27-08-2024.txt not found on server' });
    }

    const raw = fs.readFileSync(foundPath, 'utf8');
    const records = JSON.parse(raw);

    if (!Array.isArray(records)) {
      return res.status(400).json({ error: 'File does not contain a JSON array' });
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

    res.json({
      success: true,
      message: `Đã nạp thành công ${records.length} hồ sơ vào MongoDB`,
      upsertedCount: result.upsertedCount,
      modifiedCount: result.modifiedCount,
      totalInDatabase: totalCount,
    });
  } catch (error: any) {
    console.error('Error importing default data:', error);
    res.status(500).json({ error: error.message || 'Failed to import default data' });
  }
};

app.post('/api/records/import-default', handleImportDefault);
app.post('/api/import-default', handleImportDefault);

// Serve frontend static build files if dist exists (Production / Docker mode)
const distPath = path.resolve(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req: Request, res: Response, next: any) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

export default app;
