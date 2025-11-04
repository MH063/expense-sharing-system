# 健康检查端点测试指南

## 概述

健康检查端点位于 `/health`，用于检查服务器状态、数据库连接和WebSocket状态。

## 签名验证

健康检查端点需要签名验证。签名验证使用以下参数：

- 密钥: `sgn_3f0d2a9b5c6e1d8f7a0b4c3e2f9a1d6c`
- 签名算法: HMAC-SHA256
- 时间戳偏差: 300秒

## 签名生成方法

1. 构造签名串: `{METHOD}{PATH}{QUERY}{TIMESTAMP}`
   - METHOD: HTTP方法（如GET）
   - PATH: 请求路径（如/health）
   - QUERY: 查询参数（空字符串）
   - TIMESTAMP: 当前Unix时间戳（秒）

2. 使用HMAC-SHA256算法和密钥计算签名

3. 将签名结果转换为小写十六进制字符串

## 测试方法

### 方法1：使用PowerShell命令

复制以下命令到PowerShell中执行：

```powershell
# 设置参数
$uri = "http://localhost:4000/health"
$method = "GET"
$secret = "sgn_3f0d2a9b5c6e1d8f7a0b4c3e2f9a1d6c"

# 解析URI获取路径
$uriObj = [System.Uri]$uri
$path = $uriObj.AbsolutePath
$query = $uriObj.Query

# 获取当前时间戳（秒）
$timestamp = [int][double]::Parse((Get-Date -UFormat %s))

# 构造签名串
$signString = "$method$path$query$timestamp"

# 计算HMAC-SHA256签名
$hmac = New-Object System.Security.Cryptography.HMACSHA256
$hmac.Key = [System.Text.Encoding]::UTF8.GetBytes($secret)
$signatureBytes = $hmac.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($signString))
$signature = [System.BitConverter]::ToString($signatureBytes).Replace("-", "").ToLower()

# 创建请求头并发送请求
$headers = @{"X-Timestamp" = $timestamp; "X-Signature" = $signature}
$response = Invoke-WebRequest -Uri $uri -Method $method -Headers $headers
Write-Host "请求成功! 状态码: $($response.StatusCode)"
Write-Host "响应内容: $($response.Content)"
```

### 方法2：使用测试文件

1. 打开 `test-health-commands.txt` 文件
2. 复制其中的PowerShell命令
3. 粘贴到PowerShell中执行

## 预期响应

成功的响应应该如下：

```json
{
  "success": true,
  "data": {
    "status": "OK",
    "environment": "production",
    "database": "Connected",
    "websocket": {
      "totalConnections": 0,
      "timestamp": "2025-11-04T05:17:53.038Z"
    },
    "timestamp": "2025-11-04T05:17:53.038Z"
  }
}
```

## 常见错误

1. **缺少签名或时间戳**: 确保请求头包含X-Signature和X-Timestamp
2. **请求已过期或时间偏差过大**: 检查客户端和服务器时间是否同步
3. **签名验证失败**: 确保签名生成方法正确

## 临时禁用签名验证

如果需要临时禁用签名验证进行测试：

1. 修改 `.env.production` 文件中的 `ENABLE_REQUEST_SIGNATURE=false`
2. 重启服务器
3. 直接访问 `http://localhost:4000/health`

**注意**: 测试完成后记得恢复签名验证！