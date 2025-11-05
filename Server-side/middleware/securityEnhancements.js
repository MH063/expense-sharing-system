const crypto = require('crypto');
const { getEnvironmentConfig } = require('../config/environment');
const { logger } = require('../config/logger');

const config = getEnvironmentConfig();

function getClientIp(req) {
  const xfwd = req.headers['x-forwarded-for'];
  if (xfwd) {
    const parts = Array.isArray(xfwd) ? xfwd : String(xfwd).split(',');
    return parts[0].trim();
  }
  return req.ip;
}

function verifyRequestSignature(req, res, next) {
  // 跳过健康检查和非 API 端点的签名验证
  if (!config.security.enableRequestSignature || !req.path.startsWith('/api/')) {
    return next();
  }

  const secret = config.security.apiSigningSecret;
  if (!secret) {
    logger.error('请求签名启用但缺少 API_SIGNING_SECRET');
    return res.status(500).json({ success: false, message: '服务器签名配置错误' });
  }

  const signature = req.get('X-Signature');
  const timestamp = req.get('X-Timestamp');
  if (!signature || !timestamp) {
    return res.status(401).json({ success: false, message: '缺少签名或时间戳' });
  }

  const ts = parseInt(timestamp, 10);
  if (!Number.isFinite(ts)) {
    return res.status(400).json({ success: false, message: '无效的时间戳' });
  }

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > config.security.signatureSkewSeconds) {
    return res.status(401).json({ success: false, message: '请求已过期或时间偏差过大' });
  }

  // 构造签名串：method\npath\nquery\nbody\nts
  const method = req.method.toUpperCase();
  const path = req.path;
  const queryRaw = req.originalUrl.includes('?') ? req.originalUrl.split('?')[1] : '';
  const bodyRaw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
  const payload = `${method}\n${path}\n${queryRaw}\n${bodyRaw}\n${ts}`;

  const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const expected = `v1=${hmac}`;

  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
    logger.warn('请求签名校验失败', { ip: getClientIp(req), path: req.path });
    return res.status(401).json({ success: false, message: '签名验证失败' });
  }

  return next();
}

function ipWhitelist(req, res, next) {
  if (!config.security.enableIpWhitelist || !req.path.startsWith('/api/')) {
    return next();
  }

  const whitelist = config.security.ipWhitelist;
  if (!Array.isArray(whitelist) || whitelist.length === 0) {
    logger.error('IP 白名单启用但未配置 IP_WHITELIST');
    return res.status(500).json({ success: false, message: '服务器白名单配置错误' });
  }

  const ip = getClientIp(req);
  if (!whitelist.includes(ip)) {
    logger.warn('IP 不在白名单', { ip, path: req.path });
    return res.status(403).json({ success: false, message: 'IP 不在白名单' });
  }
  return next();
}

module.exports = { verifyRequestSignature, ipWhitelist };
