const axios = require('axios');

// 测试创建费用
async function testCreateExpense() {
  try {
    // 首先登录payer001用户获取token
    const loginResponse = await axios.post('http://localhost:4000/api/auth/login', {
      username: 'payer001',
      password: 'Payer123!@#'
    });

    const { accessToken } = loginResponse.data.data;
    console.log('登录成功，获取到token');
    
    // 查询费用类型
    const expenseTypesResponse = await axios.get('http://localhost:4000/api/expense-types', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    console.log('可用费用类型:');
    console.table(expenseTypesResponse.data.data);
    
    // 查询寝室信息
    const roomsResponse = await axios.get('http://localhost:4000/api/rooms', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    console.log('\n用户所在寝室:');
    console.table(roomsResponse.data.data);

    // 创建费用
    const expenseData = {
      title: '测试费用-水电费',
      amount: 150.50,
      expense_type_id: 1, // 使用第一个费用类型
      room_id: 6, // 使用刚创建的寝室
      payer_id: 15, // payer001的ID
      split_type: 'equal'
    };

    console.log('\n创建费用数据:', expenseData);

    const createResponse = await axios.post('http://localhost:4000/api/expenses', expenseData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    });

    console.log('\n创建费用成功:');
    console.log(JSON.stringify(createResponse.data, null, 2));
    
  } catch (error) {
    console.error('测试失败:', error.response ? error.response.data : error.message);
  }
}

testCreateExpense();