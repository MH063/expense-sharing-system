@echo off
echo 健康检查端点测试工具
echo.

powershell -Command "$uri = 'http://localhost:4000/health'; $method = 'GET'; $secret = 'sgn_3f0d2a9b5c6e1d8f7a0b4c3e2f9a1d6c'; $uriObj = [System.Uri]$uri; $path = $uriObj.AbsolutePath; $query = $uriObj.Query; $timestamp = [int][double]::Parse((Get-Date -UFormat %%s)); $signString = \"$method$path$query$timestamp\"; $hmac = New-Object System.Security.Cryptography.HMACSHA256; $hmac.Key = [System.Text.Encoding]::UTF8.GetBytes($secret); $signatureBytes = $hmac.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($signString)); $signature = [System.BitConverter]::ToString($signatureBytes).Replace('-', '').ToLower(); Write-Host \"签名串: $signString\"; Write-Host \"时间戳: $timestamp\"; Write-Host \"签名: $signature\"; $headers = @{\"X-Timestamp\" = $timestamp; \"X-Signature\" = $signature}; try { $response = Invoke-WebRequest -Uri $uri -Method $method -Headers $headers; Write-Host \"请求成功! 状态码: $($response.StatusCode)\"; Write-Host \"响应内容: $($response.Content)\" } catch { Write-Host \"请求失败: $($_.Exception.Message)\" }"

echo.
pause