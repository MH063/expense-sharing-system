/**
 * HTTP请求模块
 * 作为http.js的别名，保持向后兼容
 */
import http from './http'

/**
 * 发送HTTP请求
 * @param {Object} config - 请求配置
 * @returns {Promise} 请求结果
 */
export default function request(config) {
  return http(config)
}