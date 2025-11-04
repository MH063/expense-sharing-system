const express = require('express');
const { authenticateToken } = require('../middleware/tokenManager');
const { pool } = require('../config/db');
const { generateSecret, totpVerify, buildOtpAuthURL } = require('../utils/totp');

const router = express.Router();

// 获取当前用户 MFA 状态
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.sub;
    const result = await pool.query('SELECT mfa_enabled FROM users WHERE id = $1', [userId]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: '用户不存在' });
    return res.json({ success: true, data: { mfaEnabled: result.rows[0].mfa_enabled === true } });
  } catch (e) {
    return res.status(500).json({ success: false, message: '查询失败' });
  }
});

// 生成并返回 MFA 设置所需的密钥与 otpauth URL（先写入 secret, mfa_enabled=false）
router.post('/setup', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.sub;
    const secret = generateSecret(20);
    await pool.query('UPDATE users SET mfa_secret = $1, mfa_enabled = FALSE, updated_at = NOW() WHERE id = $2', [secret, userId]);
    const issuer = 'ExpenseSharingSystem';
    const label = req.user.username || `user-${userId}`;
    const otpauth = buildOtpAuthURL({ secret, label, issuer });
    return res.json({ success: true, data: { secret, otpauth } });
  } catch (e) {
    return res.status(500).json({ success: false, message: '生成失败' });
  }
});

// 校验一次 TOTP 并启用 MFA
router.post('/verify', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.sub;
    const { code } = req.body || {};
    if (!code) return res.status(400).json({ success: false, message: '缺少验证码' });
    const result = await pool.query('SELECT mfa_secret FROM users WHERE id = $1', [userId]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: '用户不存在' });
    const secret = result.rows[0].mfa_secret;
    if (!secret) return res.status(400).json({ success: false, message: '请先发起设置' });
    const ok = totpVerify(String(code), secret, { window: 1 });
    if (!ok) return res.status(400).json({ success: false, message: '验证码错误' });
    await pool.query('UPDATE users SET mfa_enabled = TRUE, updated_at = NOW() WHERE id = $1', [userId]);
    return res.json({ success: true, message: 'MFA 已启用' });
  } catch (e) {
    return res.status(500).json({ success: false, message: '验证失败' });
  }
});

// 禁用 MFA（清空 secret）
router.post('/disable', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.sub;
    await pool.query('UPDATE users SET mfa_enabled = FALSE, mfa_secret = NULL, updated_at = NOW() WHERE id = $1', [userId]);
    return res.json({ success: true, message: 'MFA 已禁用' });
  } catch (e) {
    return res.status(500).json({ success: false, message: '禁用失败' });
  }
});

module.exports = router;
