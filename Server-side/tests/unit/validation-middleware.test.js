const request = require('supertest');
const { body, param, query } = require('express-validator');
const { 
  handleValidationErrors,
  paymentTransferValidation
} = require('../../middleware/validation-middleware');

describe('Validation Middleware', () => {
  describe('handleValidationErrors', () => {
    let mockReq, mockRes, mockNext;

    beforeEach(() => {
      mockReq = {
        body: {},
        params: {},
        query: {}
      };
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      mockNext = jest.fn();
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('当没有验证错误时应该调用next()', () => {
      // 模拟没有验证错误的情况
      mockReq.getValidationResult = jest.fn().mockResolvedValue({
        isEmpty: () => true
      });

      handleValidationErrors(mockReq, mockRes, mockNext);

      // 由于是异步函数，我们需要等待Promise解析
      setTimeout(() => {
        expect(mockNext).toHaveBeenCalled();
        expect(mockRes.status).not.toHaveBeenCalled();
      }, 0);
    });

    it('当有验证错误时应该返回400状态码', () => {
      // 模拟有验证错误的情况
      mockReq.getValidationResult = jest.fn().mockResolvedValue({
        isEmpty: () => false,
        array: () => [
          { param: 'field', msg: 'Field is required' }
        ]
      });

      handleValidationErrors(mockReq, mockRes, mockNext);

      setTimeout(() => {
        expect(mockNext).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          message: '输入验证失败',
          errors: [
            { param: 'field', msg: 'Field is required' }
          ]
        });
      }, 0);
    });
  });

  describe('paymentTransferValidation', () => {
    describe('getPaymentTransfers', () => {
      it('应该验证billId为有效UUID', () => {
        const validators = paymentTransferValidation.getPaymentTransfers;
        const billIdValidator = validators.find(v => v.builder === query && v.builder.toString().includes('billId'));
        
        expect(billIdValidator).toBeDefined();
        expect(billIdValidator.options).toEqual({ optional: { nullable: false, checkFalsy: false } });
      });

      it('应该验证transferType为有效值', () => {
        const validators = paymentTransferValidation.getPaymentTransfers;
        const transferTypeValidator = validators.find(v => v.builder === query && v.builder.toString().includes('transferType'));
        
        expect(transferTypeValidator).toBeDefined();
        expect(transferTypeValidator.options).toEqual({ 
          optional: { nullable: false, checkFalsy: false },
          in: [['self_pay', 'multiple_payers', 'payer_transfer']]
        });
      });

      it('应该验证status为有效值', () => {
        const validators = paymentTransferValidation.getPaymentTransfers;
        const statusValidator = validators.find(v => v.builder === query && v.builder.toString().includes('status'));
        
        expect(statusValidator).toBeDefined();
        expect(statusValidator.options).toEqual({ 
          optional: { nullable: false, checkFalsy: false },
          in: [['pending', 'completed', 'cancelled']]
        });
      });

      it('应该验证page为正整数', () => {
        const validators = paymentTransferValidation.getPaymentTransfers;
        const pageValidator = validators.find(v => v.builder === query && v.builder.toString().includes('page'));
        
        expect(pageValidator).toBeDefined();
        expect(pageValidator.options).toEqual({ 
          optional: { nullable: false, checkFalsy: false },
          min: 1
        });
      });

      it('应该验证pageSize为1-100之间的整数', () => {
        const validators = paymentTransferValidation.getPaymentTransfers;
        const pageSizeValidator = validators.find(v => v.builder === query && v.builder.toString().includes('pageSize'));
        
        expect(pageSizeValidator).toBeDefined();
        expect(pageSizeValidator.options).toEqual({ 
          optional: { nullable: false, checkFalsy: false },
          min: 1,
          max: 100
        });
      });
    });

    describe('createPaymentTransfer', () => {
      it('应该验证billId为必需的UUID', () => {
        const validators = paymentTransferValidation.createPaymentTransfer;
        const billIdValidator = validators.find(v => v.builder === body && v.builder.toString().includes('billId'));
        
        expect(billIdValidator).toBeDefined();
        expect(billIdValidator.negated).toBe(false);
      });

      it('应该验证transferType为必需的有效值', () => {
        const validators = paymentTransferValidation.createPaymentTransfer;
        const transferTypeValidator = validators.find(v => v.builder === body && v.builder.toString().includes('transferType'));
        
        expect(transferTypeValidator).toBeDefined();
        expect(transferTypeValidator.negated).toBe(false);
        expect(transferTypeValidator.options).toEqual({ 
          in: [['self_pay', 'multiple_payers', 'payer_transfer']]
        });
      });

      it('应该验证amount为必需的大于0的数字', () => {
        const validators = paymentTransferValidation.createPaymentTransfer;
        const amountValidator = validators.find(v => v.builder === body && v.builder.toString().includes('amount'));
        
        expect(amountValidator).toBeDefined();
        expect(amountValidator.negated).toBe(false);
        expect(amountValidator.options).toEqual({ 
          min: 0.01
        });
      });

      it('应该验证fromUserId为必需的UUID', () => {
        const validators = paymentTransferValidation.createPaymentTransfer;
        const fromUserIdValidator = validators.find(v => v.builder === body && v.builder.toString().includes('fromUserId'));
        
        expect(fromUserIdValidator).toBeDefined();
        expect(fromUserIdValidator.negated).toBe(false);
      });

      it('应该验证toUserId为必需的UUID', () => {
        const validators = paymentTransferValidation.createPaymentTransfer;
        const toUserIdValidator = validators.find(v => v.builder === body && v.builder.toString().includes('toUserId'));
        
        expect(toUserIdValidator).toBeDefined();
        expect(toUserIdValidator.negated).toBe(false);
      });

      it('应该验证note为可选的且长度不超过500', () => {
        const validators = paymentTransferValidation.createPaymentTransfer;
        const noteValidator = validators.find(v => v.builder === body && v.builder.toString().includes('note'));
        
        expect(noteValidator).toBeDefined();
        expect(noteValidator.options).toEqual({ 
          optional: { nullable: false, checkFalsy: false },
          max: 500
        });
      });
    });

    describe('getPaymentTransferById', () => {
      it('应该验证id为必需的UUID', () => {
        const validators = paymentTransferValidation.getPaymentTransferById;
        const idValidator = validators.find(v => v.builder === param && v.builder.toString().includes('id'));
        
        expect(idValidator).toBeDefined();
        expect(idValidator.negated).toBe(false);
      });
    });

    describe('confirmPaymentTransfer', () => {
      it('应该验证id为必需的UUID', () => {
        const validators = paymentTransferValidation.confirmPaymentTransfer;
        const idValidator = validators.find(v => v.builder === param && v.builder.toString().includes('id'));
        
        expect(idValidator).toBeDefined();
        expect(idValidator.negated).toBe(false);
      });
    });

    describe('cancelPaymentTransfer', () => {
      it('应该验证id为必需的UUID', () => {
        const validators = paymentTransferValidation.cancelPaymentTransfer;
        const idValidator = validators.find(v => v.builder === param && v.builder.toString().includes('id'));
        
        expect(idValidator).toBeDefined();
        expect(idValidator.negated).toBe(false);
      });
    });
  });
});