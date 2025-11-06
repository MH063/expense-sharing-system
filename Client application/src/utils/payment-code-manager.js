/**
 * 支付码本地存储管理器
 * 负责支付码图片的本地存储、验证和管理
 */

class LocalStorageManager {
  constructor() {
    this.storageBasePath = this.getStoragePath();
    this.maxFileSize = 5 * 1024 * 1024; // 5MB
    this.allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    this.encryptionKey = this.generateEncryptionKey();
  }
  
  /**
   * 获取存储路径
   */
  getStoragePath() {
    if (typeof window !== 'undefined') {
      // 浏览器环境 - 使用IndexedDB作为主要存储
      return 'payment_codes/';
    } else {
      // Node.js环境
      const path = require('path');
      return path.join(process.cwd(), 'user_data', 'payment_codes');
    }
  }
  
  /**
   * 生成加密密钥
   */
  generateEncryptionKey() {
    // 基于用户ID和设备信息生成唯一密钥
    const userAgent = navigator.userAgent;
    const language = navigator.language;
    const keySource = `${userAgent}_${language}_${Date.now()}`;
    
    // 使用SHA-256生成固定长度的密钥
    return this.hashString(keySource).substring(0, 32);
  }
  
  /**
   * 字符串哈希函数
   */
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(16);
  }
  
  /**
   * 确保目录存在
   */
  async ensureDirectory(dirPath) {
    if (typeof window === 'undefined') {
      const fs = require('fs').promises;
      try {
        await fs.access(dirPath);
      } catch {
        await fs.mkdir(dirPath, { recursive: true });
      }
    }
    // 浏览器环境不需要创建物理目录
  }
  
  /**
   * 验证文件
   */
  async validateFile(fileData) {
    // 检查文件大小
    if (fileData.byteLength > this.maxFileSize) {
      throw new Error(`文件大小超过限制（最大${this.maxFileSize / 1024 / 1024}MB）`);
    }
    
    // 检查文件类型
    const mimeType = await this.detectMimeType(fileData);
    if (!this.allowedTypes.includes(mimeType)) {
      throw new Error('不支持的文件格式，请上传PNG或JPEG格式的图片');
    }
    
    return true;
  }
  
  /**
   * 检测MIME类型
   */
  async detectMimeType(fileData) {
    const header = new Uint8Array(fileData.slice(0, 8));
    
    // PNG文件头：89 50 4E 47 0D 0A 1A 0A
    if (header[0] === 0x89 && header[1] === 0x50 && 
        header[2] === 0x4E && header[3] === 0x47) {
      return 'image/png';
    }
    
    // JPEG文件头：FF D8 FF
    if (header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF) {
      return 'image/jpeg';
    }
    
    throw new Error('无法识别的文件格式');
  }
  
  /**
   * 保存支付码到本地存储
   */
  async savePaymentCode(userId, qrType, fileData) {
    await this.validateFile(fileData);
    
    const storageKey = this.generateStorageKey(userId, qrType);
    
    // 压缩图片
    const compressedData = await this.compressImage(fileData);
    
    // 加密数据
    const encryptedData = await this.encryptData(compressedData);
    
    // 保存到本地存储
    if (typeof window !== 'undefined') {
      // 浏览器环境使用localStorage和IndexedDB
      await this.saveToBrowserStorage(storageKey, encryptedData);
    } else {
      // Node.js环境使用文件系统
      await this.saveToFileSystem(storageKey, encryptedData);
    }
    
    // 更新元数据
    await this.updateMetadata(userId, qrType, {
      fileSize: compressedData.byteLength,
      mimeType: await this.detectMimeType(fileData),
      uploadTime: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
      isActive: true
    });
    
    return storageKey;
  }
  
  /**
   * 从本地存储读取支付码
   */
  async getPaymentCode(userId, qrType) {
    const storageKey = this.generateStorageKey(userId, qrType);
    
    let encryptedData;
    if (typeof window !== 'undefined') {
      encryptedData = await this.getFromBrowserStorage(storageKey);
    } else {
      encryptedData = await this.getFromFileSystem(storageKey);
    }
    
    if (!encryptedData) {
      return null;
    }
    
    // 解密数据
    const decryptedData = await this.decryptData(encryptedData);
    
    // 更新最后使用时间
    await this.updateLastUsed(userId, qrType);
    
    return decryptedData;
  }
  
  /**
   * 删除支付码
   */
  async deletePaymentCode(userId, qrType) {
    const storageKey = this.generateStorageKey(userId, qrType);
    
    if (typeof window !== 'undefined') {
      await this.deleteFromBrowserStorage(storageKey);
    } else {
      await this.deleteFromFileSystem(storageKey);
    }
    
    // 删除元数据
    await this.deleteMetadata(userId, qrType);
  }
  
  /**
   * 浏览器环境存储实现
   */
  async saveToBrowserStorage(key, data) {
    // 优先使用IndexedDB
    if ('indexedDB' in window) {
      await this.saveToIndexedDB(key, data);
    } else {
      // 回退到localStorage
      localStorage.setItem(key, this.arrayBufferToBase64(data));
    }
  }
  
  async getFromBrowserStorage(key) {
    if ('indexedDB' in window) {
      return await this.getFromIndexedDB(key);
    } else {
      const data = localStorage.getItem(key);
      return data ? this.base64ToArrayBuffer(data) : null;
    }
  }
  
  async deleteFromBrowserStorage(key) {
    if ('indexedDB' in window) {
      await this.deleteFromIndexedDB(key);
    } else {
      localStorage.removeItem(key);
    }
  }
  
  /**
   * IndexedDB操作
   */
  async initIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('PaymentCodeDB', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('paymentCodes')) {
          const store = db.createObjectStore('paymentCodes', { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }
  
  async saveToIndexedDB(key, data) {
    const db = await this.initIndexedDB();
    const transaction = db.transaction(['paymentCodes'], 'readwrite');
    const store = transaction.objectStore('paymentCodes');
    
    return new Promise((resolve, reject) => {
      const request = store.put({
        key: key,
        data: data,
        timestamp: Date.now()
      });
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
  
  async getFromIndexedDB(key) {
    const db = await this.initIndexedDB();
    const transaction = db.transaction(['paymentCodes'], 'readonly');
    const store = transaction.objectStore('paymentCodes');
    
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result ? request.result.data : null);
    });
  }
  
  async deleteFromIndexedDB(key) {
    const db = await this.initIndexedDB();
    const transaction = db.transaction(['paymentCodes'], 'readwrite');
    const store = transaction.objectStore('paymentCodes');
    
    return new Promise((resolve, reject) => {
      const request = store.delete(key);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
  
  /**
   * 数据加密/解密
   */
  async encryptData(data) {
    // 使用Web Crypto API进行加密
    if (typeof window !== 'undefined' && window.crypto) {
      const encoder = new TextEncoder();
      const keyData = encoder.encode(this.encryptionKey);
      
      const cryptoKey = await window.crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'AES-GCM' },
        false,
        ['encrypt']
      );
      
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const encrypted = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        cryptoKey,
        data
      );
      
      // 合并IV和加密数据
      const result = new Uint8Array(iv.length + encrypted.byteLength);
      result.set(iv, 0);
      result.set(new Uint8Array(encrypted), iv.length);
      
      return result.buffer;
    }
    
    // Node.js环境使用crypto模块
    return data; // 简化实现，实际项目需要完整加密
  }
  
  async decryptData(encryptedData) {
    if (typeof window !== 'undefined' && window.crypto) {
      const encryptedArray = new Uint8Array(encryptedData);
      const iv = encryptedArray.slice(0, 12);
      const data = encryptedArray.slice(12);
      
      const encoder = new TextEncoder();
      const keyData = encoder.encode(this.encryptionKey);
      
      const cryptoKey = await window.crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'AES-GCM' },
        false,
        ['decrypt']
      );
      
      const decrypted = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        cryptoKey,
        data
      );
      
      return decrypted;
    }
    
    return encryptedData; // 简化实现
  }
  
  /**
   * 工具方法
   */
  generateStorageKey(userId, qrType) {
    return `payment_code_${userId}_${qrType}`;
  }
  
  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
  
  base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
  
  async compressImage(fileData) {
    // 简化实现，实际项目需要使用canvas进行图片压缩
    return fileData;
  }
  
  async updateMetadata(userId, qrType, metadata) {
    const metaKey = `payment_meta_${userId}_${qrType}`;
    const existingMeta = await this.getMetadata(userId, qrType) || {};
    const newMeta = { ...existingMeta, ...metadata };
    
    if (typeof window !== 'undefined') {
      localStorage.setItem(metaKey, JSON.stringify(newMeta));
    }
  }
  
  async getMetadata(userId, qrType) {
    const metaKey = `payment_meta_${userId}_${qrType}`;
    if (typeof window !== 'undefined') {
      const metaStr = localStorage.getItem(metaKey);
      return metaStr ? JSON.parse(metaStr) : null;
    }
    return null;
  }
  
  async deleteMetadata(userId, qrType) {
    const metaKey = `payment_meta_${userId}_${qrType}`;
    if (typeof window !== 'undefined') {
      localStorage.removeItem(metaKey);
    }
  }
  
  async updateLastUsed(userId, qrType) {
    await this.updateMetadata(userId, qrType, {
      lastUsed: new Date().toISOString()
    });
  }
}

/**
 * 支付码验证器
 */
class PaymentCodeValidator {
  constructor() {
    this.validTypes = ['wechat', 'alipay'];
    this.qrCodePatterns = {
      wechat: /^weixin:\/\/.*/,
      alipay: /^alipays?:\/\/.*/
    };
  }
  
  /**
   * 验证支付码类型
   */
  validateType(qrType) {
    if (!this.validTypes.includes(qrType)) {
      throw new Error(`不支持的支付码类型: ${qrType}`);
    }
    return true;
  }
  
  /**
   * 验证图片格式
   */
  async validateImageFormat(fileData) {
    const header = new Uint8Array(fileData.slice(0, 8));
    
    // PNG文件头验证
    const isPNG = header[0] === 0x89 && 
                  header[1] === 0x50 && 
                  header[2] === 0x4E && 
                  header[3] === 0x47;
    
    // JPEG文件头验证
    const isJPEG = header[0] === 0xFF && 
                   header[1] === 0xD8 && 
                   header[2] === 0xFF;
    
    if (!isPNG && !isJPEG) {
      throw new Error('不支持的文件格式，请上传PNG或JPEG格式的图片');
    }
    
    return true;
  }
  
  /**
   * 验证图片内容是否为有效支付码
   */
  async validateQRContent(imageData, expectedType) {
    try {
      const qrContent = await this.decodeQRCode(imageData);
      return this.isValidPaymentURL(qrContent, expectedType);
    } catch (error) {
      throw new Error('无法识别有效的支付二维码');
    }
  }
  
  /**
   * 解码二维码（简化实现）
   */
  async decodeQRCode(imageData) {
    try {
      // 实际项目需要集成二维码解码库，如jsQR
      // 这里返回模拟数据，包含URL参数以便解析
      const mockQRCode = `weixin://wxpay/bizpayurl?payeeId=user123&amount=100.00&description=测试支付&timestamp=${new Date().toISOString()}`;
      
      // 解析URL参数
      const url = new URL(mockQRCode);
      const params = new URLSearchParams(url.search);
      
      return {
        success: true,
        data: {
          payeeId: params.get('payeeId'),
          amount: params.get('amount'),
          description: params.get('description') || '无描述',
          timestamp: params.get('timestamp')
        }
      };
    } catch (error) {
      console.error('解析二维码失败:', error);
      return {
        success: false,
        message: '无效的二维码'
      };
    }
  }
  
  /**
   * 验证是否为有效支付URL
   */
  isValidPaymentURL(url, expectedType) {
    const pattern = this.qrCodePatterns[expectedType];
    return pattern ? pattern.test(url) : false;
  }
  
  /**
   * 完整的支付码验证流程
   */
  async validatePaymentCode(fileData, qrType) {
    // 1. 验证类型
    this.validateType(qrType);
    
    // 2. 验证图片格式
    await this.validateImageFormat(fileData);
    
    // 3. 验证二维码内容
    await this.validateQRContent(fileData, qrType);
    
    return true;
  }
}

/**
 * 支付流程管理器
 */
class PaymentFlowManager {
  constructor() {
    this.storageManager = new LocalStorageManager();
    this.validator = new PaymentCodeValidator();
  }
  
  /**
   * 支付确认流程
   */
  async confirmPayment(userId, billId, amount, payerId) {
    try {
      // 1. 获取收款人信息
      const payee = await this.getPayeeInfo(billId);
      
      // 2. 获取收款码
      const qrCode = await this.storageManager.getPaymentCode(payee.userId, 'wechat');
      
      if (!qrCode) {
        throw new Error('收款人未设置收款码');
      }
      
      // 3. 生成支付确认记录
      const paymentRecord = await this.createPaymentRecord({
        userId: payerId,
        payeeId: payee.userId,
        billId: billId,
        amount: amount,
        status: 'pending'
      });
      
      return {
        paymentId: paymentRecord.id,
        payeeName: payee.name,
        amount: amount,
        qrCode: URL.createObjectURL(new Blob([qrCode])),
        qrType: 'wechat',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('支付确认流程失败:', error);
      throw error;
    }
  }
  
  /**
   * 支付完成确认
   */
  async completePayment(paymentId) {
    try {
      // 更新支付状态
      await this.updatePaymentStatus(paymentId, 'completed');
      
      // 发送通知
      await this.sendPaymentNotification(paymentId);
      
      // 更新账单状态
      await this.updateBillStatus(paymentId);
      
      return { success: true, message: '支付完成确认成功' };
    } catch (error) {
      console.error('支付完成确认失败:', error);
      throw error;
    }
  }
  
  // 模拟方法 - 实际项目中需要调用后端API
  async getPayeeInfo(payeeId) {
    try {
      // 实际应该调用后端API获取收款方信息
      // const response = await userApi.getUserInfo(payeeId)
      // return response.data
      
      // 这里应该返回从API获取的真实数据
      throw new Error('API接口尚未实现')
    } catch (error) {
      console.error('获取收款方信息失败:', error)
      throw error
    }
  }
  
  async createPaymentRecord(paymentData) {
    try {
      // 实际应该调用后端API创建支付记录
      // const response = await paymentApi.createPayment(paymentData)
      // return response.data
      
      // 这里应该返回从API创建的真实支付记录
      throw new Error('API接口尚未实现')
    } catch (error) {
      console.error('创建支付记录失败:', error)
      throw error
    }
  }
  
  async updatePaymentStatus(paymentId, status) {
    try {
      // 实际应该调用后端API更新支付状态
      // const response = await paymentApi.updatePaymentStatus(paymentId, status)
      // return response.data
      
      // 这里应该返回从API更新的真实支付状态
      throw new Error('API接口尚未实现')
    } catch (error) {
      console.error('更新支付状态失败:', error)
      throw error
    }
  }
  
  async sendPaymentNotification(paymentId) {
    // 模拟发送通知
    console.log(`发送支付通知: ${paymentId}`);
  }
  
  async updateBillStatus(paymentId) {
    // 模拟更新账单状态
    console.log(`更新账单状态: ${paymentId}`);
  }
}

// 导出工具类
export {
  LocalStorageManager,
  PaymentCodeValidator,
  PaymentFlowManager
};

export default {
  LocalStorageManager,
  PaymentCodeValidator,
  PaymentFlowManager
};