import { checkMongoStatus } from './db';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const status = await checkMongoStatus();
    return res.status(200).json({
      status: status.connected ? 'ok' : 'error',
      ...status,
      isVercel: true,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return res.status(200).json({
      status: 'error',
      connected: false,
      error: err.message || 'Lỗi kiểm tra kết nối',
      isVercel: true,
    });
  }
}
