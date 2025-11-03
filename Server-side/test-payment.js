const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmNmQ4MzY2ZS04MGI1LTQ1ZmEtYWM1MC1iZWY1YzgxMmQ0NTciLCJ1c2VybmFtZSI6InRlc3R1c2VyMiIsInJvbGUiOiLlronlsI/lsJHlsJQiLCJpYXQiOjE3MTk4MjI3NzcsImV4cCI6MTcxOTgyNjM3N30.K0fL5qK7bKpLq8W5nG5t9rK5t5rK5t5rK5t5rK5t5r";

// 使用PowerShell的curl命令测试支付功能
const command = `curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer ${token}" -d '{"expense_id":"f6d8366e-80b5-45fa-ac50-bef5c812d457","amount":50.00,"payment_method":"支付宝","payment_date":"2024-07-01"}' http://localhost:4000/api/expenses/pay`;

console.log("执行命令:", command);
console.log("\n请在PowerShell中运行此命令来测试支付功能");