const db = require('./config/db');
const bcrypt = require('bcrypt');

// 创建测试寝室并添加用户
async function createTestRoom() {
  try {
    // 1. 创建一个新寝室
    const roomQuery = `
      INSERT INTO rooms (name, description, creator_id)
      VALUES ('测试寝室', '用于测试费用功能的寝室', 14)
      RETURNING id
    `;
    
    const roomResult = await db.query(roomQuery);
    const roomId = roomResult.rows[0].id;
    console.log(`创建寝室成功，ID: ${roomId}`);
    
    // 2. 将用户添加到寝室中，使用user_room_relations表
    const users = [
      { id: 14, username: 'dormleader001', relation_type: 'owner' },
      { id: 15, username: 'payer001', relation_type: 'member' },
      { id: 16, username: 'user001', relation_type: 'member' }
    ];
    
    for (const user of users) {
      // 先检查用户是否已经在其他寝室中
      const checkQuery = `
        SELECT * FROM user_room_relations 
        WHERE user_id = $1 AND is_active = true
      `;
      
      const checkResult = await db.query(checkQuery, [user.id]);
      
      if (checkResult.rows.length > 0) {
        // 如果用户已在其他寝室中，更新为不活跃
        const updateQuery = `
          UPDATE user_room_relations 
          SET is_active = false, leave_date = NOW()
          WHERE user_id = $1 AND is_active = true
        `;
        
        await db.query(updateQuery, [user.id]);
        console.log(`用户 ${user.username} 已从原寝室中移除`);
      }
      
      // 添加用户到新寝室
      const userRoomQuery = `
        INSERT INTO user_room_relations (user_id, room_id, relation_type, join_date, is_active)
        VALUES ($1, $2, $3, NOW(), true)
      `;
      
      await db.query(userRoomQuery, [user.id, roomId, user.relation_type]);
      console.log(`已将用户 ${user.username} 添加到寝室 ${roomId}`);
    }
    
    // 3. 更新用户密码
    const passwords = [
      { id: 14, username: 'dormleader001', password: 'DormLeader123!@#' },
      { id: 15, username: 'payer001', password: 'Payer123!@#' },
      { id: 16, username: 'user001', password: 'User123!@#' }
    ];
    
    for (const user of passwords) {
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(user.password, saltRounds);
      
      const updatePasswordQuery = `
        UPDATE users 
        SET password_hash = $1
        WHERE id = $2
      `;
      
      await db.query(updatePasswordQuery, [hashedPassword, user.id]);
      console.log(`已更新用户 ${user.username} 的密码`);
    }
    
    // 4. 验证创建结果
    const verifyQuery = `
      SELECT u.id, u.username, ur.room_id, ur.relation_type, r.name as room_name
      FROM users u
      JOIN user_room_relations ur ON u.id = ur.user_id
      JOIN rooms r ON ur.room_id = r.id
      WHERE u.id IN (14, 15, 16) AND ur.is_active = true
      ORDER BY u.id
    `;
    
    const verifyResult = await db.query(verifyQuery);
    console.log('\n验证结果:');
    console.table(verifyResult.rows);
    
    console.log('\n测试寝室创建完成！');
    console.log('寝室ID:', roomId);
    console.log('用户账号信息:');
    console.log('寝室长: dormleader001 / DormLeader123!@#');
    console.log('缴费人: payer001 / Payer123!@#');
    console.log('普通用户: user001 / User123!@#');
    
  } catch (error) {
    console.error('创建测试寝室失败:', error);
  } finally {
    process.exit(0);
  }
}

createTestRoom();