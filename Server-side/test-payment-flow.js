const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmNmQ4MzY2ZS04MGI1LTQ1ZmEtYWM1MC1iZWY1YzgxMmQ0NTciLCJ1c2VybmFtZSI6InRlc3R1c2VyMiIsInJvbGUiOiLlronlsI/lsJHlsJQiLCJpYXQiOjE3MTk4MjI3NzcsImV4cCI6MTcxOTgyNjM3N30.K0fL5qK7bKpLq8W5nG5t9rK5t5rK5t5rK5t5rK5t5r";

// 1. 创建费用记录
const createExpenseCommand = `$headers = @{"Content-Type"="application/json"; "Authorization"="Bearer ${token}"}; $body = '{"title":"测试费用","description":"测试支付功能","amount":100.00,"expense_type_id":"1","room_id":"1","payer_id":"f6d8366e-80b5-45fa-ac50-bef5c812d457","split_type":"equal","expense_date":"2024-07-01"}'; Invoke-RestMethod -Uri "http://localhost:4000/api/expenses" -Method POST -Headers $headers -Body $body`;

// 2. 支付费用记录（需要先获取expense_id）
const payExpenseCommand = `$headers = @{"Content-Type"="application/json"; "Authorization"="Bearer ${token}"}; $body = '{"payment_method":"alipay","transaction_id":"test123","payment_time":"2024-07-01T12:00:00Z"}'; Invoke-RestMethod -Uri "http://localhost:4000/api/expenses/{expense_id}/payments/confirm" -Method POST -Headers $headers -Body $body`;

console.log("1. 创建费用记录命令:");
console.log(createExpenseCommand);
console.log("\n2. 支付费用记录命令（需要替换{expense_id}为实际费用ID）:");
console.log(payExpenseCommand);
console.log("\n请在PowerShell中依次运行这些命令来测试支付功能");