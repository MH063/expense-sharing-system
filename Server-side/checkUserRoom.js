const db = require('./config/db');

// 查询用户所在的寝室
async function checkUserRoom() {
  try {
    const query = `
      SELECT u.id, u.username, ur.room_id, r.name as room_name
      FROM users u
      JOIN user_rooms ur ON u.id = ur.user_id
      JOIN rooms r ON ur.room_id = r.id
      WHERE u.username = 'payer001'
    `;
    
    const result = await db.query(query);
    console.log('用户payer001所在的寝室信息:');
    console.log(result.rows);
  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    process.exit(0);
  }
}

checkUserRoom();