const pool = require('./config/database');
const { v4: uuidv4 } = require('uuid');

async function createTestData() {
  try {
    // 生成UUID
    const roomId = uuidv4();
    const expenseTypeId = uuidv4();
    
    // 创建房间
    const roomResult = await pool.query(
      'INSERT INTO rooms (id, name, description, "creatorId", "isActive", created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
      [roomId, '测试房间', '用于测试的房间', 'f6d8366e-80b5-45fa-ac50-bef5c812d457', true, new Date(), new Date()]
    );
    console.log('创建房间成功，ID:', roomId);

    // 创建费用类型
    const expenseTypeResult = await pool.query(
      'INSERT INTO expense_types (id, name, icon, "isActive", created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [expenseTypeId, '餐饮', 'food', true, new Date(), new Date()]
    );
    console.log('创建费用类型成功，ID:', expenseTypeId);

    // 将用户添加到房间
    await pool.query(
      'INSERT INTO user_room_relations (id, user_id, room_id, role, "isActive", created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [uuidv4(), 'f6d8366e-80b5-45fa-ac50-bef5c812d457', roomId, '寝室长', true, new Date(), new Date()]
    );
    console.log('用户添加到房间成功');

    console.log('\n测试数据创建完成:');
    console.log('房间ID:', roomId);
    console.log('费用类型ID:', expenseTypeId);

  } catch (error) {
    console.error('创建测试数据失败:', error);
  }
}

createTestData();