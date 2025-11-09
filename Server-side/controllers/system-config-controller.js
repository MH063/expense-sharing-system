const { pool } = require('../config/db');

class SystemConfigController {
  static async getConfig(req, res) {
    try {
      const result = await pool.query('SELECT key, value, updated_at, updated_by FROM system_config');
      const config = {};
      for (const row of result.rows) config[row.key] = row.value;
      res.success(200, '获取系统配置成功', config);
    } catch (err) {
      console.error('读取系统配置失败:', err);
      res.error(500, '服务器内部错误');
    }
  }

  static async updateConfig(req, res) {
    try {
      const entries = Object.entries(req.body || {});
      if (entries.length === 0) return res.error(400, '更新内容不能为空');
      for (const [key, value] of entries) {
        await pool.query(
          'INSERT INTO system_config(key, value, updated_by, updated_at) VALUES ($1, $2, $3, NOW()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = NOW()',
          [key, JSON.stringify(value), req.user.sub]
        );
      }
      res.success(200, '已更新系统配置');
    } catch (err) {
      console.error('更新系统配置失败:', err);
      res.error(500, '服务器内部错误');
    }
  }
}

module.exports = SystemConfigController;
