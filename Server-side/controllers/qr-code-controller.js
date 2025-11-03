const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const winston = require('winston');
const { authenticateToken } = require('../middleware/auth-middleware');

// 创建日志记录器
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/qr-code-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/qr-code-combined.log' })
  ]
});

/**
 * 收款码管理控制器
 * 处理用户收款码的上传、激活/停用、删除等操作
 */
class QrCodeController {
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    // 确保上传目录存在
    this.uploadDir = path.join(__dirname, '../public/uploads/qr-codes');
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * 上传收款码
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async uploadQrCode(req, res) {
    const client = await this.pool.connect();
    try {
      const { qr_type } = req.body;
      const user_id = req.user.id;
      
      // 验证收款码类型
      if (!qr_type || !['wechat', 'alipay'].includes(qr_type)) {
        return res.status(400).json({
          success: false,
          message: '收款码类型必须是wechat或alipay'
        });
      }
      
      // 检查是否有上传的文件
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: '请上传收款码图片'
        });
      }
      
      // 验证文件类型
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(req.file.mimetype)) {
        // 删除已上传的文件
        fs.unlinkSync(req.file.path);
        return res.status(400).json({
          success: false,
          message: '只支持JPEG、JPG和PNG格式的图片'
        });
      }
      
      // 检查文件大小（限制为5MB）
      if (req.file.size > 5 * 1024 * 1024) {
        // 删除已上传的文件
        fs.unlinkSync(req.file.path);
        return res.status(400).json({
          success: false,
          message: '图片大小不能超过5MB'
        });
      }
      
      // 生成文件名
      const fileName = `${user_id}_${qr_type}_${Date.now()}${path.extname(req.file.originalname)}`;
      const filePath = path.join(this.uploadDir, fileName);
      
      // 移动文件到目标位置
      fs.renameSync(req.file.path, filePath);
      
      // 生成访问URL
      const qr_image_url = `/uploads/qr-codes/${fileName}`;
      
      // 检查用户是否已有同类型的收款码
      const existingQrCode = await client.query(
        'SELECT id FROM user_qr_codes WHERE user_id = $1 AND qr_type = $2',
        [user_id, qr_type]
      );
      
      let qrCode;
      
      if (existingQrCode.rows.length > 0) {
        // 更新现有收款码
        const updateResult = await client.query(
          `UPDATE user_qr_codes 
           SET qr_image_url = $1, is_active = TRUE, updated_at = NOW()
           WHERE id = $2
           RETURNING *`,
          [qr_image_url, existingQrCode.rows[0].id]
        );
        qrCode = updateResult.rows[0];
        
        // 删除旧图片文件
        const oldQrCode = await client.query(
          'SELECT qr_image_url FROM user_qr_codes WHERE id = $1',
          [existingQrCode.rows[0].id]
        );
        
        if (oldQrCode.rows.length > 0 && oldQrCode.rows[0].qr_image_url) {
          const oldFilePath = path.join(__dirname, '../public', oldQrCode.rows[0].qr_image_url);
          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
          }
        }
      } else {
        // 创建新收款码
        const insertResult = await client.query(
          `INSERT INTO user_qr_codes (user_id, qr_type, qr_image_url, is_active, is_default)
           VALUES ($1, $2, $3, TRUE, TRUE)
           RETURNING *`,
          [user_id, qr_type, qr_image_url]
        );
        qrCode = insertResult.rows[0];
      }
      
      logger.info(`用户 ${user_id} 上传了 ${qr_type} 收款码: ${qrCode.id}`);
      
      res.status(201).json({
        success: true,
        data: {
          qr_code: qrCode,
          message: '收款码上传成功'
        }
      });
    } catch (error) {
      // 删除已上传的文件（如果有）
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      logger.error('上传收款码失败:', error);
      res.status(500).json({
        success: false,
        message: '上传收款码失败',
        error: error.message
      });
    } finally {
      client.release();
    }
  }

  /**
   * 获取用户收款码列表
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getUserQrCodes(req, res) {
    const client = await this.pool.connect();
    try {
      const user_id = req.user.id;
      
      const result = await client.query(
        `SELECT id, qr_type, qr_image_url, is_active, is_default, created_at, updated_at
         FROM user_qr_codes
         WHERE user_id = $1
         ORDER BY is_default DESC, created_at DESC`,
        [user_id]
      );
      
      res.status(200).json({
        success: true,
        data: {
          qr_codes: result.rows
        }
      });
    } catch (error) {
      logger.error('获取用户收款码列表失败:', error);
      res.status(500).json({
        success: false,
        message: '获取收款码列表失败',
        error: error.message
      });
    } finally {
      client.release();
    }
  }

  /**
   * 激活/停用收款码
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async toggleQrCodeStatus(req, res) {
    const client = await this.pool.connect();
    try {
      const { id } = req.params;
      const { is_active } = req.body;
      const user_id = req.user.id;
      
      // 验证收款码是否属于当前用户
      const qrCodeCheck = await client.query(
        'SELECT id FROM user_qr_codes WHERE id = $1 AND user_id = $2',
        [id, user_id]
      );
      
      if (qrCodeCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '收款码不存在或无权限访问'
        });
      }
      
      // 更新状态
      const updateResult = await client.query(
        `UPDATE user_qr_codes 
         SET is_active = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [is_active, id]
      );
      
      const qrCode = updateResult.rows[0];
      
      logger.info(`用户 ${user_id} ${is_active ? '激活' : '停用'}了收款码: ${id}`);
      
      res.status(200).json({
        success: true,
        data: {
          qr_code: qrCode,
          message: `收款码已${is_active ? '激活' : '停用'}`
        }
      });
    } catch (error) {
      logger.error('更新收款码状态失败:', error);
      res.status(500).json({
        success: false,
        message: '更新收款码状态失败',
        error: error.message
      });
    } finally {
      client.release();
    }
  }

  /**
   * 设置默认收款码
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async setDefaultQrCode(req, res) {
    const client = await this.pool.connect();
    try {
      const { id } = req.params;
      const user_id = req.user.id;
      
      // 验证收款码是否属于当前用户
      const qrCodeCheck = await client.query(
        'SELECT id, qr_type FROM user_qr_codes WHERE id = $1 AND user_id = $2',
        [id, user_id]
      );
      
      if (qrCodeCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '收款码不存在或无权限访问'
        });
      }
      
      const qr_type = qrCodeCheck.rows[0].qr_type;
      
      await client.query('BEGIN');
      
      // 先取消同类型的其他默认收款码
      await client.query(
        `UPDATE user_qr_codes 
         SET is_default = FALSE, updated_at = NOW()
         WHERE user_id = $1 AND qr_type = $2 AND id != $3`,
        [user_id, qr_type, id]
      );
      
      // 设置新的默认收款码
      const updateResult = await client.query(
        `UPDATE user_qr_codes 
         SET is_default = TRUE, updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [id]
      );
      
      const qrCode = updateResult.rows[0];
      
      await client.query('COMMIT');
      
      logger.info(`用户 ${user_id} 设置了默认${qr_type}收款码: ${id}`);
      
      res.status(200).json({
        success: true,
        data: {
          qr_code: qrCode,
          message: '默认收款码设置成功'
        }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('设置默认收款码失败:', error);
      res.status(500).json({
        success: false,
        message: '设置默认收款码失败',
        error: error.message
      });
    } finally {
      client.release();
    }
  }

  /**
   * 删除收款码
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async deleteQrCode(req, res) {
    const client = await this.pool.connect();
    try {
      const { id } = req.params;
      const user_id = req.user.id;
      
      // 获取收款码信息
      const qrCodeCheck = await client.query(
        'SELECT id, qr_image_url FROM user_qr_codes WHERE id = $1 AND user_id = $2',
        [id, user_id]
      );
      
      if (qrCodeCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '收款码不存在或无权限访问'
        });
      }
      
      const qr_image_url = qrCodeCheck.rows[0].qr_image_url;
      
      // 删除数据库记录
      await client.query('DELETE FROM user_qr_codes WHERE id = $1', [id]);
      
      // 删除图片文件
      if (qr_image_url) {
        const filePath = path.join(__dirname, '../public', qr_image_url);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      
      logger.info(`用户 ${user_id} 删除了收款码: ${id}`);
      
      res.status(200).json({
        success: true,
        message: '收款码删除成功'
      });
    } catch (error) {
      logger.error('删除收款码失败:', error);
      res.status(500).json({
        success: false,
        message: '删除收款码失败',
        error: error.message
      });
    } finally {
      client.release();
    }
  }

  /**
   * 获取用户的默认收款码
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getDefaultQrCode(req, res) {
    const client = await this.pool.connect();
    try {
      const user_id = req.user.id;
      const { qr_type } = req.query;
      
      // 验证收款码类型
      if (!qr_type || !['wechat', 'alipay'].includes(qr_type)) {
        return res.status(400).json({
          success: false,
          message: '收款码类型必须是wechat或alipay'
        });
      }
      
      const result = await client.query(
        `SELECT id, qr_image_url
         FROM user_qr_codes
         WHERE user_id = $1 AND qr_type = $2 AND is_active = TRUE AND is_default = TRUE
         LIMIT 1`,
        [user_id, qr_type]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: `未找到默认的${qr_type}收款码`
        });
      }
      
      res.status(200).json({
        success: true,
        data: {
          qr_code: result.rows[0]
        }
      });
    } catch (error) {
      logger.error('获取默认收款码失败:', error);
      res.status(500).json({
        success: false,
        message: '获取默认收款码失败',
        error: error.message
      });
    } finally {
      client.release();
    }
  }
}

module.exports = new QrCodeController();