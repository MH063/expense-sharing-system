/**
 * 争议控制器
 */
const disputeService = require('../services/database/dispute-service');

class DisputeController {
  async list(req, res) {
    try {
      const userId = req.user.sub;
      const { page = 1, limit = 20 } = req.query;
      const data = await disputeService.listUserDisputes(userId, { page: parseInt(page), limit: parseInt(limit) });
      res.success(200, '获取争议列表成功', data);
    } catch (error) {
      res.error(500, '获取争议列表失败', error.message);
    }
  }

  async get(req, res) {
    try {
      const userId = req.user.sub;
      const { id } = req.params;
      const data = await disputeService.getById(id, userId);
      if (!data) return res.error(404, '争议不存在');
      res.success(200, '获取争议详情成功', data);
    } catch (error) {
      res.error(500, '获取争议详情失败', error.message);
    }
  }

  async create(req, res) {
    try {
      const userId = req.user.sub;
      // 统一请求字段为 camelCase：billId、reason、details
      const { billId, reason, details } = req.body;
      if (!billId || !reason) {
        return res.error(400, '缺少必要参数 billId 或 reason');
      }
      // 服务层仍使用数据库字段命名 bill_id，这里进行一次映射
      const data = await disputeService.createDispute(userId, { bill_id: billId, reason, details });
      res.success(201, '创建争议成功', data);
    } catch (error) {
      res.error(500, '创建争议失败', error.message);
    }
  }

  async updateStatus(req, res) {
    try {
      const userId = req.user.sub;
      const { id } = req.params;
      const { status } = req.body;
      if (!status) return res.error(400, '缺少必要参数 status');
      const data = await disputeService.updateStatus(id, userId, status);
      if (!data) return res.error(404, '争议不存在或无权限');
      res.success(200, '更新争议状态成功', data);
    } catch (error) {
      res.error(500, '更新争议状态失败', error.message);
    }
  }
}

module.exports = new DisputeController();