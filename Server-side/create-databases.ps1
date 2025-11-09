# 数据库创建脚本
Write-Host "正在创建记账系统的开发、测试和生产环境数据库..." -ForegroundColor Green
Write-Host ""

# 获取PostgreSQL密码
$pgPassword = "123456789"  # 从.env文件中获取的默认密码

# 设置环境变量以便psql使用
$env:PGPASSWORD = $pgPassword

try {
    # 创建开发环境数据库
    Write-Host "1. 正在创建开发环境数据库 (expense_dev)..." -ForegroundColor Yellow
    psql -U postgres -d postgres -h localhost -p 5432 -f "db/create-database-dev.sql"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   √ 开发环境数据库创建成功" -ForegroundColor Green
    } else {
        Write-Host "   × 开发环境数据库创建失败" -ForegroundColor Red
    }

    Write-Host ""

    # 创建测试环境数据库
    Write-Host "2. 正在创建测试环境数据库 (expense_test)..." -ForegroundColor Yellow
    psql -U postgres -d postgres -h localhost -p 5432 -f "db/create-database-test.sql"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   √ 测试环境数据库创建成功" -ForegroundColor Green
    } else {
        Write-Host "   × 测试环境数据库创建失败" -ForegroundColor Red
    }

    Write-Host ""

    # 创建生产环境数据库
    Write-Host "3. 正在创建生产环境数据库 (expense_prod)..." -ForegroundColor Yellow
    psql -U postgres -d postgres -h localhost -p 5432 -f "db/create-database-prod.sql"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   √ 生产环境数据库创建成功" -ForegroundColor Green
    } else {
        Write-Host "   × 生产环境数据库创建失败" -ForegroundColor Red
    }

    Write-Host ""
    Write-Host "所有数据库创建操作已完成！" -ForegroundColor Green
    Write-Host ""
    Write-Host "下一步操作：" -ForegroundColor Cyan
    Write-Host "1. 运行 'npm run schema:dev' 初始化开发环境表结构" -ForegroundColor Cyan
    Write-Host "2. 运行 'npm run schema:test' 初始化测试环境表结构" -ForegroundColor Cyan
    Write-Host "3. 运行 'npm run schema:prod' 初始化生产环境表结构" -ForegroundColor Cyan
}
catch {
    Write-Host "执行过程中发生错误: $($_.Exception.Message)" -ForegroundColor Red
}
finally {
    # 清除环境变量
    Remove-Item env:PGPASSWORD -ErrorAction SilentlyContinue
}