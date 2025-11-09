const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { 
  SystemInfo, 
  Announcement, 
  HelpDocument, 
  Feedback, 
  CommonLink, 
  UploadFile,
  ImportHistory,
  User
} = require('../models');
const { sequelize } = require('../models');

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    // 允许的文件类型
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|txt|zip|rar/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('只允许上传图片、文档和压缩包文件'));
    }
  }
});

/**
 * 获取系统信息
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.getSystemInfo = async (req, res) => {
  try {
    console.log('获取系统信息');
    
    // 获取系统基本信息
    const systemInfo = await SystemInfo.findOne({
      where: { isActive: true },
      order: [['updatedAt', 'DESC']]
    });

    // 如果没有系统信息，创建默认信息
    if (!systemInfo) {
      const defaultInfo = {
        systemName: '记账系统',
        version: '1.0.0',
        description: '一个简单的记账管理系统',
        contactEmail: 'admin@example.com',
        isActive: true
      };
      
      const newInfo = await SystemInfo.create(defaultInfo);
      return res.json({
        success: true,
        data: newInfo
      });
    }

    res.json({
      success: true,
      data: systemInfo
    });
  } catch (error) {
    console.error('获取系统信息失败:', error);
    res.status(500).json({
      success: false,
      message: '获取系统信息失败',
      error: error.message
    });
  }
};

/**
 * 获取应用版本信息
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.getVersionInfo = async (req, res) => {
  try {
    console.log('获取版本信息');
    
    // 从package.json读取版本信息
    const packagePath = path.join(__dirname, '../package.json');
    let versionInfo = {
      version: '1.0.0',
      name: '记账系统',
      description: '一个简单的记账管理系统'
    };
    
    if (fs.existsSync(packagePath)) {
      const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      versionInfo = {
        version: packageData.version || '1.0.0',
        name: packageData.name || '记账系统',
        description: packageData.description || '一个简单的记账管理系统'
      };
    }

    res.json({
      success: true,
      data: versionInfo
    });
  } catch (error) {
    console.error('获取版本信息失败:', error);
    res.status(500).json({
      success: false,
      message: '获取版本信息失败',
      error: error.message
    });
  }
};

/**
 * 上传文件
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.uploadFile = async (req, res) => {
  try {
    console.log('上传文件');
    
    upload.single('file')(req, res, async (err) => {
      if (err) {
        console.error('文件上传失败:', err);
        return res.status(400).json({
          success: false,
          message: '文件上传失败',
          error: err.message
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: '没有上传文件'
        });
      }

      // 保存文件信息到数据库
      const fileInfo = await UploadFile.create({
        originalName: req.file.originalname,
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size,
        mimetype: req.file.mimetype,
        uploadedBy: req.user.id,
        uploadTime: new Date()
      });

      res.json({
        success: true,
        data: {
          id: fileInfo.id,
          originalName: fileInfo.originalName,
          filename: fileInfo.filename,
          size: fileInfo.size,
          mimetype: fileInfo.mimetype,
          uploadTime: fileInfo.uploadTime,
          url: `/api/other/uploads/download/${fileInfo.id}`
        }
      });
    });
  } catch (error) {
    console.error('文件上传失败:', error);
    res.status(500).json({
      success: false,
      message: '文件上传失败',
      error: error.message
    });
  }
};

/**
 * 获取上传文件列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.getUploadList = async (req, res) => {
  try {
    console.log('获取上传文件列表');
    
    const { page = 1, limit = 20, mimetype, search } = req.query;
    const offset = (page - 1) * limit;
    
    // 构建查询条件
    const whereCondition = {};
    
    if (mimetype) {
      whereCondition.mimetype = { [Op.like]: `%${mimetype}%` };
    }
    
    if (search) {
      whereCondition[Op.or] = [
        { originalName: { [Op.like]: `%${search}%` } },
        { filename: { [Op.like]: `%${search}%` } }
      ];
    }
    
    const { count, rows } = await UploadFile.findAndCountAll({
      where: whereCondition,
      include: [
        {
          model: User,
          as: 'uploader',
          attributes: ['id', 'username', 'nickname']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['uploadTime', 'DESC']]
    });
    
    res.json({
      success: true,
      data: {
        files: rows,
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('获取上传文件列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取上传文件列表失败',
      error: error.message
    });
  }
};

/**
 * 删除上传的文件
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.deleteUpload = async (req, res) => {
  try {
    console.log('删除上传文件');
    
    const { fileId } = req.params;
    
    // 查找文件信息
    const file = await UploadFile.findByPk(fileId);
    
    if (!file) {
      return res.status(404).json({
        success: false,
        message: '文件不存在'
      });
    }
    
    // 删除物理文件
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    
    // 删除数据库记录
    await file.destroy();
    
    res.json({
      success: true,
      message: '文件删除成功'
    });
  } catch (error) {
    console.error('删除文件失败:', error);
    res.status(500).json({
      success: false,
      message: '删除文件失败',
      error: error.message
    });
  }
};

/**
 * 获取系统公告
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.getAnnouncements = async (req, res) => {
  try {
    console.log('获取系统公告');
    
    const { page = 1, limit = 10, isActive } = req.query;
    const offset = (page - 1) * limit;
    
    // 构建查询条件
    const whereCondition = {};
    
    if (isActive !== undefined) {
      whereCondition.isActive = isActive === 'true';
    }
    
    const { count, rows } = await Announcement.findAndCountAll({
      where: whereCondition,
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'nickname']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['isPinned', 'DESC'], ['createdAt', 'DESC']]
    });
    
    res.json({
      success: true,
      data: {
        announcements: rows,
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('获取系统公告失败:', error);
    res.status(500).json({
      success: false,
      message: '获取系统公告失败',
      error: error.message
    });
  }
};

/**
 * 获取公告详情
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.getAnnouncementDetail = async (req, res) => {
  try {
    console.log('获取公告详情');
    
    const { announcementId } = req.params;
    
    const announcement = await Announcement.findByPk(announcementId, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'nickname']
        }
      ]
    });
    
    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: '公告不存在'
      });
    }
    
    res.json({
      success: true,
      data: announcement
    });
  } catch (error) {
    console.error('获取公告详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取公告详情失败',
      error: error.message
    });
  }
};

/**
 * 创建公告
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.createAnnouncement = async (req, res) => {
  try {
    console.log('创建公告');
    
    const { title, content, isPinned = false, isActive = true } = req.body;
    
    // 验证必填字段
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: '标题和内容不能为空'
      });
    }
    
    const announcement = await Announcement.create({
      title,
      content,
      isPinned,
      isActive,
      createdBy: req.user.id
    });
    
    // 获取创建后的公告详情
    const newAnnouncement = await Announcement.findByPk(announcement.id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'nickname']
        }
      ]
    });
    
    res.status(201).json({
      success: true,
      data: newAnnouncement,
      message: '公告创建成功'
    });
  } catch (error) {
    console.error('创建公告失败:', error);
    res.status(500).json({
      success: false,
      message: '创建公告失败',
      error: error.message
    });
  }
};

/**
 * 更新公告
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.updateAnnouncement = async (req, res) => {
  try {
    console.log('更新公告');
    
    const { announcementId } = req.params;
    const { title, content, isPinned, isActive } = req.body;
    
    // 查找公告
    const announcement = await Announcement.findByPk(announcementId);
    
    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: '公告不存在'
      });
    }
    
    // 更新公告
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (isPinned !== undefined) updateData.isPinned = isPinned;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    await announcement.update(updateData);
    
    // 获取更新后的公告详情
    const updatedAnnouncement = await Announcement.findByPk(announcementId, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'nickname']
        }
      ]
    });
    
    res.json({
      success: true,
      data: updatedAnnouncement,
      message: '公告更新成功'
    });
  } catch (error) {
    console.error('更新公告失败:', error);
    res.status(500).json({
      success: false,
      message: '更新公告失败',
      error: error.message
    });
  }
};

/**
 * 删除公告
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.deleteAnnouncement = async (req, res) => {
  try {
    console.log('删除公告');
    
    const { announcementId } = req.params;
    
    // 查找公告
    const announcement = await Announcement.findByPk(announcementId);
    
    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: '公告不存在'
      });
    }
    
    // 删除公告
    await announcement.destroy();
    
    res.json({
      success: true,
      message: '公告删除成功'
    });
  } catch (error) {
    console.error('删除公告失败:', error);
    res.status(500).json({
      success: false,
      message: '删除公告失败',
      error: error.message
    });
  }
};

/**
 * 获取帮助文档列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.getHelpDocuments = async (req, res) => {
  try {
    console.log('获取帮助文档列表');
    
    const { page = 1, limit = 20, category, search } = req.query;
    const offset = (page - 1) * limit;
    
    // 构建查询条件
    const whereCondition = { isActive: true };
    
    if (category) {
      whereCondition.category = category;
    }
    
    if (search) {
      whereCondition[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { content: { [Op.like]: `%${search}%` } }
      ];
    }
    
    const { count, rows } = await HelpDocument.findAndCountAll({
      where: whereCondition,
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'nickname']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['category', 'ASC'], ['order', 'ASC'], ['title', 'ASC']]
    });
    
    res.json({
      success: true,
      data: {
        documents: rows,
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('获取帮助文档列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取帮助文档列表失败',
      error: error.message
    });
  }
};

/**
 * 获取帮助文档详情
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.getHelpDocumentDetail = async (req, res) => {
  try {
    console.log('获取帮助文档详情');
    
    const { docId } = req.params;
    
    const document = await HelpDocument.findByPk(docId, {
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'nickname']
        }
      ]
    });
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: '帮助文档不存在'
      });
    }
    
    res.json({
      success: true,
      data: document
    });
  } catch (error) {
    console.error('获取帮助文档详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取帮助文档详情失败',
      error: error.message
    });
  }
};

/**
 * 搜索帮助文档
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.searchHelpDocuments = async (req, res) => {
  try {
    console.log('搜索帮助文档');
    
    const { keyword, category } = req.query;
    
    // 构建查询条件
    const whereCondition = { isActive: true };
    
    if (category) {
      whereCondition.category = category;
    }
    
    if (keyword) {
      whereCondition[Op.or] = [
        { title: { [Op.like]: `%${keyword}%` } },
        { content: { [Op.like]: `%${keyword}%` } },
        { tags: { [Op.like]: `%${keyword}%` } }
      ];
    }
    
    const documents = await HelpDocument.findAll({
      where: whereCondition,
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'nickname']
        }
      ],
      limit: 50,
      order: [['category', 'ASC'], ['order', 'ASC'], ['title', 'ASC']]
    });
    
    res.json({
      success: true,
      data: documents
    });
  } catch (error) {
    console.error('搜索帮助文档失败:', error);
    res.status(500).json({
      success: false,
      message: '搜索帮助文档失败',
      error: error.message
    });
  }
};

/**
 * 获取反馈列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.getFeedbackList = async (req, res) => {
  try {
    console.log('获取反馈列表');
    
    const { page = 1, limit = 20, status, type, search } = req.query;
    const offset = (page - 1) * limit;
    
    // 构建查询条件
    const whereCondition = {};
    
    if (status) {
      whereCondition.status = status;
    }
    
    if (type) {
      whereCondition.type = type;
    }
    
    if (search) {
      whereCondition[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { content: { [Op.like]: `%${search}%` } }
      ];
    }
    
    const { count, rows } = await Feedback.findAndCountAll({
      where: whereCondition,
      include: [
        {
          model: User,
          as: 'submitter',
          attributes: ['id', 'username', 'nickname']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });
    
    res.json({
      success: true,
      data: {
        feedbacks: rows,
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('获取反馈列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取反馈列表失败',
      error: error.message
    });
  }
};

/**
 * 提交反馈
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.submitFeedback = async (req, res) => {
  try {
    console.log('提交反馈');
    
    const { title, content, type = 'suggestion' } = req.body;
    
    // 验证必填字段
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: '标题和内容不能为空'
      });
    }
    
    const feedback = await Feedback.create({
      title,
      content,
      type,
      status: 'pending',
      submittedBy: req.user.id
    });
    
    // 获取创建后的反馈详情
    const newFeedback = await Feedback.findByPk(feedback.id, {
      include: [
        {
          model: User,
          as: 'submitter',
          attributes: ['id', 'username', 'nickname']
        }
      ]
    });
    
    res.status(201).json({
      success: true,
      data: newFeedback,
      message: '反馈提交成功'
    });
  } catch (error) {
    console.error('提交反馈失败:', error);
    res.status(500).json({
      success: false,
      message: '提交反馈失败',
      error: error.message
    });
  }
};

/**
 * 获取反馈详情
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.getFeedbackDetail = async (req, res) => {
  try {
    console.log('获取反馈详情');
    
    const { feedbackId } = req.params;
    
    const feedback = await Feedback.findByPk(feedbackId, {
      include: [
        {
          model: User,
          as: 'submitter',
          attributes: ['id', 'username', 'nickname']
        }
      ]
    });
    
    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: '反馈不存在'
      });
    }
    
    // 检查权限：只有提交者和管理员可以查看
    if (feedback.submittedBy !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '没有权限查看此反馈'
      });
    }
    
    res.json({
      success: true,
      data: feedback
    });
  } catch (error) {
    console.error('获取反馈详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取反馈详情失败',
      error: error.message
    });
  }
};

/**
 * 回复反馈
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.replyFeedback = async (req, res) => {
  try {
    console.log('回复反馈');
    
    const { feedbackId } = req.params;
    const { reply, status } = req.body;
    
    // 查找反馈
    const feedback = await Feedback.findByPk(feedbackId);
    
    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: '反馈不存在'
      });
    }
    
    // 更新反馈
    const updateData = {};
    if (reply !== undefined) updateData.reply = reply;
    if (status !== undefined) updateData.status = status;
    updateData.repliedBy = req.user.id;
    updateData.repliedAt = new Date();
    
    await feedback.update(updateData);
    
    // 获取更新后的反馈详情
    const updatedFeedback = await Feedback.findByPk(feedbackId, {
      include: [
        {
          model: User,
          as: 'submitter',
          attributes: ['id', 'username', 'nickname']
        }
      ]
    });
    
    res.json({
      success: true,
      data: updatedFeedback,
      message: '反馈回复成功'
    });
  } catch (error) {
    console.error('回复反馈失败:', error);
    res.status(500).json({
      success: false,
      message: '回复反馈失败',
      error: error.message
    });
  }
};

/**
 * 获取常用链接
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.getCommonLinks = async (req, res) => {
  try {
    console.log('获取常用链接');
    
    const { category } = req.query;
    
    // 构建查询条件
    const whereCondition = { isActive: true };
    
    if (category) {
      whereCondition.category = category;
    }
    
    const links = await CommonLink.findAll({
      where: whereCondition,
      order: [['order', 'ASC'], ['title', 'ASC']]
    });
    
    res.json({
      success: true,
      data: links
    });
  } catch (error) {
    console.error('获取常用链接失败:', error);
    res.status(500).json({
      success: false,
      message: '获取常用链接失败',
      error: error.message
    });
  }
};

/**
 * 创建常用链接
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.createCommonLink = async (req, res) => {
  try {
    console.log('创建常用链接');
    
    const { title, url, description, category = 'general', order = 0, isActive = true } = req.body;
    
    // 验证必填字段
    if (!title || !url) {
      return res.status(400).json({
        success: false,
        message: '标题和链接不能为空'
      });
    }
    
    const link = await CommonLink.create({
      title,
      url,
      description,
      category,
      order,
      isActive,
      createdBy: req.user.id
    });
    
    res.status(201).json({
      success: true,
      data: link,
      message: '常用链接创建成功'
    });
  } catch (error) {
    console.error('创建常用链接失败:', error);
    res.status(500).json({
      success: false,
      message: '创建常用链接失败',
      error: error.message
    });
  }
};

/**
 * 更新常用链接
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.updateCommonLink = async (req, res) => {
  try {
    console.log('更新常用链接');
    
    const { linkId } = req.params;
    const { title, url, description, category, order, isActive } = req.body;
    
    // 查找链接
    const link = await CommonLink.findByPk(linkId);
    
    if (!link) {
      return res.status(404).json({
        success: false,
        message: '常用链接不存在'
      });
    }
    
    // 更新链接
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (url !== undefined) updateData.url = url;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (order !== undefined) updateData.order = order;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    await link.update(updateData);
    
    res.json({
      success: true,
      data: link,
      message: '常用链接更新成功'
    });
  } catch (error) {
    console.error('更新常用链接失败:', error);
    res.status(500).json({
      success: false,
      message: '更新常用链接失败',
      error: error.message
    });
  }
};

/**
 * 删除常用链接
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.deleteCommonLink = async (req, res) => {
  try {
    console.log('删除常用链接');
    
    const { linkId } = req.params;
    
    // 查找链接
    const link = await CommonLink.findByPk(linkId);
    
    if (!link) {
      return res.status(404).json({
        success: false,
        message: '常用链接不存在'
      });
    }
    
    // 删除链接
    await link.destroy();
    
    res.json({
      success: true,
      message: '常用链接删除成功'
    });
  } catch (error) {
    console.error('删除常用链接失败:', error);
    res.status(500).json({
      success: false,
      message: '删除常用链接失败',
      error: error.message
    });
  }
};

/**
 * 导出数据
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.exportData = async (req, res) => {
  try {
    console.log('导出数据');
    
    const { type, startDate, endDate } = req.query;
    
    // 根据类型导出不同数据
    let data;
    let filename;
    
    switch (type) {
      case 'users':
        data = await User.findAll({
          attributes: ['id', 'username', 'nickname', 'email', 'role', 'isActive', 'createdAt']
        });
        filename = 'users_export.json';
        break;
      case 'rooms':
        const { Room } = require('../models');
        data = await Room.findAll();
        filename = 'rooms_export.json';
        break;
      case 'payments':
        const { Payment } = require('../models');
        data = await Payment.findAll({
          where: startDate && endDate ? {
            createdAt: {
              [Op.between]: [new Date(startDate), new Date(endDate)]
            }
          } : {}
        });
        filename = 'payments_export.json';
        break;
      default:
        return res.status(400).json({
          success: false,
          message: '不支持的导出类型'
        });
    }
    
    // 设置响应头
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    
    // 发送数据
    res.send(JSON.stringify({
      success: true,
      exportTime: new Date().toISOString(),
      type,
      count: data.length,
      data
    }, null, 2));
  } catch (error) {
    console.error('导出数据失败:', error);
    res.status(500).json({
      success: false,
      message: '导出数据失败',
      error: error.message
    });
  }
};

/**
 * 导入数据
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.importData = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    console.log('导入数据');
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '没有上传文件'
      });
    }
    
    // 读取文件内容
    const fileContent = fs.readFileSync(req.file.path, 'utf8');
    const importData = JSON.parse(fileContent);
    
    const { type, data } = importData;
    let importCount = 0;
    let errors = [];
    
    // 根据类型导入不同数据
    switch (type) {
      case 'users':
        for (const userData of data) {
          try {
            await User.create({
              username: userData.username,
              password: userData.password || 'defaultPassword',
              nickname: userData.nickname,
              email: userData.email,
              role: userData.role || 'user',
              isActive: userData.isActive !== undefined ? userData.isActive : true
            }, { transaction: t });
            importCount++;
          } catch (error) {
            errors.push({
              data: userData,
              error: error.message
            });
          }
        }
        break;
      case 'rooms':
        const { Room } = require('../models');
        for (const roomData of data) {
          try {
            await Room.create({
              name: roomData.name,
              description: roomData.description,
              capacity: roomData.capacity,
              price: roomData.price,
              isActive: roomData.isActive !== undefined ? roomData.isActive : true
            }, { transaction: t });
            importCount++;
          } catch (error) {
            errors.push({
              data: roomData,
              error: error.message
            });
          }
        }
        break;
      default:
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: '不支持的导入类型'
        });
    }
    
    // 保存导入历史
    await ImportHistory.create({
      type,
      filename: req.file.originalname,
      totalRecords: data.length,
      successCount: importCount,
      failureCount: errors.length,
      errors: JSON.stringify(errors),
      importedBy: req.user.id
    }, { transaction: t });
    
    // 删除临时文件
    fs.unlinkSync(req.file.path);
    
    await t.commit();
    
    res.json({
      success: true,
      data: {
        type,
        totalRecords: data.length,
        successCount: importCount,
        failureCount: errors.length,
        errors
      },
      message: '数据导入完成'
    });
  } catch (error) {
    await t.rollback();
    
    // 删除临时文件
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    console.error('导入数据失败:', error);
    res.status(500).json({
      success: false,
      message: '导入数据失败',
      error: error.message
    });
  }
};

/**
 * 获取导入历史
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.getImportHistory = async (req, res) => {
  try {
    console.log('获取导入历史');
    
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    const { count, rows } = await ImportHistory.findAndCountAll({
      include: [
        {
          model: User,
          as: 'importer',
          attributes: ['id', 'username', 'nickname']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });
    
    res.json({
      success: true,
      data: {
        history: rows,
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('获取导入历史失败:', error);
    res.status(500).json({
      success: false,
      message: '获取导入历史失败',
      error: error.message
    });
  }
};

/**
 * 清理缓存
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.clearCache = async (req, res) => {
  try {
    console.log('清理缓存');
    
    const { type = 'all' } = req.body;
    
    // 这里可以根据不同的缓存类型进行清理
    // 例如：Redis缓存、文件缓存等
    
    // 模拟清理缓存
    let clearedTypes = [];
    
    if (type === 'all' || type === 'session') {
      // 清理会话缓存
      clearedTypes.push('session');
    }
    
    if (type === 'all' || type === 'data') {
      // 清理数据缓存
      clearedTypes.push('data');
    }
    
    if (type === 'all' || type === 'template') {
      // 清理模板缓存
      clearedTypes.push('template');
    }
    
    res.json({
      success: true,
      data: {
        clearedTypes,
        clearedAt: new Date()
      },
      message: '缓存清理成功'
    });
  } catch (error) {
    console.error('清理缓存失败:', error);
    res.status(500).json({
      success: false,
      message: '清理缓存失败',
      error: error.message
    });
  }
};

/**
 * 获取缓存状态
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.getCacheStatus = async (req, res) => {
  try {
    console.log('获取缓存状态');
    
    // 模拟获取缓存状态
    const cacheStatus = {
      session: {
        count: 25,
        size: '1.2MB',
        lastCleared: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1天前
      },
      data: {
        count: 150,
        size: '15.8MB',
        lastCleared: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2小时前
      },
      template: {
        count: 12,
        size: '450KB',
        lastCleared: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7天前
      },
      total: {
        count: 187,
        size: '17.45MB'
      }
    };
    
    res.json({
      success: true,
      data: cacheStatus
    });
  } catch (error) {
    console.error('获取缓存状态失败:', error);
    res.status(500).json({
      success: false,
      message: '获取缓存状态失败',
      error: error.message
    });
  }
};