/**
 * 争议服务
 */
const BaseService = require('./base-service');
const { v4: uuidv4 } = require('uuid');

class DisputeService extends BaseService {
  constructor() {
    super('disputes');
  }

  async listUserDisputes(userId, { page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;
    const sql = `SELECT * FROM disputes WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`;
    const result = await this.query(sql, [userId, limit, offset]);
    return result.rows;
  }

  async getById(id, userId) {
    const sql = `SELECT * FROM disputes WHERE id = $1 AND user_id = $2`;
    const result = await this.query(sql, [id, userId]);
    return result.rows[0] || null;
  }

  async createDispute(userId, { bill_id, reason, details }) {
    const id = uuidv4();
    const sql = `INSERT INTO disputes (id, user_id, bill_id, reason, details, status) VALUES ($1, $2, $3, $4, $5, 'OPEN') RETURNING *`;
    const result = await this.query(sql, [id, userId, bill_id, reason, JSON.stringify(details || {})]);
    return result.rows[0];
  }

  async updateStatus(id, userId, status) {
    const sql = `UPDATE disputes SET status = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING *`;
    const result = await this.query(sql, [status, id, userId]);
    return result.rows[0] || null;
  }
}

module.exports = new DisputeService();