import { checkMongoStatus } from './db';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const status = await checkMongoStatus();
  return res.status(200).json({
    name: 'Nha Khoa Duc Hanh API',
    status: status.connected ? 'online' : 'offline',
    ...status,
    isVercel: !!process.env.VERCEL,
    timestamp: new Date().toISOString(),
  });
}
