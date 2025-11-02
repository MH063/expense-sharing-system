<template>
  <div class="database-doc">
    <el-container>
      <el-header class="page-header">
        <div class="header-content">
          <h1>数据库设计文档管理</h1>
          <p>管理表结构定义、外键约束策略、数据完整性保障和表关系图示</p>
        </div>
        <div class="header-actions">
          <el-button type="primary" @click="saveDocument">保存更改</el-button>
          <el-button @click="exportDocument">导出文档</el-button>
          <el-button @click="generateERD">生成ER图</el-button>
        </div>
      </el-header>
      
      <el-container>
        <el-aside width="250px" class="doc-sidebar">
          <el-tree
            :data="dbStructure"
            :props="{ label: 'title', children: 'children' }"
            node-key="id"
            :default-expanded-keys="expandedKeys"
            @node-click="handleNodeClick"
            highlight-current
          />
        </el-aside>
        
        <el-main class="doc-content">
          <div v-if="selectedSection" class="section-editor">
            <div class="section-header">
              <h2>{{ selectedSection.title }}</h2>
              <div class="section-meta">
                <span>版本: {{ selectedSection.version }}</span>
                <span>更新时间: {{ selectedSection.updateTime }}</span>
                <span>更新人: {{ selectedSection.author }}</span>
              </div>
            </div>
            
            <el-divider />
            
            <!-- 表结构编辑器 -->
            <div v-if="selectedSection.type === 'table'" class="table-editor">
              <el-table :data="selectedSection.columns" style="width: 100%">
                <el-table-column prop="name" label="字段名" width="200">
                  <template #default="scope">
                    <el-input v-model="scope.row.name" />
                  </template>
                </el-table-column>
                <el-table-column prop="type" label="类型" width="150">
                  <template #default="scope">
                    <el-select v-model="scope.row.type" placeholder="选择类型">
                      <el-option label="VARCHAR" value="VARCHAR" />
                      <el-option label="INTEGER" value="INTEGER" />
                      <el-option label="BOOLEAN" value="BOOLEAN" />
                      <el-option label="TIMESTAMP" value="TIMESTAMP" />
                      <el-option label="DECIMAL" value="DECIMAL" />
                      <el-option label="TEXT" value="TEXT" />
                    </el-select>
                  </template>
                </el-table-column>
                <el-table-column prop="length" label="长度" width="100">
                  <template #default="scope">
                    <el-input v-model="scope.row.length" />
                  </template>
                </el-table-column>
                <el-table-column prop="nullable" label="可空" width="80">
                  <template #default="scope">
                    <el-checkbox v-model="scope.row.nullable" />
                  </template>
                </el-table-column>
                <el-table-column prop="primaryKey" label="主键" width="80">
                  <template #default="scope">
                    <el-checkbox v-model="scope.row.primaryKey" />
                  </template>
                </el-table-column>
                <el-table-column prop="description" label="描述">
                  <template #default="scope">
                    <el-input v-model="scope.row.description" />
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="100">
                  <template #default="scope">
                    <el-button type="danger" size="small" @click="removeColumn(scope.$index)">删除</el-button>
                  </template>
                </el-table-column>
              </el-table>
              
              <div class="table-actions">
                <el-button type="primary" @click="addColumn">添加字段</el-button>
              </div>
            </div>
            
            <!-- 普通文本编辑器 -->
            <div v-else class="editor-container">
              <el-input
                v-model="selectedSection.content"
                type="textarea"
                :rows="20"
                placeholder="请输入文档内容..."
              />
            </div>
            
            <div class="editor-actions">
              <el-button @click="previewContent">预览</el-button>
              <el-button type="primary" @click="saveSection">保存章节</el-button>
            </div>
          </div>
          
          <div v-else class="no-selection">
            <el-empty description="请从左侧选择要编辑的章节" />
          </div>
        </el-main>
      </el-container>
    </el-container>
    
    <!-- 预览对话框 -->
    <el-dialog v-model="previewVisible" title="内容预览" width="70%">
      <div class="preview-content" v-html="previewHtml"></div>
    </el-dialog>
    
    <!-- ER图对话框 -->
    <el-dialog v-model="erdVisible" title="数据库ER图" width="80%">
      <div class="erd-container">
        <img src="https://picsum.photos/seed/database-erd/800/600.jpg" alt="数据库ER图" />
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'

// 数据库结构数据
const dbStructure = ref([
  {
    id: '1',
    title: '核心表结构',
    children: [
      { id: '1.1', title: '用户表 (users)', type: 'table' },
      { id: '1.2', title: '寝室表 (rooms)', type: 'table' },
      { id: '1.3', title: '费用表 (expenses)', type: 'table' },
      { id: '1.4', title: '账单表 (bills)', type: 'table' }
    ]
  },
  {
    id: '2',
    title: '关联表结构',
    children: [
      { id: '2.1', title: '寝室成员表 (room_members)', type: 'table' },
      { id: '2.2', title: '费用分摊表 (expense_shares)', type: 'table' },
      { id: '2.3', title: '支付记录表 (payments)', type: 'table' }
    ]
  },
  {
    id: '3',
    title: '系统表结构',
    children: [
      { id: '3.1', title: '费用类型表 (expense_types)', type: 'table' },
      { id: '3.2', title: '审核记录表 (reviews)', type: 'table' },
      { id: '3.3', title: '争议表 (disputes)', type: 'table' }
    ]
  },
  {
    id: '4',
    title: '设计说明',
    children: [
      { id: '4.1', title: '外键约束策略' },
      { id: '4.2', title: '数据完整性保障' },
      { id: '4.3', title: '表关系图示' }
    ]
  }
])

// 选中的章节
const selectedSection = ref(null)

// 默认展开的节点
const expandedKeys = ref(['1', '2', '3', '4'])

// 预览相关
const previewVisible = ref(false)
const previewHtml = ref('')

// ER图相关
const erdVisible = ref(false)

// 表结构数据（实际项目中应该从API获取）
const tableDataMap = ref({
  '1.1': {
    id: '1.1',
    title: '用户表 (users)',
    type: 'table',
    version: 'v1.2',
    updateTime: '2023-12-01',
    author: '张三',
    columns: [
      { name: 'id', type: 'VARCHAR', length: '36', nullable: false, primaryKey: true, description: '用户唯一标识符' },
      { name: 'username', type: 'VARCHAR', length: '50', nullable: false, primaryKey: false, description: '用户名' },
      { name: 'password', type: 'VARCHAR', length: '255', nullable: false, primaryKey: false, description: '密码（加密存储）' },
      { name: 'nickname', type: 'VARCHAR', length: '50', nullable: false, primaryKey: false, description: '昵称' },
      { name: 'email', type: 'VARCHAR', length: '100', nullable: true, primaryKey: false, description: '邮箱' },
      { name: 'phone', type: 'VARCHAR', length: '20', nullable: true, primaryKey: false, description: '手机号' },
      { name: 'role', type: 'VARCHAR', length: '20', nullable: false, primaryKey: false, description: '角色：系统管理员, 管理员, 寝室长, 缴费人, 普通用户' },
      { name: 'avatar', type: 'VARCHAR', length: '255', nullable: true, primaryKey: false, description: '头像URL' },
      { name: 'created_at', type: 'TIMESTAMP', length: '', nullable: false, primaryKey: false, description: '创建时间' },
      { name: 'updated_at', type: 'TIMESTAMP', length: '', nullable: false, primaryKey: false, description: '更新时间' }
    ]
  },
  '1.2': {
    id: '1.2',
    title: '寝室表 (rooms)',
    type: 'table',
    version: 'v1.1',
    updateTime: '2023-11-28',
    author: '李四',
    columns: [
      { name: 'id', type: 'VARCHAR', length: '36', nullable: false, primaryKey: true, description: '寝室唯一标识符' },
      { name: 'name', type: 'VARCHAR', length: '100', nullable: false, primaryKey: false, description: '寝室名称' },
      { name: 'code', type: 'VARCHAR', length: '10', nullable: false, primaryKey: false, description: '寝室邀请码' },
      { name: 'description', type: 'TEXT', length: '', nullable: true, primaryKey: false, description: '寝室描述' },
      { name: 'max_members', type: 'INTEGER', length: '', nullable: false, primaryKey: false, description: '最大成员数' },
      { name: 'creator_id', type: 'VARCHAR', length: '36', nullable: false, primaryKey: false, description: '创建者ID' },
      { name: 'created_at', type: 'TIMESTAMP', length: '', nullable: false, primaryKey: false, description: '创建时间' },
      { name: 'updated_at', type: 'TIMESTAMP', length: '', nullable: false, primaryKey: false, description: '更新时间' }
    ]
  },
  '4.1': {
    id: '4.1',
    title: '外键约束策略',
    type: 'text',
    version: 'v1.0',
    updateTime: '2023-11-25',
    author: '王五',
    content: '外键约束策略设计说明：\n\n1. 用户表与寝室成员表的关系\n   - room_members.user_id 引用 users.id\n   - 当用户被删除时，相关寝室成员记录也应被删除（CASCADE）\n\n2. 寝室表与寝室成员表的关系\n   - room_members.room_id 引用 rooms.id\n   - 当寝室被删除时，相关寝室成员记录也应被删除（CASCADE）\n\n3. 费用表与寝室表的关系\n   - expenses.room_id 引用 rooms.id\n   - 当寝室被删除时，相关费用记录应保留但标记为已归档（SET NULL）\n\n4. 费用表与用户表的关系\n   - expenses.payer_id 引用 users.id\n   - 当用户被删除时，相关费用记录应保留但标记为已归档（SET NULL）\n\n5. 账单表与费用表的关系\n   - bills.expense_id 引用 expenses.id\n   - 当费用被删除时，相关账单记录也应被删除（CASCADE）'
  }
})

// 处理节点点击事件
const handleNodeClick = (data) => {
  // 检查是否是叶子节点（没有子节点）
  if (!data.children || data.children.length === 0) {
    if (data.type === 'table') {
      selectedSection.value = tableDataMap.value[data.id] || {
        id: data.id,
        title: data.title,
        type: 'table',
        version: 'v1.0',
        updateTime: new Date().toISOString().split('T')[0],
        author: '当前用户',
        columns: []
      }
    } else {
      selectedSection.value = {
        id: data.id,
        title: data.title,
        type: 'text',
        version: 'v1.0',
        updateTime: new Date().toISOString().split('T')[0],
        author: '当前用户',
        content: ''
      }
    }
  }
}

// 添加字段
const addColumn = () => {
  if (!selectedSection.value || !selectedSection.value.columns) return
  
  selectedSection.value.columns.push({
    name: '',
    type: 'VARCHAR',
    length: '',
    nullable: true,
    primaryKey: false,
    description: ''
  })
}

// 删除字段
const removeColumn = (index) => {
  if (!selectedSection.value || !selectedSection.value.columns) return
  
  selectedSection.value.columns.splice(index, 1)
}

// 保存章节
const saveSection = () => {
  if (!selectedSection.value) return
  
  // 更新内容映射
  if (selectedSection.value.type === 'table') {
    tableDataMap.value[selectedSection.value.id] = {
      ...selectedSection.value,
      updateTime: new Date().toISOString().split('T')[0]
    }
  }
  
  ElMessage.success('章节保存成功')
}

// 保存整个文档
const saveDocument = () => {
  // 实际项目中应该调用API保存整个文档
  ElMessage.success('文档保存成功')
}

// 导出文档
const exportDocument = () => {
  // 实际项目中应该调用API导出文档
  ElMessage.success('文档导出成功')
}

// 生成ER图
const generateERD = () => {
  erdVisible.value = true
}

// 预览内容
const previewContent = () => {
  if (!selectedSection.value) return
  
  if (selectedSection.value.type === 'table') {
    // 生成表结构的HTML预览
    let html = `<h3>${selectedSection.value.title}</h3>`
    html += '<table border="1" style="border-collapse: collapse; width: 100%;">'
    html += '<tr><th>字段名</th><th>类型</th><th>长度</th><th>可空</th><th>主键</th><th>描述</th></tr>'
    
    selectedSection.value.columns.forEach(column => {
      html += '<tr>'
      html += `<td>${column.name}</td>`
      html += `<td>${column.type}</td>`
      html += `<td>${column.length}</td>`
      html += `<td>${column.nullable ? '是' : '否'}</td>`
      html += `<td>${column.primaryKey ? '是' : '否'}</td>`
      html += `<td>${column.description}</td>`
      html += '</tr>'
    })
    
    html += '</table>'
    previewHtml.value = html
  } else {
    // 简单的Markdown转HTML预览
    previewHtml.value = selectedSection.value.content
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
  }
  
  previewVisible.value = true
}

// 组件挂载时加载数据
onMounted(() => {
  // 这里可以添加API调用来获取最新的数据库结构
  console.log('数据库设计文档管理页面已加载')
})
</script>

<style scoped>
.database-doc {
  height: 100vh;
  overflow: hidden;
}

.page-header {
  background-color: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
}

.header-content h1 {
  margin: 0 0 5px 0;
  color: #303133;
}

.header-content p {
  margin: 0;
  color: #606266;
  font-size: 14px;
}

.doc-sidebar {
  background-color: #fafafa;
  border-right: 1px solid #e4e7ed;
  padding: 20px 10px;
  overflow-y: auto;
}

.doc-content {
  padding: 20px;
  overflow-y: auto;
}

.section-editor {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.section-header h2 {
  margin: 0 0 10px 0;
  color: #303133;
}

.section-meta {
  display: flex;
  gap: 20px;
  font-size: 14px;
  color: #909399;
}

.table-editor {
  flex: 1;
  margin: 20px 0;
}

.table-actions {
  margin-top: 15px;
}

.editor-container {
  flex: 1;
  margin: 20px 0;
}

.editor-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.no-selection {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}

.preview-content {
  max-height: 60vh;
  overflow-y: auto;
  line-height: 1.6;
}

.erd-container {
  text-align: center;
}

.erd-container img {
  max-width: 100%;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
}
</style>