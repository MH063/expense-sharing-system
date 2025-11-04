# 健康检查端点测试工具
# 使用方法: .\test-health-with-signature.ps1

param(
    [string]$uri = "http://localhost:4000/health",
    [string]$method = "GET",
    [string]$secret = "sgn_3f0d2a9b5c6e1d8f7a0b4c3e2f9a1d6c"
)

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

Write-Host "请求方法: $method"
Write-Host "请求路径: $path"
Write-Host "查询参数: $query"
Write-Host "签名串: $signString"
Write-Host "时间戳: $timestamp"
Write-Host "签名: $signature"
Write-Host ""

# 发送请求
$headers = @{
    "X-Timestamp" = $timestamp
    "X-Signature" = $signature
}

try {
    $response = Invoke-WebRequest -Uri $uri -Method $method -Headers $headers
    Write-Host "请求成功! (状态码: $($response.StatusCode))"
    Write-Host "响应内容:"
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