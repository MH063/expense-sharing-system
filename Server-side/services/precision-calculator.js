/**
 * 高精度计算服务
 * 使用Decimal.js库解决浮点数精度问题
 */

const Decimal = require('decimal.js');

// 设置Decimal.js的全局配置
Decimal.set({
  precision: 28,       // 精度位数
  rounding: Decimal.ROUND_HALF_UP,  // 四舍五入
  toExpNeg: -7,        // 指数格式阈值
  toExpPos: 21
});

class PrecisionCalculator {
  /**
   * 创建Decimal实例
   * @param {number|string|Decimal} value - 要转换的值
   * @returns {Decimal} Decimal实例
   */
  static create(value) {
    return new Decimal(value);
  }

  /**
   * 加法运算
   * @param {number|string|Decimal} a - 被加数
   * @param {number|string|Decimal} b - 加数
   * @returns {number} 计算结果
   */
  static add(a, b) {
    const result = new Decimal(a).plus(b);
    return result.toNumber();
  }

  /**
   * 减法运算
   * @param {number|string|Decimal} a - 被减数
   * @param {number|string|Decimal} b - 减数
   * @returns {number} 计算结果
   */
  static subtract(a, b) {
    const result = new Decimal(a).minus(b);
    return result.toNumber();
  }

  /**
   * 乘法运算
   * @param {number|string|Decimal} a - 被乘数
   * @param {number|string|Decimal} b - 乘数
   * @returns {number} 计算结果
   */
  static multiply(a, b) {
    const result = new Decimal(a).times(b);
    return result.toNumber();
  }

  /**
   * 除法运算
   * @param {number|string|Decimal} a - 被除数
   * @param {number|string|Decimal} b - 除数
   * @returns {number} 计算结果
   */
  static divide(a, b) {
    const result = new Decimal(a).div(b);
    return result.toNumber();
  }

  /**
   * 求余运算
   * @param {number|string|Decimal} a - 被除数
   * @param {number|string|Decimal} b - 除数
   * @returns {number} 计算结果
   */
  static mod(a, b) {
    const result = new Decimal(a).mod(b);
    return result.toNumber();
  }

  /**
   * 幂运算
   * @param {number|string|Decimal} a - 底数
   * @param {number} b - 指数
   * @returns {number} 计算结果
   */
  static pow(a, b) {
    const result = new Decimal(a).pow(b);
    return result.toNumber();
  }

  /**
   * 平方根
   * @param {number|string|Decimal} a - 数值
   * @returns {number} 计算结果
   */
  static sqrt(a) {
    const result = new Decimal(a).sqrt();
    return result.toNumber();
  }

  /**
   * 比较两个值是否相等
   * @param {number|string|Decimal} a - 值A
   * @param {number|string|Decimal} b - 值B
   * @returns {boolean} 比较结果
   */
  static equals(a, b) {
    return new Decimal(a).equals(b);
  }

  /**
   * 比较a是否大于b
   * @param {number|string|Decimal} a - 值A
   * @param {number|string|Decimal} b - 值B
   * @returns {boolean} 比较结果
   */
  static greaterThan(a, b) {
    return new Decimal(a).greaterThan(b);
  }

  /**
   * 比较a是否大于等于b
   * @param {number|string|Decimal} a - 值A
   * @param {number|string|Decimal} b - 值B
   * @returns {boolean} 比较结果
   */
  static greaterThanOrEqualTo(a, b) {
    return new Decimal(a).greaterThanOrEqualTo(b);
  }

  /**
   * 比较a是否小于b
   * @param {number|string|Decimal} a - 值A
   * @param {number|string|Decimal} b - 值B
   * @returns {boolean} 比较结果
   */
  static lessThan(a, b) {
    return new Decimal(a).lessThan(b);
  }

  /**
   * 比较a是否小于等于b
   * @param {number|string|Decimal} a - 值A
   * @param {number|string|Decimal} b - 值B
   * @returns {boolean} 比较结果
   */
  static lessThanOrEqualTo(a, b) {
    return new Decimal(a).lessThanOrEqualTo(b);
  }

  /**
   * 四舍五入到指定小数位
   * @param {number|string|Decimal} a - 数值
   * @param {number} decimalPlaces - 小数位数
   * @returns {number} 计算结果
   */
  static round(a, decimalPlaces = 2) {
    const result = new Decimal(a).toDecimalPlaces(decimalPlaces);
    return result.toNumber();
  }

  /**
   * 向上取整到指定小数位
   * @param {number|string|Decimal} a - 数值
   * @param {number} decimalPlaces - 小数位数
   * @returns {number} 计算结果
   */
  static ceil(a, decimalPlaces = 0) {
    const result = new Decimal(a).toDecimalPlaces(decimalPlaces, Decimal.ROUND_UP);
    return result.toNumber();
  }

  /**
   * 向下取整到指定小数位
   * @param {number|string|Decimal} a - 数值
   * @param {number} decimalPlaces - 小数位数
   * @returns {number} 计算结果
   */
  static floor(a, decimalPlaces = 0) {
    const result = new Decimal(a).toDecimalPlaces(decimalPlaces, Decimal.ROUND_DOWN);
    return result.toNumber();
  }

  /**
   * 格式化金额，保留两位小数
   * @param {number|string|Decimal} value - 数值
   * @returns {string} 格式化后的金额字符串
   */
  static formatCurrency(value) {
    return new Decimal(value).toFixed(2);
  }

  /**
   * 计算百分比
   * @param {number|string|Decimal} part - 部分
   * @param {number|string|Decimal} total - 总数
   * @param {number} decimalPlaces - 小数位数
   * @returns {number} 百分比值
   */
  static percentage(part, total, decimalPlaces = 2) {
    if (new Decimal(total).isZero()) return 0;
    const result = new Decimal(part).div(total).times(100);
    return result.toDecimalPlaces(decimalPlaces).toNumber();
  }

  /**
   * 分摊金额
   * @param {number|string|Decimal} totalAmount - 总金额
   * @param {number} totalShares - 总份数
   * @param {number} shares - 当前份数
   * @param {number} decimalPlaces - 小数位数
   * @returns {number} 分摊金额
   */
  static splitAmount(totalAmount, totalShares, shares, decimalPlaces = 2) {
    if (totalShares <= 0) return 0;
    const result = new Decimal(totalAmount).div(totalShares).times(shares);
    return result.toDecimalPlaces(decimalPlaces).toNumber();
  }

  /**
   * 精确分摊金额，确保所有分摊金额之和等于总金额
   * @param {number|string|Decimal} totalAmount - 总金额
   * @param {Array<number>} sharesArray - 份数数组
   * @param {number} decimalPlaces - 小数位数
   * @returns {Array<number>} 分摊金额数组
   */
  static preciseSplitAmount(totalAmount, sharesArray, decimalPlaces = 2) {
    const totalShares = sharesArray.reduce((sum, shares) => this.add(sum, shares), 0);
    if (totalShares <= 0) return new Array(sharesArray.length).fill(0);

    // 计算每份金额
    const unitAmount = this.divide(totalAmount, totalShares);
    
    // 计算每个人的分摊金额
    const splitAmounts = sharesArray.map(shares => 
      this.round(this.multiply(unitAmount, shares), decimalPlaces)
    );

    // 计算误差
    const totalSplitAmount = splitAmounts.reduce((sum, amount) => this.add(sum, amount), 0);
    const error = this.subtract(totalAmount, totalSplitAmount);
    
    // 将误差分配给第一个非零分摊金额
    if (!this.equals(error, 0)) {
      for (let i = 0; i < splitAmounts.length; i++) {
        if (!this.equals(splitAmounts[i], 0)) {
          splitAmounts[i] = this.add(splitAmounts[i], error);
          break;
        }
      }
    }

    return splitAmounts;
  }
}

module.exports = {
  Decimal,
  PrecisionCalculator
};