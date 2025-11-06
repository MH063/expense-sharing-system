import axios from 'axios'
import { ElMessage } from 'element-plus'

// 创建axios实例
const request = axios.create({
  baseURL: 'http://localhost:4000', // 后端API地址
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
request.interceptors.request.use(
  config => {
    // 在发送请求之前做些什么，例如加入token
    const token = localStorage.getItem('admin-token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => {
    // 对请求错误做些什么
    console.error('请求错误:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
request.interceptors.response.use(
  response => {
    // 对响应数据做点什么
    const res = response.data
    
    // 处理后端返回的双层嵌套结构 {success:true，data:{xxx：[]}}
    if (res.success) {
      return res
    }
    
    // 如果返回的状态码为200，说明接口请求成功，可以正常拿到数据
    if (res.code === 200) {
      return res
    } else {
      // 否则的话抛出错误
      ElMessage.error(res.message || '请求失败')
      return Promise.reject(new Error(res.message || '请求失败'))
    }
  },
  error => {
    // 对响应错误做点什么
    console.error('响应错误:', error)
    if (error.response) {
      switch (error.response.status) {
        case 401:
          ElMessage.error('未授权，请登录')
          // 清除token并跳转到登录页
          localStorage.removeItem('admin-token')
          localStorage.removeItem('admin-user')
          window.location.href = '/login'
          break
        case 403:
          ElMessage.error('拒绝访问')
          break
        case 404:
          ElMessage.error('请求地址出错')
          break
        case 500:
          ElMessage.error('服务器内部错误')
          break
        default:
          ElMessage.error(`连接出错${error.response.status}`)
      }
    } else {
      ElMessage.error('连接服务器失败')
    }
    return Promise.reject(error)
  }
)

export default request