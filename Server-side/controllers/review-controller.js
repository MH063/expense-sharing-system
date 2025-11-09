/**
 * 评价控制器
 */
const reviewService = require('../services/database/review-service');

class ReviewController {
  async list(req, res) {
    try {
      const userId = req.user.sub;
      const { page = 1, limit = 20 } = req.query;
      const data = await reviewService.listUserReviews(userId, { page: parseInt(page), limit: parseInt(limit) });
      res.success(200, '获取评价列表成功', data);
    } catch (error) {
      res.error(500, '获取评价列表失败', error.message);
    }
  }

  async create(req, res) {
    try {
      const userId = req.user.sub;
      // 统一请求字段为 camelCase：billId、rating、comment
      const { billId, rating, comment } = req.body;
      if (!billId || rating === undefined) {
        return res.clientError('缺少必要参数 billId 或 rating');
      }
      // 映射到服务层数据库字段命名 bill_id
      const data = await reviewService.createReview(userId, { bill_id: billId, rating: parseInt(rating), comment });
      res.success(201, '创建评价成功', data);
    } catch (error) {
      res.error(500, '创建评价失败', error.message);
    }
  }
}

module.exports = new ReviewController();