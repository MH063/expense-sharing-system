const pool = require('./config/database');

async function getIds() {
  try {
    // 获取房间ID
    const roomsResult = await pool.query('SELECT id, name FROM rooms LIMIT 5');
    console.log('房间列表:');
    if (roomsResult && roomsResult.rows) {
      roomsResult.rows.forEach(room => {
        console.log(`ID: ${room.id}, 名称: ${room.name}`);
      });
    } else {
      console.log('没有找到房间数据');
    }

    // 获取费用类型ID
    const expenseTypesResult = await pool.query('SELECT id, name FROM expense_types LIMIT 5');
    console.log('\n费用类型列表:');
    if (expenseTypesResult && expenseTypesResult.rows) {
      expenseTypesResult.rows.forEach(type => {
        console.log(`ID: ${type.id}, 名称: ${type.name}`);
      });
    } else {
      console.log('没有找到费用类型数据');
    }

    await pool.end();
  } catch (error) {
    console.error('查询失败:', error);
  }
}

getIds();