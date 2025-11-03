/**
 * 支付提醒服务单元测试
 */

const paymentReminderService = require('../../services/payment-reminder-service');
const { query } = require('../../config/db');
const notificationService = require('../../utils/notification-service');

// 模拟数据库查询和通知服务
jest.mock('../../config/db', () => ({
  query: jest.fn()
}));

jest.mock('../../utils/notification-service', () => ({
  sendEmail: jest.fn(),
  sendSMS: jest.fn()
}));

describe('支付提醒服务测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createPaymentReminder', () => {
    it('应该成功创建支付提醒', async () => {
      // 准备测试数据
      const reminderData = {
        billId: 1,
        userId: 1,
        reminderTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // 明天
        reminderType: 'email',
        message: '请及时支付账单',
        createdBy: 1
      };

      const mockResult = {
        rows: [{
          id: 1,
          bill_id: reminderData.billId,
          user_id: reminderData.userId,
          reminder_time: reminderData.reminderTime,
          reminder_type: reminderData.reminderType,
          message: reminderData.message,
          status: 'pending',
          created_at: new Date(),
          updated_at: new Date()
        }]
      };

      // 模拟数据库查询返回结果
      query.mockResolvedValue(mockResult);

      // 调用函数
      const result = await paymentReminderService.createPaymentReminder(reminderData);

      // 验证结果
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO payment_reminders'),
        expect.arrayContaining([
          reminderData.billId,
          reminderData.userId,
          reminderData.reminderTime,
          reminderData.reminderType,
          reminderData.message,
          reminderData.createdBy
        ])
      );

      expect(result).toEqual({
        id: 1,
        billId: reminderData.billId,
        userId: reminderData.userId,
        reminderTime: reminderData.reminderTime,
        reminderType: reminderData.reminderType,
        message: reminderData.message,
        status: 'pending'
      });
    });

    it('应该在缺少必要参数时抛出错误', async () => {
      // 准备不完整的测试数据
      const incompleteData = {
        billId: 1,
        // 缺少 userId
        reminderTime: new Date(),
        reminderType: 'email'
      };

      // 验证函数抛出错误
      await expect(paymentReminderService.createPaymentReminder(incompleteData))
        .rejects.toThrow('缺少必要参数');
    });

    it('应该在数据库查询失败时抛出错误', async () => {
      // 准备测试数据
      const reminderData = {
        billId: 1,
        userId: 1,
        reminderTime: new Date(),
        reminderType: 'email',
        createdBy: 1
      };

      // 模拟数据库查询失败
      query.mockRejectedValue(new Error('数据库连接失败'));

      // 验证函数抛出错误
      await expect(paymentReminderService.createPaymentReminder(reminderData))
        .rejects.toThrow('数据库连接失败');
    });
  });

  describe('sendPaymentReminder', () => {
    it('应该成功发送邮件提醒', async () => {
      // 准备测试数据
      const reminderId = 1;

      const mockReminder = {
        rows: [{
          id: reminderId,
          bill_id: 1,
          user_id: 1,
          reminder_type: 'email',
          message: '请及时支付账单',
          status: 'pending'
        }]
      };

      const mockUser = {
        rows: [{
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          phone: '13800138000'
        }]
      };

      const mockBill = {
        rows: [{
          id: 1,
          title: '测试账单',
          amount: 100.50,
          due_date: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }]
      };

      // 模拟数据库查询返回结果
      query
        .mockResolvedValueOnce(mockReminder) // 获取提醒信息
        .mockResolvedValueOnce(mockUser) // 获取用户信息
        .mockResolvedValueOnce(mockBill); // 获取账单信息

      // 模拟邮件发送成功
      notificationService.sendEmail.mockResolvedValue({ success: true });

      // 模拟更新提醒状态
      query.mockResolvedValue({ rows: [] });

      // 调用函数
      const result = await paymentReminderService.sendPaymentReminder(reminderId);

      // 验证结果
      expect(notificationService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          subject: expect.stringContaining('支付提醒')
        })
      );

      expect(result).toEqual({
        success: true,
        message: '邮件提醒发送成功'
      });
    });

    it('应该成功发送短信提醒', async () => {
      // 准备测试数据
      const reminderId = 1;

      const mockReminder = {
        rows: [{
          id: reminderId,
          bill_id: 1,
          user_id: 1,
          reminder_type: 'sms',
          message: '请及时支付账单',
          status: 'pending'
        }]
      };

      const mockUser = {
        rows: [{
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          phone: '13800138000'
        }]
      };

      const mockBill = {
        rows: [{
          id: 1,
          title: '测试账单',
          amount: 100.50,
          due_date: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }]
      };

      // 模拟数据库查询返回结果
      query
        .mockResolvedValueOnce(mockReminder) // 获取提醒信息
        .mockResolvedValueOnce(mockUser) // 获取用户信息
        .mockResolvedValueOnce(mockBill); // 获取账单信息

      // 模拟短信发送成功
      notificationService.sendSMS.mockResolvedValue({ success: true });

      // 模拟更新提醒状态
      query.mockResolvedValue({ rows: [] });

      // 调用函数
      const result = await paymentReminderService.sendPaymentReminder(reminderId);

      // 验证结果
      expect(notificationService.sendSMS).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '13800138000',
          message: expect.stringContaining('支付提醒')
        })
      );

      expect(result).toEqual({
        success: true,
        message: '短信提醒发送成功'
      });
    });

    it('应该在提醒记录不存在时抛出错误', async () => {
      // 准备测试数据
      const reminderId = 999;

      // 模拟数据库查询返回空结果
      query.mockResolvedValue({ rows: [] });

      // 验证函数抛出错误
      await expect(paymentReminderService.sendPaymentReminder(reminderId))
        .rejects.toThrow('提醒记录不存在');
    });

    it('应该在提醒已发送时返回相应消息', async () => {
      // 准备测试数据
      const reminderId = 1;

      const mockReminder = {
        rows: [{
          id: reminderId,
          bill_id: 1,
          user_id: 1,
          reminder_type: 'email',
          message: '请及时支付账单',
          status: 'sent' // 已发送
        }]
      };

      // 模拟数据库查询返回结果
      query.mockResolvedValue(mockReminder);

      // 调用函数
      const result = await paymentReminderService.sendPaymentReminder(reminderId);

      // 验证结果
      expect(result).toEqual({
        success: false,
        message: '提醒已发送'
      });
    });

    it('应该在邮件发送失败时标记提醒状态为失败', async () => {
      // 准备测试数据
      const reminderId = 1;

      const mockReminder = {
        rows: [{
          id: reminderId,
          bill_id: 1,
          user_id: 1,
          reminder_type: 'email',
          message: '请及时支付账单',
          status: 'pending'
        }]
      };

      const mockUser = {
        rows: [{
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          phone: '13800138000'
        }]
      };

      const mockBill = {
        rows: [{
          id: 1,
          title: '测试账单',
          amount: 100.50,
          due_date: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }]
      };

      // 模拟数据库查询返回结果
      query
        .mockResolvedValueOnce(mockReminder) // 获取提醒信息
        .mockResolvedValueOnce(mockUser) // 获取用户信息
        .mockResolvedValueOnce(mockBill); // 获取账单信息

      // 模拟邮件发送失败
      notificationService.sendEmail.mockRejectedValue(new Error('邮件发送失败'));

      // 模拟更新提醒状态
      query.mockResolvedValue({ rows: [] });

      // 调用函数
      const result = await paymentReminderService.sendPaymentReminder(reminderId);

      // 验证结果
      expect(result).toEqual({
        success: false,
        message: '邮件发送失败'
      });
    });
  });

  describe('getUserPaymentReminders', () => {
    it('应该成功获取用户支付提醒列表', async () => {
      // 准备测试数据
      const userId = 1;
      const page = 1;
      const limit = 20;
      const status = 'pending';

      const mockResult = {
        rows: [
          {
            id: 1,
            bill_id: 1,
            user_id: userId,
            reminder_time: new Date(Date.now() + 24 * 60 * 60 * 1000),
            reminder_type: 'email',
            message: '请及时支付账单',
            status: 'pending',
            created_at: new Date()
          },
          {
            id: 2,
            bill_id: 2,
            user_id: userId,
            reminder_time: new Date(Date.now() + 48 * 60 * 60 * 1000),
            reminder_type: 'sms',
            message: '请及时支付账单',
            status: 'pending',
            created_at: new Date()
          }
        ],
        count: 2
      };

      // 模拟数据库查询返回结果
      query.mockResolvedValue(mockResult);

      // 调用函数
      const result = await paymentReminderService.getUserPaymentReminders(userId, page, limit, status);

      // 验证结果
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        expect.arrayContaining([userId, limit, (page - 1) * limit, status])
      );

      expect(result).toEqual({
        reminders: [
          {
            id: 1,
            billId: 1,
            userId: userId,
            reminderTime: expect.any(Date),
            reminderType: 'email',
            message: '请及时支付账单',
            status: 'pending',
            createdAt: expect.any(Date)
          },
          {
            id: 2,
            billId: 2,
            userId: userId,
            reminderTime: expect.any(Date),
            reminderType: 'sms',
            message: '请及时支付账单',
            status: 'pending',
            createdAt: expect.any(Date)
          }
        ],
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1
      });
    });

    it('应该在用户ID无效时抛出错误', async () => {
      // 准备无效的用户ID
      const invalidUserId = null;

      // 验证函数抛出错误
      await expect(paymentReminderService.getUserPaymentReminders(invalidUserId))
        .rejects.toThrow('用户ID无效');
    });
  });

  describe('getPendingReminders', () => {
    it('应该成功获取待发送的提醒', async () => {
      // 准备测试数据
      const page = 1;
      const limit = 20;

      const mockResult = {
        rows: [
          {
            id: 1,
            bill_id: 1,
            user_id: 1,
            reminder_time: new Date(Date.now() - 60 * 60 * 1000), // 1小时前
            reminder_type: 'email',
            message: '请及时支付账单',
            status: 'pending',
            created_at: new Date()
          }
        ],
        count: 1
      };

      // 模拟数据库查询返回结果
      query.mockResolvedValue(mockResult);

      // 调用函数
      const result = await paymentReminderService.getPendingReminders(page, limit);

      // 验证结果
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        expect.arrayContaining([limit, (page - 1) * limit])
      );

      expect(result).toEqual([
        {
          id: 1,
          billId: 1,
          userId: 1,
          reminderTime: expect.any(Date),
          reminderType: 'email',
          message: '请及时支付账单',
          status: 'pending',
          createdAt: expect.any(Date)
        }
      ]);
    });
  });

  describe('sendPendingReminders', () => {
    it('应该成功批量发送待发送的提醒', async () => {
      // 准备测试数据
      const pendingReminders = [
        {
          id: 1,
          billId: 1,
          userId: 1,
          reminderType: 'email',
          message: '请及时支付账单'
        },
        {
          id: 2,
          billId: 2,
          userId: 2,
          reminderType: 'sms',
          message: '请及时支付账单'
        }
      ];

      // 模拟发送提醒成功
      jest.spyOn(paymentReminderService, 'sendPaymentReminder')
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: true });

      // 调用函数
      const result = await paymentReminderService.sendPendingReminders(pendingReminders);

      // 验证结果
      expect(paymentReminderService.sendPaymentReminder).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        successCount: 2,
        failureCount: 0
      });
    });

    it('应该处理部分发送失败的情况', async () => {
      // 准备测试数据
      const pendingReminders = [
        {
          id: 1,
          billId: 1,
          userId: 1,
          reminderType: 'email',
          message: '请及时支付账单'
        },
        {
          id: 2,
          billId: 2,
          userId: 2,
          reminderType: 'sms',
          message: '请及时支付账单'
        }
      ];

      // 模拟发送提醒，一个成功一个失败
      jest.spyOn(paymentReminderService, 'sendPaymentReminder')
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: false, message: '发送失败' });

      // 调用函数
      const result = await paymentReminderService.sendPendingReminders(pendingReminders);

      // 验证结果
      expect(paymentReminderService.sendPaymentReminder).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        successCount: 1,
        failureCount: 1
      });
    });
  });

  describe('createAutoReminders', () => {
    it('应该为账单创建自动提醒', async () => {
      // 准备测试数据
      const billId = 1;
      const userIds = [1, 2];

      const mockBill = {
        rows: [{
          id: billId,
          title: '测试账单',
          amount: 100.50,
          due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3天后到期
        }]
      };

      // 模拟数据库查询返回结果
      query.mockResolvedValue(mockBill);

      // 模拟创建提醒成功
      query.mockResolvedValue({ rows: [] });

      // 调用函数
      const result = await paymentReminderService.createAutoReminders(billId, userIds);

      // 验证结果
      expect(query).toHaveBeenCalledTimes(3); // 1次查询账单 + 2次创建提醒
      expect(result).toEqual({
        success: true,
        message: '成功创建2条自动提醒'
      });
    });

    it('应该在账单不存在时抛出错误', async () => {
      // 准备测试数据
      const billId = 999;
      const userIds = [1];

      // 模拟数据库查询返回空结果
      query.mockResolvedValue({ rows: [] });

      // 验证函数抛出错误
      await expect(paymentReminderService.createAutoReminders(billId, userIds))
        .rejects.toThrow('账单不存在');
    });

    it('应该在账单即将到期时创建即时提醒', async () => {
      // 准备测试数据
      const billId = 1;
      const userIds = [1];

      const mockBill = {
        rows: [{
          id: billId,
          title: '测试账单',
          amount: 100.50,
          due_date: new Date(Date.now() + 12 * 60 * 60 * 1000) // 12小时后到期
        }]
      };

      // 模拟数据库查询返回结果
      query.mockResolvedValue(mockBill);

      // 模拟创建提醒成功
      query.mockResolvedValue({ rows: [] });

      // 调用函数
      const result = await paymentReminderService.createAutoReminders(billId, userIds);

      // 验证结果
      expect(query).toHaveBeenCalledTimes(2); // 1次查询账单 + 1次创建提醒
      expect(result).toEqual({
        success: true,
        message: '成功创建1条即时提醒'
      });
    });
  });
});