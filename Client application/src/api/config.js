/**
 * 统一API配置文件
 * 导出配置好的HTTP客户端实例，供所有API文件使用
 */
import http from '../utils/http'

// 导出配置好的HTTP客户端
export default http

// 导出常用的请求方法，方便使用
export const request = {
  get: (url, config) => http.get(url, config),
  post: (url, data, config) => http.post(url, data, config),
  put: (url, data, config) => http.put(url, data, config),
  delete: (url, config) => http.delete(url, config),
  patch: (url, data, config) => http.patch(url, data, config)
}