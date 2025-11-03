/**
 * 通知服务单元测试
 */

const notificationService = require('../../utils/notification-service');

// 模拟nodemailer和twilio
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn()
  }))
}));

jest.mock('twilio', () => ({
  jest.fn(() => ({
    messages: {
      create: jest.fn()
    }
  }))
}));

describe('通知服务测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendEmail', () => {
    it('应该在开发环境下模拟发送邮件', async () => {
      // 设置开发环境
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      // 准备测试数据
      const emailOptions = {
        to: 'test@example.com',
        subject: '测试邮件',
        text: '这是一封测试邮件',
        html: '<p>这是一封测试邮件</p>'
      };

      // 调用函数
      const result = await notificationService.sendEmail(emailOptions);

      // 验证结果
      expect(result).toEqual({
        success: true,
        message: '邮件发送成功(开发环境模拟)'
      });

      // 恢复环境变量
      process.env.NODE_ENV = originalEnv;
    });

    it('应该在生产环境下真实发送邮件', async () => {
      // 设置生产环境
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      // 准备测试数据
      const emailOptions = {
        to: 'test@example.com',
        subject: '测试邮件',
        text: '这是一封测试邮件',
        html: '<p>这是一封测试邮件</p>'
      };

      // 模拟nodemailer
      const mockSendMail = jest.fn().mockResolvedValue({
        messageId: 'test-message-id'
      });
      const nodemailer = require('nodemailer');
      nodemailer.createTransport.mockReturnValue({
        sendMail: mockSendMail
      });

      // 调用函数
      const result = await notificationService.sendEmail(emailOptions);

      // 验证结果
      expect(nodemailer.createTransport).toHaveBeenCalled();
      expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
        from: expect.any(String),
        to: emailOptions.to,
        subject: emailOptions.subject,
        text: emailOptions.text,
        html: emailOptions.html
      }));
      expect(result).toEqual({
        success: true,
        message: '邮件发送成功',
        messageId: 'test-message-id'
      });

      // 恢复环境变量
      process.env.NODE_ENV = originalEnv;
    });

    it('应该在邮件发送失败时返回错误信息', async () => {
      // 设置生产环境
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      // 准备测试数据
      const emailOptions = {
        to: 'test@example.com',
        subject: '测试邮件',
        text: '这是一封测试邮件'
      };

      // 模拟nodemailer发送失败
      const mockSendMail = jest.fn().mockRejectedValue(new Error('邮件发送失败'));
      const nodemailer = require('nodemailer');
      nodemailer.createTransport.mockReturnValue({
        sendMail: mockSendMail
      });

      // 调用函数
      const result = await notificationService.sendEmail(emailOptions);

      // 验证结果
      expect(result).toEqual({
        success: false,
        message: '邮件发送失败: 邮件发送失败'
      });

      // 恢复环境变量
      process.env.NODE_ENV = originalEnv;
    });

    it('应该在缺少必要参数时抛出错误', async () => {
      // 准备不完整的测试数据
      const incompleteOptions = {
        subject: '测试邮件',
        text: '这是一封测试邮件'
        // 缺少 to
      };

      // 验证函数抛出错误
      await expect(notificationService.sendEmail(incompleteOptions))
        .rejects.toThrow('缺少必要参数');
    });
  });

  describe('sendSMS', () => {
    it('应该在开发环境下模拟发送短信', async () => {
      // 设置开发环境
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      // 准备测试数据
      const smsOptions = {
        to: '+1234567890',
        message: '这是一条测试短信'
      };

      // 调用函数
      const result = await notificationService.sendSMS(smsOptions);

      // 验证结果
      expect(result).toEqual({
        success: true,
        message: '短信发送成功(开发环境模拟)'
      });

      // 恢复环境变量
      process.env.NODE_ENV = originalEnv;
    });

    it('应该在生产环境下真实发送短信', async () => {
      // 设置生产环境
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      // 准备测试数据
      const smsOptions = {
        to: '+1234567890',
        message: '这是一条测试短信'
      };

      // 模拟twilio
      const mockCreate = jest.fn().mockResolvedValue({
        sid: 'test-sms-sid'
      });
      const twilio = require('twilio');
      const mockTwilio = twilio();
      mockTwilio.messages.create = mockCreate;

      // 调用函数
      const result = await notificationService.sendSMS(smsOptions);

      // 验证结果
      expect(twilio).toHaveBeenCalled();
      expect(mockCreate).toHaveBeenCalledWith({
        body: smsOptions.message,
        from: expect.any(String),
        to: smsOptions.to
      });
      expect(result).toEqual({
        success: true,
        message: '短信发送成功',
        sid: 'test-sms-sid'
      });

      // 恢复环境变量
      process.env.NODE_ENV = originalEnv;
    });

    it('应该在短信发送失败时返回错误信息', async () => {
      // 设置生产环境
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      // 准备测试数据
      const smsOptions = {
        to: '+1234567890',
        message: '这是一条测试短信'
      };

      // 模拟twilio发送失败
      const mockCreate = jest.fn().mockRejectedValue(new Error('短信发送失败'));
      const twilio = require('twilio');
      const mockTwilio = twilio();
      mockTwilio.messages.create = mockCreate;

      // 调用函数
      const result = await notificationService.sendSMS(smsOptions);

      // 验证结果
      expect(result).toEqual({
        success: false,
        message: '短信发送失败: 短信发送失败'
      });

      // 恢复环境变量
      process.env.NODE_ENV = originalEnv;
    });

    it('应该在缺少必要参数时抛出错误', async () => {
      // 准备不完整的测试数据
      const incompleteOptions = {
        message: '这是一条测试短信'
        // 缺少 to
      };

      // 验证函数抛出错误
      await expect(notificationService.sendSMS(incompleteOptions))
        .rejects.toThrow('缺少必要参数');
    });
  });

  describe('sendPaymentReminderEmail', () => {
    it('应该成功发送支付提醒邮件', async () => {
      // 准备测试数据
      const userEmail = 'test@example.com';
      const userName = '测试用户';
      const billTitle = '测试账单';
      const billAmount = 100.50;
      const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 明天

      // 模拟sendEmail函数
      const mockSendEmail = jest.spyOn(notificationService, 'sendEmail')
        .mockResolvedValue({ success: true });

      // 调用函数
      const result = await notificationService.sendPaymentReminderEmail(
        userEmail, userName, billTitle, billAmount, dueDate
      );

      // 验证结果
      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: userEmail,
          subject: expect.stringContaining('支付提醒'),
          html: expect.stringContaining(billTitle)
        })
      );

      expect(result).toEqual({
        success: true,
        message: '支付提醒邮件发送成功'
      });
    });

    it('应该在邮件发送失败时返回错误信息', async () => {
      // 准备测试数据
      const userEmail = 'test@example.com';
      const userName = '测试用户';
      const billTitle = '测试账单';
      const billAmount = 100.50;
      const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 明天

      // 模拟sendEmail函数失败
      const mockSendEmail = jest.spyOn(notificationService, 'sendEmail')
        .mockResolvedValue({ success: false, message: '邮件发送失败' });

      // 调用函数
      const result = await notificationService.sendPaymentReminderEmail(
        userEmail, userName, billTitle, billAmount, dueDate
      );

      // 验证结果
      expect(result).toEqual({
        success: false,
        message: '支付提醒邮件发送失败: 邮件发送失败'
      });
    });
  });

  describe('sendPaymentConfirmationEmail', () => {
    it('应该成功发送支付确认邮件', async () => {
      // 准备测试数据
      const userEmail = 'test@example.com';
      const userName = '测试用户';
      const billTitle = '测试账单';
      const billAmount = 100.50;
      const paymentMethod = 'alipay';
      const paymentDate = new Date();

      // 模拟sendEmail函数
      const mockSendEmail = jest.spyOn(notificationService, 'sendEmail')
        .mockResolvedValue({ success: true });

      // 调用函数
      const result = await notificationService.sendPaymentConfirmationEmail(
        userEmail, userName, billTitle, billAmount, paymentMethod, paymentDate
      );

      // 验证结果
      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: userEmail,
          subject: expect.stringContaining('支付确认'),
          html: expect.stringContaining(billTitle)
        })
      );

      expect(result).toEqual({
        success: true,
        message: '支付确认邮件发送成功'
      });
    });

    it('应该在邮件发送失败时返回错误信息', async () => {
      // 准备测试数据
      const userEmail = 'test@example.com';
      const userName = '测试用户';
      const billTitle = '测试账单';
      const billAmount = 100.50;
      const paymentMethod = 'alipay';
      const paymentDate = new Date();

      // 模拟sendEmail函数失败
      const mockSendEmail = jest.spyOn(notificationService, 'sendEmail')
        .mockResolvedValue({ success: false, message: '邮件发送失败' });

      // 调用函数
      const result = await notificationService.sendPaymentConfirmationEmail(
        userEmail, userName, billTitle, billAmount, paymentMethod, paymentDate
      );

      // 验证结果
      expect(result).toEqual({
        success: false,
        message: '支付确认邮件发送失败: 邮件发送失败'
      });
    });
  });

  describe('sendBillShareEmail', () => {
    it('应该成功发送账单分享邮件', async () => {
      // 准备测试数据
      const userEmail = 'test@example.com';
      const userName = '测试用户';
      const sharedByUser = '分享用户';
      const billTitle = '测试账单';
      const billAmount = 100.50;
      const shareUrl = 'https://example.com/bill/123';

      // 模拟sendEmail函数
      const mockSendEmail = jest.spyOn(notificationService, 'sendEmail')
        .mockResolvedValue({ success: true });

      // 调用函数
      const result = await notificationService.sendBillShareEmail(
        userEmail, userName, sharedByUser, billTitle, billAmount, shareUrl
      );

      // 验证结果
      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: userEmail,
          subject: expect.stringContaining('账单分享'),
          html: expect.stringContaining(billTitle)
        })
      );

      expect(result).toEqual({
        success: true,
        message: '账单分享邮件发送成功'
      });
    });

    it('应该在邮件发送失败时返回错误信息', async () => {
      // 准备测试数据
      const userEmail = 'test@example.com';
      const userName = '测试用户';
      const sharedByUser = '分享用户';
      const billTitle = '测试账单';
      const billAmount = 100.50;
      const shareUrl = 'https://example.com/bill/123';

      // 模拟sendEmail函数失败
      const mockSendEmail = jest.spyOn(notificationService, 'sendEmail')
        .mockResolvedValue({ success: false, message: '邮件发送失败' });

      // 调用函数
      const result = await notificationService.sendBillShareEmail(
        userEmail, userName, sharedByUser, billTitle, billAmount, shareUrl
      );

      // 验证结果
      expect(result).toEqual({
        success: false,
        message: '账单分享邮件发送失败: 邮件发送失败'
      });
    });
  });
});