const fs = require('fs').promises;
const { logger } = require('../config/logger');

/**
 * 文件安全检查中间件
 * 提供文件内容检查和更严格的文件类型验证
 */

/**
 * 文件类型魔数映射表
 * 用于验证文件的真实类型
 */
const FILE_SIGNATURES = {
  // 图片格式
  'image/jpeg': {
    signatures: [
      [0xFF, 0xD8, 0xFF, 0xE0],
      [0xFF, 0xD8, 0xFF, 0xE1],
      [0xFF, 0xD8, 0xFF, 0xE2],
      [0xFF, 0xD8, 0xFF, 0xE3],
      [0xFF, 0xD8, 0xFF, 0xE8]
    ],
    extensions: ['.jpg', '.jpeg']
  },
  'image/png': {
    signatures: [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
    extensions: ['.png']
  },
  'image/gif': {
    signatures: [
      [0x47, 0x49, 0x46, 0x38, 0x37, 0x61],
      [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]
    ],
    extensions: ['.gif']
  },
  'image/webp': {
    signatures: [[0x52, 0x49, 0x46, 0x46]],
    extensions: ['.webp']
  },
  'image/bmp': {
    signatures: [[0x42, 0x4D]],
    extensions: ['.bmp']
  },
  'image/tiff': {
    signatures: [
      [0x49, 0x49, 0x2A, 0x00],
      [0x4D, 0x4D, 0x00, 0x2A]
    ],
    extensions: ['.tiff', '.tif']
  },
  // 文档格式
  'application/pdf': {
    signatures: [[0x25, 0x50, 0x44, 0x46]],
    extensions: ['.pdf']
  },
  'application/msword': {
    signatures: [[0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]],
    extensions: ['.doc']
  },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
    signatures: [[0x50, 0x4B, 0x03, 0x04]],
    extensions: ['.docx']
  },
  'application/vnd.ms-excel': {
    signatures: [[0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]],
    extensions: ['.xls']
  },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
    signatures: [[0x50, 0x4B, 0x03, 0x04]],
    extensions: ['.xlsx']
  },
  'application/vnd.ms-powerpoint': {
    signatures: [[0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]],
    extensions: ['.ppt']
  },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': {
    signatures: [[0x50, 0x4B, 0x03, 0x04]],
    extensions: ['.pptx']
  },
  // 文本格式
  'text/plain': {
    signatures: [],
    extensions: ['.txt']
  },
  'text/csv': {
    signatures: [],
    extensions: ['.csv']
  },
  // 压缩格式
  'application/zip': {
    signatures: [[0x50, 0x4B, 0x03, 0x04]],
    extensions: ['.zip']
  },
  'application/x-rar-compressed': {
    signatures: [[0x52, 0x61, 0x72, 0x21, 0x1A, 0x07, 0x00]],
    extensions: ['.rar']
  }
};

// 允许的MIME类型列表
const ALLOWED_MIME_TYPES = Object.keys(FILE_SIGNATURES);

// 允许的文件扩展名列表
const ALLOWED_EXTENSIONS = Object.values(FILE_SIGNATURES).flatMap(info => info.extensions);

/**
 * 检查文件内容是否与声明的MIME类型匹配
 * @param {Buffer} fileBuffer - 文件内容缓冲区
 * @param {string} mimeType - 声明的MIME类型
 * @returns {boolean} - 是否匹配
 */
function validateFileContent(fileBuffer, mimeType) {
  const signatureInfo = FILE_SIGNATURES[mimeType];
  
  if (!signatureInfo) {
    logger.warn(`未找到MIME类型 ${mimeType} 的签名信息`);
    return false;
  }
  
  // 对于没有签名的文件类型（如纯文本），直接返回true
  if (signatureInfo.signatures.length === 0) {
    return true;
  }
  
  // 检查文件签名
  for (const signature of signatureInfo.signatures) {
    let matches = true;
    for (let i = 0; i < signature.length; i++) {
      if (fileBuffer[i] !== signature[i]) {
        matches = false;
        break;
      }
    }
    if (matches) {
      return true;
    }
  }
  
  return false;
}

/**
 * 读取文件头部内容
 * @param {string} filePath - 文件路径
 * @param {number} bytes - 读取字节数
 * @returns {Promise<Buffer>} - 文件头部内容
 */
async function readFileHeader(filePath, bytes = 256) {
  try {
    const fileHandle = await fs.open(filePath, 'r');
    const buffer = Buffer.alloc(bytes);
    await fileHandle.read(buffer, 0, bytes, 0);
    await fileHandle.close();
    return buffer;
  } catch (error) {
    logger.error('读取文件头部失败:', error);
    throw new Error('文件读取失败');
  }
}

/**
 * 文件内容检查中间件
 * 在文件上传后检查文件的真实内容
 */
async function checkFileContent(req, res, next) {
  try {
    // 如果没有上传文件，直接继续
    if (!req.file) {
      return next();
    }
    
    // 记录开始检查
    logger.info('开始文件内容检查', {
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      user: req.user ? req.user.id : '未认证'
    });
    
    // 检查MIME类型是否在允许列表中
    if (!ALLOWED_MIME_TYPES.includes(req.file.mimetype)) {
      // 删除不合法的文件
      try {
        await fs.unlink(req.file.path);
        logger.warn('文件MIME类型不被允许，已删除文件', {
          filename: req.file.originalname,
          declaredMime: req.file.mimetype,
          user: req.user ? req.user.id : '未认证'
        });
      } catch (unlinkError) {
        logger.error('删除非法文件失败:', unlinkError);
      }
      
      return res.status(400).json({
        success: false,
        message: `不支持的文件类型: ${req.file.mimetype}`
      });
    }
    
    // 读取文件头部内容（增加到256字节以更好地检查文件签名）
    const fileHeader = await readFileHeader(req.file.path, 256);
    
    // 验证文件内容是否与声明的MIME类型匹配
    const isContentValid = validateFileContent(fileHeader, req.file.mimetype);
    
    if (!isContentValid) {
      // 删除不合法的文件
      try {
        await fs.unlink(req.file.path);
        logger.warn('文件内容检查失败，已删除文件', {
          filename: req.file.originalname,
          declaredMime: req.file.mimetype,
          user: req.user ? req.user.id : '未认证'
        });
      } catch (unlinkError) {
        logger.error('删除非法文件失败:', unlinkError);
      }
      
      return res.status(400).json({
        success: false,
        message: '文件内容与声明类型不匹配，上传被拒绝'
      });
    }
    
    // 文件内容检查通过
    logger.info('文件内容检查通过', {
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      user: req.user ? req.user.id : '未认证'
    });
    
    next();
  } catch (error) {
    logger.error('文件内容检查过程中发生错误:', error);
    
    // 删除可能存在问题的文件
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        logger.error('删除问题文件失败:', unlinkError);
      }
    }
    
    return res.status(500).json({
      success: false,
      message: '文件安全检查失败'
    });
  }
}

/**
 * 更严格的文件类型验证中间件
 * 结合扩展名、MIME类型和文件内容进行验证
 */
function strictFileTypeValidation(req, res, next) {
  try {
    // 如果没有上传文件，直接继续
    if (!req.file) {
      return next();
    }
    
    // 获取文件扩展名
    const ext = getFileExtension(req.file.originalname).toLowerCase();
    
    // 检查扩展名是否在允许列表中
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      logger.warn('文件扩展名不被允许', {
        filename: req.file.originalname,
        extension: ext,
        user: req.user ? req.user.id : '未认证'
      });
      
      // 删除文件
      try {
        fs.unlinkSync(req.file.path);
      } catch (error) {
        logger.error('删除非法文件失败:', error);
      }
      
      return res.status(400).json({
        success: false,
        message: `不支持的文件扩展名: ${ext}`
      });
    }
    
    // 获取MIME类型对应的扩展名
    const mimeTypeInfo = FILE_SIGNATURES[req.file.mimetype];
    
    // 检查扩展名是否匹配MIME类型
    if (mimeTypeInfo && !mimeTypeInfo.extensions.includes(ext)) {
      logger.warn('文件扩展名与MIME类型不匹配', {
        filename: req.file.originalname,
        extension: ext,
        mimetype: req.file.mimetype,
        expectedExtensions: mimeTypeInfo.extensions,
        user: req.user ? req.user.id : '未认证'
      });
      
      // 删除文件
      try {
        fs.unlinkSync(req.file.path);
      } catch (error) {
        logger.error('删除非法文件失败:', error);
      }
      
      return res.status(400).json({
        success: false,
        message: `文件扩展名 ${ext} 与声明的文件类型不匹配`
      });
    }
    
    next();
  } catch (error) {
    logger.error('文件类型验证过程中发生错误:', error);
    
    // 删除可能存在问题的文件
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        logger.error('删除问题文件失败:', unlinkError);
      }
    }
    
    return res.status(500).json({
      success: false,
      message: '文件类型验证失败'
    });
  }
}

/**
 * 获取文件扩展名
 * @param {string} filename - 文件名
 * @returns {string} - 文件扩展名
 */
function getFileExtension(filename) {
  const lastDotIndex = filename.lastIndexOf('.');
  return lastDotIndex > 0 ? filename.substring(lastDotIndex) : '';
}

/**
 * 检查文件是否包含恶意内容
 * @param {Buffer} fileBuffer - 文件内容缓冲区
 * @returns {boolean} - 是否包含恶意内容
 */
function checkForMaliciousContent(fileBuffer) {
  // 检查常见的恶意内容模式
  const maliciousPatterns = [
    /<script/i,
    /javascript:/i,
    /vbscript:/i,
    /onload=/i,
    /onerror=/i,
    /eval\s*\(/i,
    /document\.cookie/i,
    /window\.location/i
  ];
  
  const content = fileBuffer.toString('utf8');
  
  for (const pattern of maliciousPatterns) {
    if (pattern.test(content)) {
      return true;
    }
  }
  
  return false;
}

/**
 * 高级文件内容检查中间件
 * 包含恶意内容检测
 */
async function advancedFileContentCheck(req, res, next) {
  try {
    // 如果没有上传文件，直接继续
    if (!req.file) {
      return next();
    }
    
    // 只对文本类型的文件进行恶意内容检查
    if (req.file.mimetype.startsWith('text/')) {
      const fileContent = await fs.readFile(req.file.path);
      
      if (checkForMaliciousContent(fileContent)) {
        // 删除包含恶意内容的文件
        try {
          await fs.unlink(req.file.path);
          logger.warn('检测到文件包含恶意内容，已删除文件', {
            filename: req.file.originalname,
            user: req.user ? req.user.id : '未认证'
          });
        } catch (unlinkError) {
          logger.error('删除恶意文件失败:', unlinkError);
        }
        
        return res.status(400).json({
          success: false,
          message: '文件包含不安全内容，上传被拒绝'
        });
      }
    }
    
    next();
  } catch (error) {
    logger.error('高级文件内容检查过程中发生错误:', error);
    
    // 删除可能存在问题的文件
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        logger.error('删除问题文件失败:', unlinkError);
      }
    }
    
    return res.status(500).json({
      success: false,
      message: '文件安全检查失败'
    });
  }
}

module.exports = {
  checkFileContent,
  strictFileTypeValidation,
  advancedFileContentCheck,
  validateFileContent,
  readFileHeader,
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS
};