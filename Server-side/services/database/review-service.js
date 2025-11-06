/**
 * 评价服务
 */
const BaseService = require('./base-service');
const { v4: uuidv4 } = require('uuid');

class ReviewService extends BaseService {
  constructor() {
    super('reviews');
  }

  async listUserReviews(userId, { page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;
    const sql = `SELECT * FROM reviews WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`;
    const result = await this.query(sql, [userId, limit, offset]);
    return result.rows;
  }

  async createReview(userId, { bill_id, rating, comment }) {
    const id = uuidv4();
    const sql = `INSERT INTO reviews (id, user_id, bill_id, rating, comment) VALUES ($1, $2, $3, $4, $5) RETURNING *`;
    const result = await this.query(sql, [id, userId, bill_id, rating, comment || '']);
    return result.rows[0];
  }
}

module.exports = new ReviewService();