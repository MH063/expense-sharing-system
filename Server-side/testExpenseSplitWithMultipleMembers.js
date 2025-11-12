const axios = require('axios');

async function testExpenseSplitWithMultipleMembers() {
  try {
    // 登录用户16(user001)
    const loginResponse = await axios.post('http://localhost:4000/api/auth/login', {
      username: 'user001',
      password: 'password123'
    });

    const token = loginResponse.data.data.accessToken;
    console.log('登录成功，获取到token');

    // 创建费用记录，寝室6有3个成员
    const expenseData = {
      title: '测试多人分摊',
      description: '测试寝室6中3个成员的分摊功能',
      amount: 90, // 90元，3个人分摊，每人30元
      expense_type_id: 1, // 餐饮
      room_id: 6, // 寝室6
      payer_id: 16, // 用户16(user001)
      split_type: 'equal', // 平均分摊
      expense_date: '2025-11-11'
    };

    console.log('创建费用记录:', JSON.stringify(expenseData, null, 2));

    const expenseResponse = await axios.post('http://localhost:4000/api/expenses', expenseData, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('响应状态:', expenseResponse.status);
    console.log('响应数据:', JSON.stringify(expenseResponse.data, null, 2));
    console.log('✅ 费用记录创建成功！');

    // 查询费用记录的分摊情况
    const expenseId = expenseResponse.data.data.id;
    const splitResponse = await axios.get(`http://localhost:4000/api/expenses/splits/${expenseId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('\n分摊记录:');
    console.log(JSON.stringify(splitResponse.data, null, 2));
  } catch (error) {
    console.error('❌ 测试失败:', error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('响应头:', error.response.headers);
    }
  }
}

testExpenseSplitWithMultipleMembers();