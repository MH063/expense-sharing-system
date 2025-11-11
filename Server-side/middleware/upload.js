const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../config/logger');
const { checkFileContent, strictFileTypeValidation } = require('./fileSecurity');

/**
 * 确保上传目录存在
 */
const ensureUploadDir = (dir) => {
  if (!require('fs').existsSync(dir)) {
    require('fs').mkdirSync(dir, { recursive: true });
    logger.info(`创建上传目录: ${dir}`);
  }
};

/**
 * 收据文件上传存储配置
 */
const receiptStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../public/uploads/receipts');
    ensureUploadDir(uploadDir);
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // 使用UUID生成唯一文件名，保留原始文件扩展名
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  }
});

/**
 * 收据文件过滤器
 * 加强文件类型验证，同时检查MIME类型和文件扩展名
 */
const receiptFileFilter = (req, file, cb) => {
  // 允许的文件类型
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];
  
  // 允许的文件扩展名
  const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.pdf'];
  
  // 检查MIME类型
  const isMimeTypeAllowed = allowedTypes.includes(file.mimetype);
  
  // 检查文件扩展名
  const ext = path.extname(file.originalname).toLowerCase();
  const isExtAllowed = allowedExts.includes(ext);

  if (isMimeTypeAllowed && isExtAllowed) {
    cb(null, true);
  } else {
    logger.warn('不支持的文件类型上传尝试', {
      mimetype: file.mimetype,
      extension: ext,
      originalname: file.originalname,
      ip: req.ip,
      user: req.user ? req.user.id : '未认证'
    });
    cb(new Error('只允许上传图片文件(JPG, PNG, GIF) 或PDF文件'), false);
  }
};

/**
 * 创建收据上传中间件
 */
const uploadReceipt = multer({
  storage: receiptStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB限制
  },
  fileFilter: receiptFileFilter
});

/**
 * 通用文件上传存储配置（用于其他文件）
 */
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../public/uploads');
    ensureUploadDir(uploadDir);
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  }
});

/**
 * 通用文件过滤器
 * 加强文件类型验证，同时检查MIME类型和文件扩展名
 */
const fileFilter = (req, file, cb) => {
  // 允许的文件扩展名和对应的MIME类型
  const allowedTypes = {
    '.jpg': ['image/jpeg'],
    '.jpeg': ['image/jpeg'],
    '.png': ['image/png'],
    '.gif': ['image/gif'],
    '.pdf': ['application/pdf'],
    '.doc': ['application/msword'],
    '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  };
  
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedMimeTypes = allowedTypes[ext];

  // 检查扩展名是否被允许
  if (!allowedMimeTypes) {
    logger.warn('不支持的文件扩展名上传尝试', {
      extension: ext,
      originalname: file.originalname,
      ip: req.ip,
      user: req.user ? req.user.id : '未认证'
    });
    cb(new Error(`不支持的文件类型: ${ext}`), false);
    return;
  }

  // 检查MIME类型是否匹配
  if (!allowedMimeTypes.includes(file.mimetype)) {
    logger.warn('文件MIME类型与扩展名不匹配', {
      extension: ext,
      mimetype: file.mimetype,
      originalname: file.originalname,
      ip: req.ip,
      user: req.user ? req.user.id : '未认证'
    });
    cb(new Error(`文件类型 ${file.mimetype} 与扩展名 ${ext} 不匹配`), false);
    return;
  }

  cb(null, true);
};

/**
 * 创建通用文件上传中间件
 */
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB限制
  },
  fileFilter
});

/**
 * 处理文件上传错误的中间件
 */
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Multer错误（文件大小限制等）
    logger.error('Multer上传错误', {
      error: err.message,
      code: err.code,
      field: err.field,
      ip: req.ip,
      user: req.user ? req.user.id : '未认证'
    });
    
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        message: '文件大小超过限制(最大5MB)'
      });
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(413).json({
        success: false,
        message: '文件数量超过限制'
      });
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: '意外的文件字段'
      });
    }
    
    return res.status(400).json({
      success: false,
      message: `文件上传错误: ${err.message}`
    });
  } else if (err) {
    // 其他错误
    logger.error('文件上传处理错误', {
      error: err.message,
      stack: err.stack,
      ip: req.ip,
      user: req.user ? req.user.id : '未认证'
    });
    
    return res.status(400).json({
      success: false,
      message: err.message || '文件上传失败'
    });
  }
  
  next();
};

/**
 * 记录文件上传成功的中间件
 */
const logUploadSuccess = (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    // 如果响应成功且包含文件信息
    if (res.statusCode >= 200 && res.statusCode < 300 && req.file) {
      logger.info('文件上传成功', {
        filename: req.file.filename,
        originalname: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        destination: req.file.destination,
        ip: req.ip,
        user: req.user ? req.user.id : '未认证'
      });
    }
    
    originalSend.call(this, data);
  };
  
  next();
};

module.exports = {
  uploadReceipt,
  upload,
  handleUploadError,
  logUploadSuccess,
  checkFileContent,
  strictFileTypeValidation
};