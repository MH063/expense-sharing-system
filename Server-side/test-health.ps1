# 健康检查端点签名测试脚本

# 设置参数
$secret = "sgn_3f0d2a9b5c6e1d8f7a0b4c3e2f9a1d6c"
$method = "GET"
$path = "/health"
$query = ""
$body = ""

# 获取当前时间戳（秒）
$timestamp = [int][double]::Parse((Get-Date -UFormat %s))

# 构造签名串
$signString = "$method$path$query$body$timestamp"

# 计算HMAC-SHA256签名
$hmac = New-Object System.Security.Cryptography.HMACSHA256
$hmac.Key = [System.Text.Encoding]::UTF8.GetBytes($secret)
$signatureBytes = $hmac.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($signString))
$signature = [System.BitConverter]::ToString($signatureBytes).Replace("-", "").ToLower()

Write-Host "签名串: $signString"
Write-Host "时间戳: $timestamp"
Write-Host "签名: $signature"

# 发送请求
try {
    $response = Invoke-WebRequest -Uri "http://localhost:4000/health" -Method GET -Headers @{
        "X-Timestamp" = $timestamp
        "X-Signature" = $signature
    }
    Write-Host "请求成功!"
    Write-Host $response.Content
} 
catch {
    Write-Host "请求失败: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "响应内容: $errorBody"
    }
}