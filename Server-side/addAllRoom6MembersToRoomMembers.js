const { pool } = require('./config/db');

async function addAllRoom6MembersToRoomMembers() {
  try {
    // 查询user_room_relations表中寝室6的所有成员
    const userRoomRelationsResult = await pool.query(
      'SELECT urr.*, u.username, u.name FROM user_room_relations urr JOIN users u ON urr.user_id = u.id WHERE urr.room_id = 6 AND urr.is_active = true'
    );
    
    console.log('user_room_relations表中寝室6的所有成员:');
    userRoomRelationsResult.rows.forEach(row => {
      console.log(row);
    });

    // 查询room_members表中寝室6的现有成员
    const roomMembersResult = await pool.query(
      'SELECT rm.*, u.username, u.name FROM room_members rm JOIN users u ON rm.user_id = u.id WHERE rm.room_id = 6'
    );
    
    console.log('\nroom_members表中寝室6的现有成员:');
    roomMembersResult.rows.forEach(row => {
      console.log(row);
    });

    // 将user_room_relations表中存在但room_members表中不存在的成员添加到room_members表
    for (const relation of userRoomRelationsResult.rows) {
      const existsInRoomMembers = roomMembersResult.rows.some(
        member => member.user_id === relation.user_id
      );
      
      if (!existsInRoomMembers) {
        const insertResult = await pool.query(
          'INSERT INTO room_members (room_id, user_id, role, joined_at) VALUES ($1, $2, $3, NOW()) RETURNING *',
          [relation.room_id, relation.user_id, relation.relation_type === 'owner' ? 'owner' : 'member']
        );
        
        console.log(`\n成功将用户${relation.user_id}(${relation.username})添加到寝室6:`);
        console.log(insertResult.rows[0]);
      }
    }

    // 再次查询room_members表中寝室6的所有成员
    const finalRoomMembersResult = await pool.query(
      'SELECT rm.*, u.username, u.name FROM room_members rm JOIN users u ON rm.user_id = u.id WHERE rm.room_id = 6'
    );
    
    console.log('\n最终room_members表中寝室6的所有成员:');
    finalRoomMembersResult.rows.forEach(row => {
      console.log(row);
    });
  } catch (error) {
    console.error('操作失败:', error.message);
  } finally {
    await pool.end();
  }
}

addAllRoom6MembersToRoomMembers();