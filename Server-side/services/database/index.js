/**
 * 数据库服务索引文件
 * 导出所有数据库服务
 */

const UserService = require('./user-service');
const RoomService = require('./room-service');
const BillService = require('./bill-service');
const PaymentService = require('./payment-service');
const NotificationService = require('./notification-service');

module.exports = {
  UserService,
  RoomService,
  BillService,
  PaymentService,
  NotificationService
};