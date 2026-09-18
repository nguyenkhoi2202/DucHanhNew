import app from './app';
import { getDb } from './db';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 5001;

async function start() {
  // Test connection to MongoDB
  try {
    const db = await getDb();
    console.log(`[MongoDB] Successfully connected to database "${db.databaseName}"`);
    const count = await db.collection('records').countDocuments();
    console.log(`[MongoDB] Current records count: ${count}`);

    // If empty, auto-seed from DucHanh-27-08-2024.txt if available
    if (count === 0) {
      const dataPath = path.resolve(__dirname, '../data/DucHanh-27-08-2024.txt');
      if (fs.existsSync(dataPath)) {
        console.log(`[Seed] Database is empty. Auto-seeding initial data from ${dataPath}...`);
        const raw = fs.readFileSync(dataPath, 'utf8');
        const records = JSON.parse(raw);
        if (Array.isArray(records) && records.length > 0) {
          const bulkOps = records.map((rec) => ({
            updateOne: {
              filter: { id: rec.id },
              update: { $set: rec },
              upsert: true,
            },
          }));
          await db.collection('records').bulkWrite(bulkOps);
          console.log(`[Seed] Successfully seeded ${records.length} records into MongoDB!`);
        }
      }
    }
  } catch (err: any) {
    console.warn(`[MongoDB Warning] Could not connect to MongoDB: ${err.message}`);
    console.warn(`[MongoDB Tip] If running locally, make sure MongoDB is running (e.g. 'docker compose up -d')`);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Express API server running at http://localhost:${PORT}`);
  });
}

start();
