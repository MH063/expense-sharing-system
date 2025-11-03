/**
 * 通知服务
 * 处理邮件和短信通知的发送
 */

const nodemailer = require('nodemailer');
const twilio = require('twilio');

// 根据环境变量加载配置
const env = process.env.NODE_ENV || 'development';
require('dotenv').config({ path: `.env.${env}` });

/**
 * 发送邮件
 * @param {Object} emailOptions - 邮件选项
 * @param {string} emailOptions.to - 收件人邮箱
 * @param {string} emailOptions.subject - 邮件主题
 * @param {string} emailOptions.message - 邮件内容
 * @param {string} emailOptions.html - HTML格式的邮件内容（可选）
 * @returns {Object} 发送结果
 */
const sendEmail = async (emailOptions) => {
  try {
    console.log('发送邮件，选项:', emailOptions);
    
    const { to, subject, message, html } = emailOptions;
    
    // 检查必要参数
    if (!to || !subject || (!message && !html)) {
      throw new Error('缺少必要的邮件参数');
    }
    
    // 创建邮件传输器
    let transporter;
    
    // 根据环境配置不同的邮件服务
    if (env === 'production') {
      // 生产环境使用真实的SMTP服务器
      transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD
        }
      });
    } else {
      // 开发环境使用测试账户
      transporter = nodemailer.createTransporter({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: process.env.ETHEREAL_USER || 'ethereal.user@example.com',
          pass: process.env.ETHEREAL_PASS || 'ethereal.password'
        }
      });
    }
    
    // 构建邮件选项
    const mailOptions = {
      from: process.env.EMAIL_FROM || '记账系统 <noreply@accounting-system.com>',
      to,
      subject,
      text: message,
      html: html || generateHtmlFromText(message)
    };
    
    // 发送邮件
    const info = await transporter.sendMail(mailOptions);
    
    console.log(`邮件发送成功，消息ID: ${info.messageId}`);
    
    // 在开发环境中，返回预览URL
    if (env !== 'production' && nodemailer.getTestMessageUrl) {
      return {
        success: true,
        messageId: info.messageId,
        previewUrl: nodemailer.getTestMessageUrl(info)
      };
    }
    
    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    console.error('发送邮件失败:', error);
    throw error;
  }
};

/**
 * 发送短信
 * @param {Object} smsOptions - 短信选项
 * @param {string} smsOptions.to - 收件人手机号
 * @param {string} smsOptions.message - 短信内容
 * @returns {Object} 发送结果
 */
const sendSMS = async (smsOptions) => {
  try {
    console.log('发送短信，选项:', smsOptions);
    
    const { to, message } = smsOptions;
    
    // 检查必要参数
    if (!to || !message) {
      throw new Error('缺少必要的短信参数');
    }
    
    // 在开发环境中，只记录日志而不实际发送短信
    if (env !== 'production') {
      console.log(`[开发环境] 模拟发送短信到 ${to}: ${message}`);
      return {
        success: true,
        sid: `dev-sid-${Date.now()}`,
        status: 'simulated'
      };
    }
    
    // 生产环境使用Twilio发送短信
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
      throw new Error('缺少Twilio配置');
    }
    
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    
    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to
    });
    
    console.log(`短信发送成功，SID: ${result.sid}`);
    
    return {
      success: true,
      sid: result.sid,
      status: result.status
    };
  } catch (error) {
    console.error('发送短信失败:', error);
    throw error;
  }
};

/**
 * 从文本生成HTML邮件内容
 * @param {string} text - 文本内容
 * @returns {string} HTML内容
 */
const generateHtmlFromText = (text) => {
  // 简单地将文本转换为HTML，保留换行
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>记账系统通知</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #f8f9fa;
          padding: 20px;
          border-bottom: 1px solid #dee2e6;
          margin-bottom: 20px;
        }
        .content {
          padding: 20px 0;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #dee2e6;
          font-size: 0.9em;
          color: #6c757d;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h2>记账系统通知</h2>
      </div>
      <div class="content">
        ${text.replace(/\n/g, '<br>')}
      </div>
      <div class="footer">
        <p>此邮件由记账系统自动发送，请勿回复。</p>
        <p>如有疑问，请联系系统管理员。</p>
      </div>
    </body>
    </html>
  `;
};

/**
 * 发送支付提醒邮件
 * @param {Object} options - 提醒选项
 * @param {string} options.to - 收件人邮箱
 * @param {string} options.userName - 用户名
 * @param {string} options.billTitle - 账单标题
 * @param {number} options.billAmount - 账单金额
 * @param {Date} options.dueDate - 截止日期
 * @param {string} options.paymentLink - 支付链接
 * @returns {Object} 发送结果
 */
const sendPaymentReminderEmail = async (options) => {
  const {
    to,
    userName,
    billTitle,
    billAmount,
    dueDate,
    paymentLink
  } = options;
  
  const subject = `支付提醒：${billTitle}`;
  
  const message = `
    亲爱的 ${userName}：
    
    您有一笔账单待支付：
    
    账单标题：${billTitle}
    账单金额：${billAmount}
    截止日期：${dueDate ? dueDate.toLocaleDateString() : '无'}
    
    请及时支付以避免逾期。
    
    ${paymentLink ? `点击以下链接进行支付：\n${paymentLink}\n\n` : ''}
    
    此邮件由记账系统自动发送，请勿回复。
  `;
  
  return await sendEmail({
    to,
    subject,
    message
  });
};

/**
 * 发送支付确认邮件
 * @param {Object} options - 确认选项
 * @param {string} options.to - 收件人邮箱
 * @param {string} options.userName - 用户名
 * @param {string} options.billTitle - 账单标题
 * @param {number} options.paymentAmount - 支付金额
 * @param {Date} options.paymentTime - 支付时间
 * @param {string} options.transactionId - 交易ID
 * @returns {Object} 发送结果
 */
const sendPaymentConfirmationEmail = async (options) => {
  const {
    to,
    userName,
    billTitle,
    paymentAmount,
    paymentTime,
    transactionId
  } = options;
  
  const subject = `支付确认：${billTitle}`;
  
  const message = `
    亲爱的 ${userName}：
    
    您已成功支付以下账单：
    
    账单标题：${billTitle}
    支付金额：${paymentAmount}
    支付时间：${paymentTime ? paymentTime.toLocaleString() : '未知'}
    交易ID：${transactionId || '无'}
    
    感谢您的支付！
    
    此邮件由记账系统自动发送，请勿回复。
  `;
  
  return await sendEmail({
    to,
    subject,
    message
  });
};

/**
 * 发送账单分享邮件
 * @param {Object} options - 分享选项
 * @param {string} options.to - 收件人邮箱
 * @param {string} options.fromUserName - 发送人用户名
 * @param {string} options.billTitle - 账单标题
 * @param {string} options.shareLink - 分享链接
 * @returns {Object} 发送结果
 */
const sendBillShareEmail = async (options) => {
  const {
    to,
    fromUserName,
    billTitle,
    shareLink
  } = options;
  
  const subject = `${fromUserName} 与您分享了账单：${billTitle}`;
  
  const message = `
    您好！
    
    ${fromUserName} 与您分享了账单：${billTitle}
    
    点击以下链接查看账单详情：
    ${shareLink}
    
    此邮件由记账系统自动发送，请勿回复。
  `;
  
  return await sendEmail({
    to,
    subject,
    message
  });
};

module.exports = {
  sendEmail,
  sendSMS,
  sendPaymentReminderEmail,
  sendPaymentConfirmationEmail,
  sendBillShareEmail
};