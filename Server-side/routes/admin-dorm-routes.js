const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/tokenManager');
const checkRole = require('../middleware/role-middleware');
const { body, query, param } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validation-middleware');

// 导入控制器
const roomController = require('../controllers/admin/dorm-controller');

/**
 * @description 获取寝室列表
 * @route GET /admin/dorms
 * @access Private (Admin)
 */
router.get('/',
  authenticateToken,
  checkRole(['admin']),
  [
    query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
    query('status').optional().isIn(['active', 'inactive', 'archived']).withMessage('状态值无效'),
    query('name').optional().isString().withMessage('寝室名称必须是字符串'),
    query('building').optional().isString().withMessage('楼栋必须是字符串'),
    query('floor').optional().isInt({ min: 1 }).withMessage('楼层必须是正整数')
  ],
  handleValidationErrors,
  roomController.getRooms
);

/**
 * @description 获取寝室详情
 * @route GET /admin/dorms/:id
 * @access Private (Admin)
 */
router.get('/:id',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('寝室ID格式无效')
  ],
  handleValidationErrors,
  roomController.getRoomById
);

/**
 * @description 创建寝室
 * @route POST /admin/dorms
 * @access Private (Admin)
 */
router.post('/',
  authenticateToken,
  checkRole(['admin']),
  [
    body('name').notEmpty().withMessage('寝室名称不能为空'),
    body('building').notEmpty().withMessage('楼栋不能为空'),
    body('floor').isInt({ min: 1 }).withMessage('楼层必须是正整数'),
    body('room_number').notEmpty().withMessage('房间号不能为空'),
    body('capacity').isInt({ min: 1, max: 20 }).withMessage('容量必须是1-20之间的正整数'),
    body('description').optional().isString().withMessage('描述必须是字符串'),
    body('status').optional().isIn(['active', 'inactive', 'archived']).withMessage('状态值无效')
  ],
  handleValidationErrors,
  roomController.createRoom
);

/**
 * @description 更新寝室
 * @route PUT /admin/dorms/:id
 * @access Private (Admin)
 */
router.put('/:id',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('寝室ID格式无效'),
    body('name').optional().notEmpty().withMessage('寝室名称不能为空'),
    body('building').optional().notEmpty().withMessage('楼栋不能为空'),
    body('floor').optional().isInt({ min: 1 }).withMessage('楼层必须是正整数'),
    body('room_number').optional().notEmpty().withMessage('房间号不能为空'),
    body('capacity').optional().isInt({ min: 1, max: 20 }).withMessage('容量必须是1-20之间的正整数'),
    body('description').optional().isString().withMessage('描述必须是字符串'),
    body('status').optional().isIn(['active', 'inactive', 'archived']).withMessage('状态值无效')
  ],
  handleValidationErrors,
  roomController.updateRoom
);

/**
 * @description 删除寝室
 * @route DELETE /admin/dorms/:id
 * @access Private (Admin)
 */
router.delete('/:id',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('寝室ID格式无效')
  ],
  handleValidationErrors,
  roomController.deleteRoom
);

/**
 * @description 获取寝室成员列表
 * @route GET /admin/dorms/:id/members
 * @access Private (Admin)
 */
router.get('/:id/members',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('寝室ID格式无效'),
    query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
    query('status').optional().isIn(['active', 'inactive', 'suspended']).withMessage('状态值无效')
  ],
  handleValidationErrors,
  roomController.getRoomMembers
);

/**
 * @description 添加寝室成员
 * @route POST /admin/dorms/:id/members
 * @access Private (Admin)
 */
router.post('/:id/members',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('寝室ID格式无效'),
    body('user_id').isUUID().withMessage('用户ID格式无效'),
    body('role').optional().isIn(['member', 'leader']).withMessage('成员角色无效'),
    body('join_date').optional().isISO8601().withMessage('加入日期格式无效')
  ],
  handleValidationErrors,
  roomController.addRoomMember
);

/**
 * @description 移除寝室成员
 * @route DELETE /admin/dorms/:id/members/:memberId
 * @access Private (Admin)
 */
router.delete('/:id/members/:memberId',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('寝室ID格式无效'),
    param('memberId').isUUID().withMessage('成员ID格式无效')
  ],
  handleValidationErrors,
  roomController.removeRoomMember
);

/**
 * @description 设置寝室长
 * @route PUT /admin/dorms/:id/leader
 * @access Private (Admin)
 */
router.put('/:id/leader',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('寝室ID格式无效'),
    body('user_id').isUUID().withMessage('用户ID格式无效')
  ],
  handleValidationErrors,
  roomController.setRoomLeader
);

/**
 * @description 获取寝室邀请列表
 * @route GET /admin/dorms/:id/invitations
 * @access Private (Admin)
 */
router.get('/:id/invitations',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('寝室ID格式无效'),
    query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
    query('status').optional().isIn(['pending', 'accepted', 'expired', 'cancelled']).withMessage('状态值无效')
  ],
  handleValidationErrors,
  roomController.getRoomInvitations
);

/**
 * @description 创建寝室邀请
 * @route POST /admin/dorms/:id/invitations
 * @access Private (Admin)
 */
router.post('/:id/invitations',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('寝室ID格式无效'),
    body('invitee_email').isEmail().withMessage('邀请邮箱格式无效'),
    body('message').optional().isString().withMessage('邀请消息必须是字符串'),
    body('expires_at').optional().isISO8601().withMessage('过期时间格式无效')
  ],
  handleValidationErrors,
  roomController.createRoomInvitation
);

/**
 * @description 删除寝室邀请
 * @route DELETE /admin/dorms/invitations/:invitationId
 * @access Private (Admin)
 */
router.delete('/invitations/:invitationId',
  authenticateToken,
  checkRole(['admin']),
  [
    param('invitationId').isUUID().withMessage('邀请ID格式无效')
  ],
  handleValidationErrors,
  roomController.deleteRoomInvitation
);

/**
 * @description 获取寝室费用设置
 * @route GET /admin/dorms/:id/expense-settings
 * @access Private (Admin)
 */
router.get('/:id/expense-settings',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('寝室ID格式无效')
  ],
  handleValidationErrors,
  roomController.getRoomExpenseSettings
);

/**
 * @description 更新寝室费用设置
 * @route PUT /admin/dorms/:id/expense-settings
 * @access Private (Admin)
 */
router.put('/:id/expense-settings',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('寝室ID格式无效'),
    body('split_method').optional().isIn(['equal', 'custom', 'percentage']).withMessage('分摊方式无效'),
    body('default_categories').optional().isArray().withMessage('默认分类必须是数组'),
    body('notification_settings').optional().isObject().withMessage('通知设置必须是对象'),
    body('budget_limit').optional().isFloat({ min: 0 }).withMessage('预算限制必须是非负数')
  ],
  handleValidationErrors,
  roomController.updateRoomExpenseSettings
);

module.exports = router;