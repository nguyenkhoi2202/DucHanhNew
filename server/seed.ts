import { getDb } from './db';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runSeed() {
  const candidatePaths = [
    path.resolve(__dirname, '../data/DucHanh-27-08-2024.txt'),
    path.resolve(__dirname, '../../DucHanh-27-08-2024.txt'),
  ];

  let dataPath = '';
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      dataPath = p;
      break;
    }
  }

  if (!dataPath) {
    console.error('File data DucHanh-27-08-2024.txt not found!');
    process.exit(1);
  }

  console.log(`Đang đọc dữ liệu từ: ${dataPath}...`);
  const raw = fs.readFileSync(dataPath, 'utf8');
  const records = JSON.parse(raw);

  if (!Array.isArray(records)) {
    console.error('File data không phải là danh sách (array)!');
    process.exit(1);
  }

  console.log(`Tìm thấy ${records.length} hồ sơ trong file.`);
  console.log('Đang kết nối đến MongoDB...');

  const db = await getDb();
  const collection = db.collection('records');

  // Create unique index
  await collection.createIndex({ id: 1 }, { unique: true });

  console.log('Đang nạp dữ liệu vào MongoDB (upsert)...');
  const bulkOps = records.map((rec) => ({
    updateOne: {
      filter: { id: rec.id },
      update: { $set: rec },
      upsert: true,
    },
  }));

  const result = await collection.bulkWrite(bulkOps);
  console.log('--- KẾT QUẢ NẠP DỮ LIỆU ---');
  console.log(`Tổng số hồ sơ trong file: ${records.length}`);
  console.log(`Đã chèn mới (upserted): ${result.upsertedCount}`);
  console.log(`Đã cập nhật (modified): ${result.modifiedCount}`);
  console.log(`Khớp (matched): ${result.matchedCount}`);
  const totalInDb = await collection.countDocuments();
  console.log(`Tổng số hồ sơ hiện có trong MongoDB: ${totalInDb}`);
  console.log('Hoàn thành nạp dữ liệu thành công!');
  process.exit(0);
}

runSeed().catch((err) => {
  console.error('Lỗi khi nạp dữ liệu vào MongoDB:', err);
  process.exit(1);
});
