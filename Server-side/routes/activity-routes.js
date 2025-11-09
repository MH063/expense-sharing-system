const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activity-controller');
const { authenticateToken: authenticate, checkRole: authorize } = require('../middleware/auth-middleware');

// 获取活动列表
router.get('/', authenticate, activityController.getActivities);

// 获取活动详情
router.get('/:id', authenticate, activityController.getActivityById);

// 创建活动
router.post('/', authenticate, authorize(['admin', 'room_admin']), activityController.createActivity);

// 更新活动
router.put('/:id', authenticate, authorize(['admin', 'room_admin']), activityController.updateActivity);

// 删除活动
router.delete('/:id', authenticate, authorize(['admin', 'room_admin']), activityController.deleteActivity);

// 切换活动状态
router.patch('/:id/status', authenticate, authorize(['admin', 'room_admin']), activityController.toggleActivityStatus);

// 批量更新活动
router.patch('/batch', authenticate, authorize(['admin']), activityController.batchUpdateActivities);

// 获取活动参与统计
router.get('/:id/participation-stats', authenticate, activityController.getActivityParticipationStats);

// 报名参加活动
router.post('/:id/join', authenticate, activityController.joinActivity);

// 取消报名
router.delete('/:id/leave', authenticate, activityController.leaveActivity);

// 复制活动
router.post('/:id/copy', authenticate, authorize(['admin', 'room_admin']), activityController.copyActivity);

module.exports = router;