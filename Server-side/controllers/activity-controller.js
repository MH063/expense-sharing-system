const { Activity, Room, User, ActivityParticipant } = require('../models');
const { Op } = require('sequelize');
const { logger } = require('../config/logger');
const { RBACService } = require('../services/rbac-service');

/**
 * 获取活动列表
 */
exports.getActivities = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      type,
      roomId,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    const where = {};
    const include = [
      {
        model: Room,
        as: 'room',
        attributes: ['id', 'name', 'building', 'floor']
      },
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'username', 'nickname', 'avatar']
      }
    ];

    // 状态筛选
    if (status) {
      where.status = status;
    }

    // 类型筛选
    if (type) {
      where.type = type;
    }

    // 房间筛选
    if (roomId) {
      where.roomId = roomId;
    }

    // 搜索条件
    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    // 排序
    const order = [];
    if (sortBy === 'participationCount') {
      order.push(['participationCount', sortOrder]);
    } else {
      order.push([sortBy, sortOrder]);
    }

    const { count, rows } = await Activity.findAndCountAll({
      where,
      include,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order,
      distinct: true
    });

    res.json({
      success: true,
      data: {
        activities: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    logger.error('获取活动列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取活动列表失败',
      error: error.message
    });
  }
};

/**
 * 获取活动详情
 */
exports.getActivityById = async (req, res) => {
  try {
    const { id } = req.params;

    const activity = await Activity.findByPk(id, {
      include: [
        {
          model: Room,
          as: 'room',
          attributes: ['id', 'name', 'building', 'floor']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'nickname', 'avatar']
        },
        {
          model: User,
          as: 'participants',
          attributes: ['id', 'username', 'nickname', 'avatar'],
          through: {
            attributes: ['joinedAt', 'status']
          }
        }
      ]
    });

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: '活动不存在'
      });
    }

    res.json({
      success: true,
      data: { activity }
    });
  } catch (error) {
    logger.error('获取活动详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取活动详情失败',
      error: error.message
    });
  }
};

/**
 * 创建活动
 */
exports.createActivity = async (req, res) => {
  try {
    const {
      title,
      description,
      type,
      roomId,
      startTime,
      endTime,
      maxParticipants,
      location,
      isPublic,
      tags
    } = req.body;

    // 验证房间是否存在
    const room = await Room.findByPk(roomId);
    if (!room) {
      return res.status(400).json({
        success: false,
        message: '房间不存在'
      });
    }

    // 验证时间
    if (new Date(startTime) >= new Date(endTime)) {
      return res.status(400).json({
        success: false,
        message: '结束时间必须晚于开始时间'
      });
    }

    const activity = await Activity.create({
      title,
      description,
      type,
      roomId,
      startTime,
      endTime,
      maxParticipants,
      location,
      isPublic: isPublic !== undefined ? isPublic : true,
      tags: tags || [],
      creatorId: req.user.id,
      status: 'upcoming'
    });

    // 获取完整的活动信息
    const createdActivity = await Activity.findByPk(activity.id, {
      include: [
        {
          model: Room,
          as: 'room',
          attributes: ['id', 'name', 'building', 'floor']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'nickname', 'avatar']
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: '活动创建成功',
      data: { activity: createdActivity }
    });
  } catch (error) {
    logger.error('创建活动失败:', error);
    res.status(500).json({
      success: false,
      message: '创建活动失败',
      error: error.message
    });
  }
};

/**
 * 更新活动
 */
exports.updateActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      type,
      roomId,
      startTime,
      endTime,
      maxParticipants,
      location,
      isPublic,
      tags
    } = req.body;

    const activity = await Activity.findByPk(id);
    if (!activity) {
      return res.status(404).json({
        success: false,
        message: '活动不存在'
      });
    }

    // 检查权限
    if (activity.creatorId !== req.user.id && !(await RBACService.hasRole(req.user.id, ['admin']))) {
      return res.status(403).json({
        success: false,
        message: '没有权限修改此活动'
      });
    }

    // 验证房间是否存在
    if (roomId && roomId !== activity.roomId) {
      const room = await Room.findByPk(roomId);
      if (!room) {
        return res.status(400).json({
          success: false,
          message: '房间不存在'
        });
      }
    }

    // 验证时间
    if (startTime && endTime) {
      if (new Date(startTime) >= new Date(endTime)) {
        return res.status(400).json({
          success: false,
          message: '结束时间必须晚于开始时间'
        });
      }
    }

    // 更新活动
    await activity.update({
      title,
      description,
      type,
      roomId,
      startTime,
      endTime,
      maxParticipants,
      location,
      isPublic,
      tags
    });

    // 获取更新后的活动信息
    const updatedActivity = await Activity.findByPk(id, {
      include: [
        {
          model: Room,
          as: 'room',
          attributes: ['id', 'name', 'building', 'floor']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'nickname', 'avatar']
        }
      ]
    });

    res.json({
      success: true,
      message: '活动更新成功',
      data: { activity: updatedActivity }
    });
  } catch (error) {
    logger.error('更新活动失败:', error);
    res.status(500).json({
      success: false,
      message: '更新活动失败',
      error: error.message
    });
  }
};

/**
 * 删除活动
 */
exports.deleteActivity = async (req, res) => {
  try {
    const { id } = req.params;

    const activity = await Activity.findByPk(id);
    if (!activity) {
      return res.status(404).json({
        success: false,
        message: '活动不存在'
      });
    }

    // 检查权限
    if (activity.creatorId !== req.user.id && !(await RBACService.hasRole(req.user.id, ['admin']))) {
      return res.status(403).json({
        success: false,
        message: '没有权限删除此活动'
      });
    }

    await activity.destroy();

    res.json({
      success: true,
      message: '活动删除成功'
    });
  } catch (error) {
    logger.error('删除活动失败:', error);
    res.status(500).json({
      success: false,
      message: '删除活动失败',
      error: error.message
    });
  }
};

/**
 * 切换活动状态
 */
exports.toggleActivityStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const activity = await Activity.findByPk(id);
    if (!activity) {
      return res.status(404).json({
        success: false,
        message: '活动不存在'
      });
    }

    // 检查权限
    if (activity.creatorId !== req.user.id && !(await RBACService.hasRole(req.user.id, ['admin']))) {
      return res.status(403).json({
        success: false,
        message: '没有权限修改此活动状态'
      });
    }

    await activity.update({ status });

    res.json({
      success: true,
      message: '活动状态更新成功',
      data: { activity }
    });
  } catch (error) {
    logger.error('切换活动状态失败:', error);
    res.status(500).json({
      success: false,
      message: '切换活动状态失败',
      error: error.message
    });
  }
};

/**
 * 批量更新活动
 */
exports.batchUpdateActivities = async (req, res) => {
  try {
    const { activityIds, updates } = req.body;

    if (!activityIds || !Array.isArray(activityIds) || activityIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供要更新的活动ID列表'
      });
    }

    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供要更新的字段'
      });
    }

    // 批量更新
    const [updatedCount] = await Activity.update(updates, {
      where: {
        id: { [Op.in]: activityIds }
      }
    });

    res.json({
      success: true,
      message: `成功更新 ${updatedCount} 个活动`,
      data: { updatedCount }
    });
  } catch (error) {
    logger.error('批量更新活动失败:', error);
    res.status(500).json({
      success: false,
      message: '批量更新活动失败',
      error: error.message
    });
  }
};

/**
 * 获取活动参与统计
 */
exports.getActivityParticipationStats = async (req, res) => {
  try {
    const { id } = req.params;
    const { period = 'week' } = req.query;

    const activity = await Activity.findByPk(id, {
      include: [
        {
          model: User,
          as: 'participants',
          attributes: ['id', 'username', 'nickname', 'avatar'],
          through: {
            attributes: ['joinedAt', 'status']
          }
        }
      ]
    });

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: '活动不存在'
      });
    }

    // 计算统计数据
    const totalParticipants = activity.participants.length;
    const confirmedParticipants = activity.participants.filter(
      p => p.ActivityParticipant.status === 'confirmed'
    ).length;
    const pendingParticipants = activity.participants.filter(
      p => p.ActivityParticipant.status === 'pending'
    ).length;

    // 按时间段统计参与情况
    let timeStats = {};
    if (period === 'day') {
      // 按天统计
      timeStats = {};
    } else if (period === 'week') {
      // 按周统计
      timeStats = {};
    } else if (period === 'month') {
      // 按月统计
      timeStats = {};
    }

    res.json({
      success: true,
      data: {
        activityId: activity.id,
        totalParticipants,
        confirmedParticipants,
        pendingParticipants,
        maxParticipants: activity.maxParticipants,
        participationRate: activity.maxParticipants ? 
          (confirmedParticipants / activity.maxParticipants * 100).toFixed(2) + '%' : 
          '无限制',
        timeStats
      }
    });
  } catch (error) {
    logger.error('获取活动参与统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取活动参与统计失败',
      error: error.message
    });
  }
};

/**
 * 报名参加活动
 */
exports.joinActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const activity = await Activity.findByPk(id);
    if (!activity) {
      return res.status(404).json({
        success: false,
        message: '活动不存在'
      });
    }

    // 检查活动状态
    if (activity.status !== 'upcoming') {
      return res.status(400).json({
        success: false,
        message: '活动已开始或已结束，无法报名'
      });
    }

    // 检查是否已经报名
    const existingParticipant = await ActivityParticipant.findOne({
      where: {
        activityId: id,
        userId
      }
    });

    if (existingParticipant) {
      return res.status(400).json({
        success: false,
        message: '您已经报名此活动'
      });
    }

    // 检查人数限制
    if (activity.maxParticipants) {
      const currentCount = await ActivityParticipant.count({
        where: {
          activityId: id,
          status: 'confirmed'
        }
      });

      if (currentCount >= activity.maxParticipants) {
        return res.status(400).json({
          success: false,
          message: '活动报名人数已满'
        });
      }
    }

    // 创建报名记录
    await ActivityParticipant.create({
      activityId: id,
      userId,
      status: 'confirmed',
      joinedAt: new Date()
    });

    // 更新活动参与人数
    await activity.increment('participationCount');

    res.json({
      success: true,
      message: '报名成功'
    });
  } catch (error) {
    logger.error('报名活动失败:', error);
    res.status(500).json({
      success: false,
      message: '报名活动失败',
      error: error.message
    });
  }
};

/**
 * 取消报名
 */
exports.leaveActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const activity = await Activity.findByPk(id);
    if (!activity) {
      return res.status(404).json({
        success: false,
        message: '活动不存在'
      });
    }

    // 查找报名记录
    const participant = await ActivityParticipant.findOne({
      where: {
        activityId: id,
        userId
      }
    });

    if (!participant) {
      return res.status(400).json({
        success: false,
        message: '您未报名此活动'
      });
    }

    // 删除报名记录
    await participant.destroy();

    // 更新活动参与人数
    await activity.decrement('participationCount');

    res.json({
      success: true,
      message: '取消报名成功'
    });
  } catch (error) {
    logger.error('取消报名失败:', error);
    res.status(500).json({
      success: false,
      message: '取消报名失败',
      error: error.message
    });
  }
};

/**
 * 复制活动
 */
exports.copyActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const { startTime, endTime } = req.body;

    const originalActivity = await Activity.findByPk(id);
    if (!originalActivity) {
      return res.status(404).json({
        success: false,
        message: '活动不存在'
      });
    }

    // 检查权限
    if (originalActivity.creatorId !== req.user.id && !(await RBACService.hasRole(req.user.id, ['admin']))) {
      return res.status(403).json({
        success: false,
        message: '没有权限复制此活动'
      });
    }

    // 验证时间
    if (startTime && endTime) {
      if (new Date(startTime) >= new Date(endTime)) {
        return res.status(400).json({
          success: false,
          message: '结束时间必须晚于开始时间'
        });
      }
    }

    // 创建新活动
    const newActivity = await Activity.create({
      title: `${originalActivity.title} (副本)`,
      description: originalActivity.description,
      type: originalActivity.type,
      roomId: originalActivity.roomId,
      startTime: startTime || originalActivity.startTime,
      endTime: endTime || originalActivity.endTime,
      maxParticipants: originalActivity.maxParticipants,
      location: originalActivity.location,
      isPublic: originalActivity.isPublic,
      tags: originalActivity.tags,
      creatorId: req.user.id,
      status: 'upcoming'
    });

    // 获取完整的活动信息
    const createdActivity = await Activity.findByPk(newActivity.id, {
      include: [
        {
          model: Room,
          as: 'room',
          attributes: ['id', 'name', 'building', 'floor']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'nickname', 'avatar']
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: '活动复制成功',
      data: { activity: createdActivity }
    });
  } catch (error) {
    logger.error('复制活动失败:', error);
    res.status(500).json({
      success: false,
      message: '复制活动失败',
      error: error.message
    });
  }
};