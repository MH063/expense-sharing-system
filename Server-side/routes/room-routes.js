const express = require('express');
const router = express.Router();
const roomController = require('../controllers/room-controller');
const { authenticateToken, checkRole } = require('../middleware/tokenManager');

// 创建寝室
router.post('/', authenticateToken, roomController.createRoom);

// 获取寝室列表
router.get('/', authenticateToken, roomController.getRooms);

// 获取用户所属的寝室列表
router.get('/my-rooms', authenticateToken, roomController.getMyRooms);

// 获取寝室详情
router.get('/:id', authenticateToken, roomController.getRoomById);

// 更新寝室信息
router.put('/:id', authenticateToken, roomController.updateRoom);

// 删除寝室
router.delete('/:id', authenticateToken, roomController.deleteRoom);

// 加入寝室
router.post('/join', authenticateToken, roomController.joinRoom);

// 离开寝室
router.post('/:id/leave', authenticateToken, roomController.leaveRoom);

// 管理寝室成员
router.put('/:roomId/members/:userId', authenticateToken, roomController.manageMember);

module.exports = router;