<template>
  <div class="database-doc">
    <el-container>
      <el-header class="page-header">
        <div class="header-content">
          <el-button @click="goBack" :icon="ArrowLeft" circle class="back-button" />
          <div>
            <h1>数据库设计文档管理</h1>
            <p>管理表结构定义、外键约束策略、数据完整性保障和表关系图示</p>
          </div>
        </div>
        <div class="header-actions">
          <el-button @click="refreshData" :icon="Refresh">刷新</el-button>
          <el-button @click="importSQL" :icon="Upload">导入SQL</el-button>
          <el-button @click="exportSQL" :icon="Download">导出SQL</el-button>
          <el-button @click="generateERD" :icon="Share" type="primary">生成ER图</el-button>
          <el-button @click="saveDocument" :icon="Check" type="success">保存更改</el-button>
        </div>
      </el-header>
      
      <el-container>
        <el-aside width="280px" class="doc-sidebar">
          <div class="sidebar-header">
            <el-input v-model="searchText" placeholder="搜索表或章节..." :prefix-icon="Search" clearable />
            <div class="sidebar-actions">
              <el-button @click="addTable" :icon="Plus" size="small" type="primary">添加表</el-button>
              <el-button @click="addSection" :icon="Plus" size="small">添加章节</el-button>
            </div>
          </div>
          <el-tree
            :data="filteredDbStructure"
            :props="{ label: 'title', children: 'children' }"
            node-key="id"
            :default-expanded-keys="expandedKeys"
            :current-node-key="selectedSection?.id"
            @node-click="handleNodeClick"
            @node-contextmenu="handleNodeRightClick"
            highlight-current
            draggable
            @node-drag-start="handleDragStart"
            @node-drag-end="handleDragEnd"
            @node-drop="handleDrop"
          >
            <template #default="{ node, data }">
              <div class="tree-node">
                <el-icon v-if="data.type === 'table'"><Grid /></el-icon>
                <el-icon v-else><Document /></el-icon>
                <span>{{ node.label }}</span>
                <div class="node-actions" v-if="!data.children">
                  <el-button @click.stop="editNode(data)" :icon="Edit" size="small" circle />
                  <el-button @click.stop="deleteNode(data)" :icon="Delete" size="small" circle type="danger" />
                </div>
              </div>
            </template>
          </el-tree>
        </el-aside>
        
        <el-main class="doc-content">
          <div v-if="selectedSection" class="section-editor">
            <div class="section-header">
              <div class="section-title">
                <h2>{{ selectedSection.title }}</h2>
                <el-button @click="editSectionTitle" :icon="Edit" size="small" circle />
              </div>
              <div class="section-meta">
                <el-tag type="info" size="small">版本: {{ selectedSection.version }}</el-tag>
                <el-tag type="success" size="small">更新时间: {{ selectedSection.updateTime }}</el-tag>
                <el-tag type="warning" size="small">更新人: {{ selectedSection.author }}</el-tag>
              </div>
            </div>
            
            <el-divider />
            
            <!-- 表结构编辑器 -->
            <div v-if="selectedSection.type === 'table'" class="table-editor">
              <div class="table-toolbar">
                <div class="toolbar-left">
                  <el-button @click="addColumn" :icon="Plus" size="small" type="primary">添加字段</el-button>
                  <el-button @click="addIndex" :icon="Connection" size="small">添加索引</el-button>
                  <el-button @click="addForeignKey" :icon="Link" size="small">添加外键</el-button>
                  <el-button @click="previewTable" :icon="View" size="small">预览SQL</el-button>
                </div>
                <div class="toolbar-right">
                  <el-button @click="importColumns" :icon="Upload" size="small">导入字段</el-button>
                  <el-button @click="exportColumns" :icon="Download" size="small">导出字段</el-button>
                </div>
              </div>
              
              <el-tabs v-model="activeTab" class="table-tabs">
                <el-tab-pane label="字段设计" name="columns">
                  <el-table :data="selectedSection.columns" style="width: 100%" border>
                    <el-table-column type="index" width="50" />
                    <el-table-column prop="name" label="字段名" width="180">
                      <template #default="scope">
                        <el-input v-model="scope.row.name" placeholder="字段名" />
                      </template>
                    </el-table-column>
                    <el-table-column prop="type" label="类型" width="140">
                      <template #default="scope">
                        <el-select v-model="scope.row.type" placeholder="选择类型" filterable>
                          <el-option label="VARCHAR" value="VARCHAR" />
                          <el-option label="CHAR" value="CHAR" />
                          <el-option label="INTEGER" value="INTEGER" />
                          <el-option label="BIGINT" value="BIGINT" />
                          <el-option label="SMALLINT" value="SMALLINT" />
                          <el-option label="BOOLEAN" value="BOOLEAN" />
                          <el-option label="TIMESTAMP" value="TIMESTAMP" />
                          <el-option label="DATE" value="DATE" />
                          <el-option label="TIME" value="TIME" />
                          <el-option label="DECIMAL" value="DECIMAL" />
                          <el-option label="FLOAT" value="FLOAT" />
                          <el-option label="DOUBLE" value="DOUBLE" />
                          <el-option label="TEXT" value="TEXT" />
                          <el-option label="JSON" value="JSON" />
                          <el-option label="BLOB" value="BLOB" />
                        </el-select>
                      </template>
                    </el-table-column>
                    <el-table-column prop="length" label="长度/精度" width="120">
                      <template #default="scope">
                        <el-input v-model="scope.row.length" placeholder="长度" />
                      </template>
                    </el-table-column>
                    <el-table-column prop="nullable" label="可空" width="70">
                      <template #default="scope">
                        <el-checkbox v-model="scope.row.nullable" />
                      </template>
                    </el-table-column>
                    <el-table-column prop="primaryKey" label="主键" width="70">
                      <template #default="scope">
                        <el-checkbox v-model="scope.row.primaryKey" @change="handlePrimaryKeyChange(scope.$index)" />
                      </template>
                    </el-table-column>
                    <el-table-column prop="autoIncrement" label="自增" width="70">
                      <template #default="scope">
                        <el-checkbox v-model="scope.row.autoIncrement" :disabled="!scope.row.primaryKey || scope.row.type !== 'INTEGER'" />
                      </template>
                    </el-table-column>
                    <el-table-column prop="defaultValue" label="默认值" width="120">
                      <template #default="scope">
                        <el-input v-model="scope.row.defaultValue" placeholder="默认值" />
                      </template>
                    </el-table-column>
                    <el-table-column prop="description" label="描述">
                      <template #default="scope">
                        <el-input v-model="scope.row.description" placeholder="字段描述" />
                      </template>
                    </el-table-column>
                    <el-table-column label="操作" width="100" fixed="right">
                      <template #default="scope">
                        <el-button type="danger" size="small" @click="removeColumn(scope.$index)" :icon="Delete" circle />
                      </template>
                    </el-table-column>
                  </el-table>
                </el-tab-pane>
                
                <el-tab-pane label="索引设计" name="indexes">
                  <el-table :data="selectedSection.indexes || []" style="width: 100%" border>
                    <el-table-column type="index" width="50" />
                    <el-table-column prop="name" label="索引名" width="180">
                      <template #default="scope">
                        <el-input v-model="scope.row.name" placeholder="索引名" />
                      </template>
                    </el-table-column>
                    <el-table-column prop="type" label="类型" width="120">
                      <template #default="scope">
                        <el-select v-model="scope.row.type" placeholder="索引类型">
                          <el-option label="普通索引" value="INDEX" />
                          <el-option label="唯一索引" value="UNIQUE" />
                          <el-option label="全文索引" value="FULLTEXT" />
                        </el-select>
                      </template>
                    </el-table-column>
                    <el-table-column prop="columns" label="字段" width="200">
                      <template #default="scope">
                        <el-select v-model="scope.row.columns" multiple placeholder="选择字段">
                          <el-option 
                            v-for="col in selectedSection.columns" 
                            :key="col.name" 
                            :label="col.name" 
                            :value="col.name" 
                          />
                        </el-select>
                      </template>
                    </el-table-column>
                    <el-table-column prop="description" label="描述">
                      <template #default="scope">
                        <el-input v-model="scope.row.description" placeholder="索引描述" />
                      </template>
                    </el-table-column>
                    <el-table-column label="操作" width="100" fixed="right">
                      <template #default="scope">
                        <el-button type="danger" size="small" @click="removeIndex(scope.$index)" :icon="Delete" circle />
                      </template>
                    </el-table-column>
                  </el-table>
                  <div class="table-actions">
                    <el-button @click="addIndex" :icon="Plus" type="primary">添加索引</el-button>
                  </div>
                </el-tab-pane>
                
                <el-tab-pane label="外键关系" name="foreignKeys">
                  <el-table :data="selectedSection.foreignKeys || []" style="width: 100%" border>
                    <el-table-column type="index" width="50" />
                    <el-table-column prop="name" label="约束名" width="180">
                      <template #default="scope">
                        <el-input v-model="scope.row.name" placeholder="约束名" />
                      </template>
                    </el-table-column>
                    <el-table-column prop="column" label="本表字段" width="150">
                      <template #default="scope">
                        <el-select v-model="scope.row.column" placeholder="选择字段">
                          <el-option 
                            v-for="col in selectedSection.columns" 
                            :key="col.name" 
                            :label="col.name" 
                            :value="col.name" 
                          />
                        </el-select>
                      </template>
                    </el-table-column>
                    <el-table-column prop="refTable" label="引用表" width="150">
                      <template #default="scope">
                        <el-select v-model="scope.row.refTable" placeholder="选择表" filterable>
                          <el-option 
                            v-for="table in getAllTables()" 
                            :key="table.id" 
                            :label="table.title" 
                            :value="table.id" 
                          />
                        </el-select>
                      </template>
                    </el-table-column>
                    <el-table-column prop="refColumn" label="引用字段" width="150">
                      <template #default="scope">
                        <el-select v-model="scope.row.refColumn" placeholder="选择字段">
                          <el-option 
                            v-for="col in getRefTableColumns(scope.row.refTable)" 
                            :key="col.name" 
                            :label="col.name" 
                            :value="col.name" 
                          />
                        </el-select>
                      </template>
                    </el-table-column>
                    <el-table-column prop="onDelete" label="删除规则" width="120">
                      <template #default="scope">
                        <el-select v-model="scope.row.onDelete" placeholder="删除规则">
                          <el-option label="CASCADE" value="CASCADE" />
                          <el-option label="SET NULL" value="SET NULL" />
                          <el-option label="RESTRICT" value="RESTRICT" />
                          <el-option label="NO ACTION" value="NO ACTION" />
                        </el-select>
                      </template>
                    </el-table-column>
                    <el-table-column prop="onUpdate" label="更新规则" width="120">
                      <template #default="scope">
                        <el-select v-model="scope.row.onUpdate" placeholder="更新规则">
                          <el-option label="CASCADE" value="CASCADE" />
                          <el-option label="SET NULL" value="SET NULL" />
                          <el-option label="RESTRICT" value="RESTRICT" />
                          <el-option label="NO ACTION" value="NO ACTION" />
                        </el-select>
                      </template>
                    </el-table-column>
                    <el-table-column label="操作" width="100" fixed="right">
                      <template #default="scope">
                        <el-button type="danger" size="small" @click="removeForeignKey(scope.$index)" :icon="Delete" circle />
                      </template>
                    </el-table-column>
                  </el-table>
                  <div class="table-actions">
                    <el-button @click="addForeignKey" :icon="Plus" type="primary">添加外键</el-button>
                  </div>
                </el-tab-pane>
              </el-tabs>
            </div>
            
            <!-- 普通文本编辑器 -->
            <div v-else class="editor-container">
              <div class="editor-toolbar">
                <el-button-group>
                  <el-button @click="formatText('bold')" :icon="Bold" size="small" />
                  <el-button @click="formatText('italic')" :icon="Italic" size="small" />
                  <el-button @click="formatText('underline')" :icon="Underline" size="small" />
                </el-button-group>
                <el-divider direction="vertical" />
                <el-button-group>
                  <el-button @click="insertHeading(1)" size="small">H1</el-button>
                  <el-button @click="insertHeading(2)" size="small">H2</el-button>
                  <el-button @click="insertHeading(3)" size="small">H3</el-button>
                </el-button-group>
                <el-divider direction="vertical" />
                <el-button-group>
                  <el-button @click="insertList('ul')" :icon="List" size="small" />
                  <el-button @click="insertList('ol')" :icon="OrderedList" size="small" />
                  <el-button @click="insertTable" :icon="Grid" size="small" />
                  <el-button @click="insertCode" :icon="DocumentCopy" size="small" />
                </el-button-group>
                <el-divider direction="vertical" />
                <el-button @click="insertLink" :icon="Link" size="small" />
                <el-button @click="insertImage" :icon="Picture" size="small" />
              </div>
              <el-input
                v-model="selectedSection.content"
                type="textarea"
                :rows="20"
                placeholder="请输入文档内容..."
                ref="contentEditor"
              />
            </div>
            
            <div class="editor-actions">
              <div class="editor-info">
                <span>字数: {{ wordCount }} 字</span>
                <span>创建时间: {{ selectedSection.createTime || '未知' }}</span>
              </div>
              <div class="editor-buttons">
                <el-button @click="previewContent" :icon="View">预览</el-button>
                <el-button @click="saveSection" :icon="Check" type="primary">保存章节</el-button>
              </div>
            </div>
          </div>
          
          <div v-else class="no-selection">
            <el-empty description="请从左侧选择要编辑的章节" />
          </div>
        </el-main>
      </el-container>
    </el-container>
    
    <!-- 预览对话框 -->
    <el-dialog v-model="previewVisible" title="内容预览" width="70%" top="5vh">
      <div class="preview-content" v-html="previewHtml"></div>
    </el-dialog>
    
    <!-- ER图对话框 -->
    <el-dialog v-model="erdVisible" title="数据库ER图" width="90%" top="5vh">
      <div class="erd-toolbar">
        <el-button-group>
          <el-button @click="generateSimpleERD" :type="erdType === 'simple' ? 'primary' : ''">简单ER图</el-button>
          <el-button @click="generateDetailedERD" :type="erdType === 'detailed' ? 'primary' : ''">详细ER图</el-button>
          <el-button @click="generatePhysicalERD" :type="erdType === 'physical' ? 'primary' : ''">物理模型</el-button>
        </el-button-group>
        <div class="erd-actions">
          <el-button @click="exportERD" :icon="Download">导出图片</el-button>
          <el-button @click="printERD" :icon="Printer">打印</el-button>
        </div>
      </div>
      <div class="erd-container" ref="erdContainer">
        <div v-if="erdType === 'simple'" class="simple-erd">
          <canvas ref="simpleERDCanvas"></canvas>
        </div>
        <div v-else-if="erdType === 'detailed'" class="detailed-erd">
          <canvas ref="detailedERDCanvas"></canvas>
        </div>
        <div v-else class="physical-erd">
          <canvas ref="physicalERDCanvas"></canvas>
        </div>
      </div>
    </el-dialog>
    
    <!-- SQL预览对话框 -->
    <el-dialog v-model="sqlPreviewVisible" title="SQL预览" width="70%">
      <el-input
        v-model="sqlPreview"
        type="textarea"
        :rows="20"
        readonly
      />
      <template #footer>
        <el-button @click="copySQL">复制SQL</el-button>
        <el-button @click="executeSQL" type="primary">执行SQL</el-button>
      </template>
    </el-dialog>
    
    <!-- 右键菜单 -->
    <el-menu
      ref="contextMenu"
      :style="{ position: 'fixed', left: contextMenuPosition.x + 'px', top: contextMenuPosition.y + 'px', zIndex: 9999 }"
      v-show="contextMenuVisible"
      @select="handleContextMenuSelect"
    >
      <el-menu-item index="add" :icon="Plus">添加子节点</el-menu-item>
      <el-menu-item index="edit" :icon="Edit">编辑</el-menu-item>
      <el-menu-item index="delete" :icon="Delete">删除</el-menu-item>
      <el-menu-item index="copy" :icon="CopyDocument">复制</el-menu-item>
    </el-menu>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  ArrowLeft, Plus, Edit, Delete, Search, Refresh, Upload, Download, 
  Check, Share, View, Grid, Document, Connection, Link, Bold, Italic,
  Underline, List, OrderedList, DocumentCopy, Picture, CopyDocument, Printer
} from '@element-plus/icons-vue'

const router = useRouter()

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

// 搜索文本
const searchText = ref('')

// 过滤后的数据库结构
const filteredDbStructure = computed(() => {
  if (!searchText.value) return dbStructure.value
  
  const filterNodes = (nodes) => {
    return nodes.reduce((acc, node) => {
      const matchesSearch = node.title.toLowerCase().includes(searchText.value.toLowerCase())
      const filteredChildren = node.children ? filterNodes(node.children) : []
      
      if (matchesSearch || filteredChildren.length > 0) {
        acc.push({
          ...node,
          children: filteredChildren.length > 0 ? filteredChildren : node.children
        })
      }
      
      return acc
    }, [])
  }
  
  return filterNodes(dbStructure.value)
})

// 选中的章节
const selectedSection = ref(null)

// 默认展开的节点
const expandedKeys = ref(['1', '2', '3', '4'])

// 当前活动的标签页
const activeTab = ref('columns')

// 预览相关
const previewVisible = ref(false)
const previewHtml = ref('')

// ER图相关
const erdVisible = ref(false)
const erdType = ref('simple')
const simpleERDCanvas = ref(null)
const detailedERDCanvas = ref(null)
const physicalERDCanvas = ref(null)

// SQL预览相关
const sqlPreviewVisible = ref(false)
const sqlPreview = ref('')

// 右键菜单相关
const contextMenuVisible = ref(false)
const contextMenuPosition = ref({ x: 0, y: 0 })
const contextMenuTarget = ref(null)

// 表结构数据（实际项目中应该从API获取）
const tableDataMap = ref({
  '1.1': {
    id: '1.1',
    title: '用户表 (users)',
    type: 'table',
    version: 'v1.2',
    updateTime: '2023-12-01',
    createTime: '2023-10-15',
    author: '张三',
    columns: [
      { name: 'id', type: 'VARCHAR', length: '36', nullable: false, primaryKey: true, autoIncrement: false, defaultValue: '', description: '用户唯一标识符' },
      { name: 'username', type: 'VARCHAR', length: '50', nullable: false, primaryKey: false, autoIncrement: false, defaultValue: '', description: '用户名' },
      { name: 'password', type: 'VARCHAR', length: '255', nullable: false, primaryKey: false, autoIncrement: false, defaultValue: '', description: '密码（加密存储）' },
      { name: 'nickname', type: 'VARCHAR', length: '50', nullable: false, primaryKey: false, autoIncrement: false, defaultValue: '', description: '昵称' },
      { name: 'email', type: 'VARCHAR', length: '100', nullable: true, primaryKey: false, autoIncrement: false, defaultValue: '', description: '邮箱' },
      { name: 'phone', type: 'VARCHAR', length: '20', nullable: true, primaryKey: false, autoIncrement: false, defaultValue: '', description: '手机号' },
      { name: 'role', type: 'VARCHAR', length: '20', nullable: false, primaryKey: false, autoIncrement: false, defaultValue: 'user', description: '角色：系统管理员, 管理员, 寝室长, 缴费人, 普通用户' },
      { name: 'avatar', type: 'VARCHAR', length: '255', nullable: true, primaryKey: false, autoIncrement: false, defaultValue: '', description: '头像URL' },
      { name: 'created_at', type: 'TIMESTAMP', length: '', nullable: false, primaryKey: false, autoIncrement: false, defaultValue: 'CURRENT_TIMESTAMP', description: '创建时间' },
      { name: 'updated_at', type: 'TIMESTAMP', length: '', nullable: false, primaryKey: false, autoIncrement: false, defaultValue: 'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP', description: '更新时间' }
    ],
    indexes: [
      { name: 'idx_username', type: 'UNIQUE', columns: ['username'], description: '用户名唯一索引' },
      { name: 'idx_email', type: 'UNIQUE', columns: ['email'], description: '邮箱唯一索引' },
      { name: 'idx_phone', type: 'INDEX', columns: ['phone'], description: '手机号索引' }
    ],
    foreignKeys: []
  },
  '1.2': {
    id: '1.2',
    title: '寝室表 (rooms)',
    type: 'table',
    version: 'v1.1',
    updateTime: '2023-11-28',
    createTime: '2023-10-16',
    author: '李四',
    columns: [
      { name: 'id', type: 'VARCHAR', length: '36', nullable: false, primaryKey: true, autoIncrement: false, defaultValue: '', description: '寝室唯一标识符' },
      { name: 'name', type: 'VARCHAR', length: '100', nullable: false, primaryKey: false, autoIncrement: false, defaultValue: '', description: '寝室名称' },
      { name: 'code', type: 'VARCHAR', length: '10', nullable: false, primaryKey: false, autoIncrement: false, defaultValue: '', description: '寝室邀请码' },
      { name: 'description', type: 'TEXT', length: '', nullable: true, primaryKey: false, autoIncrement: false, defaultValue: '', description: '寝室描述' },
      { name: 'max_members', type: 'INTEGER', length: '', nullable: false, primaryKey: false, autoIncrement: false, defaultValue: '6', description: '最大成员数' },
      { name: 'creator_id', type: 'VARCHAR', length: '36', nullable: false, primaryKey: false, autoIncrement: false, defaultValue: '', description: '创建者ID' },
      { name: 'created_at', type: 'TIMESTAMP', length: '', nullable: false, primaryKey: false, autoIncrement: false, defaultValue: 'CURRENT_TIMESTAMP', description: '创建时间' },
      { name: 'updated_at', type: 'TIMESTAMP', length: '', nullable: false, primaryKey: false, autoIncrement: false, defaultValue: 'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP', description: '更新时间' }
    ],
    indexes: [
      { name: 'idx_code', type: 'UNIQUE', columns: ['code'], description: '邀请码唯一索引' },
      { name: 'idx_creator', type: 'INDEX', columns: ['creator_id'], description: '创建者ID索引' }
    ],
    foreignKeys: [
      { name: 'fk_rooms_creator', column: 'creator_id', refTable: '1.1', refColumn: 'id', onDelete: 'CASCADE', onUpdate: 'CASCADE' }
    ]
  },
  '4.1': {
    id: '4.1',
    title: '外键约束策略',
    type: 'text',
    version: 'v1.0',
    updateTime: '2023-11-25',
    createTime: '2023-10-20',
    author: '王五',
    content: '外键约束策略设计说明：\n\n1. 用户表与寝室成员表的关系\n   - room_members.user_id 引用 users.id\n   - 当用户被删除时，相关寝室成员记录也应被删除（CASCADE）\n\n2. 寝室表与寝室成员表的关系\n   - room_members.room_id 引用 rooms.id\n   - 当寝室被删除时，相关寝室成员记录也应被删除（CASCADE）\n\n3. 费用表与寝室表的关系\n   - expenses.room_id 引用 rooms.id\n   - 当寝室被删除时，相关费用记录应保留但标记为已归档（SET NULL）\n\n4. 费用表与用户表的关系\n   - expenses.payer_id 引用 users.id\n   - 当用户被删除时，相关费用记录应保留但标记为已归档（SET NULL）\n\n5. 账单表与费用表的关系\n   - bills.expense_id 引用 expenses.id\n   - 当费用被删除时，相关账单记录也应被删除（CASCADE）'
  }
})

// 字数统计
const wordCount = computed(() => {
  if (!selectedSection.value || !selectedSection.value.content) return 0
  return selectedSection.value.content.length
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
        createTime: new Date().toISOString().split('T')[0],
        author: '当前用户',
        columns: [],
        indexes: [],
        foreignKeys: []
      }
    } else {
      selectedSection.value = {
        id: data.id,
        title: data.title,
        type: 'text',
        version: 'v1.0',
        updateTime: new Date().toISOString().split('T')[0],
        createTime: new Date().toISOString().split('T')[0],
        author: '当前用户',
        content: ''
      }
    }
  }
}

// 处理节点右键点击事件
const handleNodeRightClick = (event, data) => {
  event.preventDefault()
  contextMenuTarget.value = data
  contextMenuPosition.value = { x: event.clientX, y: event.clientY }
  contextMenuVisible.value = true
  
  // 点击其他地方关闭右键菜单
  const closeContextMenu = () => {
    contextMenuVisible.value = false
    document.removeEventListener('click', closeContextMenu)
  }
  nextTick(() => {
    document.addEventListener('click', closeContextMenu)
  })
}

// 处理右键菜单选择
const handleContextMenuSelect = (index) => {
  contextMenuVisible.value = false
  
  switch (index) {
    case 'add':
      // 添加子节点
      if (contextMenuTarget.value.children) {
        // 如果是父节点，添加子节点
        const newId = generateId(contextMenuTarget.value.id)
        ElMessageBox.prompt('请输入新节点名称', '添加节点', {
          confirmButtonText: '确定',
          cancelButtonText: '取消'
        }).then(({ value }) => {
          if (!contextMenuTarget.value.children) {
            contextMenuTarget.value.children = []
          }
          contextMenuTarget.value.children.push({
            id: newId,
            title: value,
            type: 'text'
          })
          ElMessage.success('添加成功')
        })
      } else {
        // 如果是子节点，添加同级节点
        const parentId = findParentId(contextMenuTarget.value.id, dbStructure.value)
        if (parentId) {
          const parent = findNodeById(parentId, dbStructure.value)
          if (parent) {
            const newId = generateId(parentId)
            ElMessageBox.prompt('请输入新节点名称', '添加节点', {
              confirmButtonText: '确定',
              cancelButtonText: '取消'
            }).then(({ value }) => {
              parent.children.push({
                id: newId,
                title: value,
                type: 'text'
              })
              ElMessage.success('添加成功')
            })
          }
        }
      }
      break
    case 'edit':
      editNode(contextMenuTarget.value)
      break
    case 'delete':
      deleteNode(contextMenuTarget.value)
      break
    case 'copy':
      copyNode(contextMenuTarget.value)
      break
  }
}

// 拖拽相关
const handleDragStart = (node, event) => {
  console.log('拖拽开始', node)
}

const handleDragEnd = (draggingNode, dropNode, dropType, event) => {
  console.log('拖拽结束', draggingNode, dropNode, dropType)
}

const handleDrop = (draggingNode, dropNode, dropType, event) => {
  console.log('拖拽放置', draggingNode, dropNode, dropType)
  ElMessage.success('节点位置已更新')
}

// 添加表
const addTable = () => {
  ElMessageBox.prompt('请输入表名', '添加表', {
    confirmButtonText: '确定',
    cancelButtonText: '取消'
  }).then(({ value }) => {
    const newId = generateId('1')
    const newTable = {
      id: newId,
      title: value,
      type: 'table'
    }
    
    // 添加到核心表结构下
    if (dbStructure.value[0].children) {
      dbStructure.value[0].children.push(newTable)
    } else {
      dbStructure.value[0].children = [newTable]
    }
    
    // 初始化表数据
    tableDataMap.value[newId] = {
      id: newId,
      title: value,
      type: 'table',
      version: 'v1.0',
      updateTime: new Date().toISOString().split('T')[0],
      createTime: new Date().toISOString().split('T')[0],
      author: '当前用户',
      columns: [],
      indexes: [],
      foreignKeys: []
    }
    
    ElMessage.success('表添加成功')
  })
}

// 添加章节
const addSection = () => {
  ElMessageBox.prompt('请输入章节名称', '添加章节', {
    confirmButtonText: '确定',
    cancelButtonText: '取消'
  }).then(({ value }) => {
    const newId = generateId('4')
    const newSection = {
      id: newId,
      title: value,
      type: 'text'
    }
    
    // 添加到设计说明下
    if (dbStructure.value[3].children) {
      dbStructure.value[3].children.push(newSection)
    } else {
      dbStructure.value[3].children = [newSection]
    }
    
    ElMessage.success('章节添加成功')
  })
}

// 编辑节点
const editNode = (node) => {
  ElMessageBox.prompt('请输入新名称', '编辑节点', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputValue: node.title
  }).then(({ value }) => {
    node.title = value
    ElMessage.success('修改成功')
  })
}

// 删除节点
const deleteNode = (node) => {
  ElMessageBox.confirm('确定要删除此节点吗？', '删除确认', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    // 从树结构中删除
    const parentId = findParentId(node.id, dbStructure.value)
    if (parentId) {
      const parent = findNodeById(parentId, dbStructure.value)
      if (parent && parent.children) {
        const index = parent.children.findIndex(child => child.id === node.id)
        if (index !== -1) {
          parent.children.splice(index, 1)
        }
      }
    }
    
    // 如果是表，从表数据中删除
    if (node.type === 'table') {
      delete tableDataMap.value[node.id]
    }
    
    // 如果是当前选中的节点，清空选中
    if (selectedSection.value && selectedSection.value.id === node.id) {
      selectedSection.value = null
    }
    
    ElMessage.success('删除成功')
  })
}

// 复制节点
const copyNode = (node) => {
  const parentId = findParentId(node.id, dbStructure.value)
  if (parentId) {
    const parent = findNodeById(parentId, dbStructure.value)
    if (parent && parent.children) {
      const newId = generateId(parentId)
      const newNode = {
        ...node,
        id: newId,
        title: `${node.title} (副本)`
      }
      parent.children.push(newNode)
      
      // 如果是表，复制表数据
      if (node.type === 'table') {
        const originalData = tableDataMap.value[node.id]
        if (originalData) {
          tableDataMap.value[newId] = {
            ...originalData,
            id: newId,
            title: newNode.title
          }
        }
      }
      
      ElMessage.success('复制成功')
    }
  }
}

// 编辑章节标题
const editSectionTitle = () => {
  if (!selectedSection.value) return
  
  ElMessageBox.prompt('请输入新标题', '编辑标题', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputValue: selectedSection.value.title
  }).then(({ value }) => {
    selectedSection.value.title = value
    
    // 更新树结构中的标题
    updateNodeTitle(selectedSection.value.id, value, dbStructure.value)
    
    ElMessage.success('标题修改成功')
  })
}

// 更新节点标题
const updateNodeTitle = (id, title, nodes) => {
  for (const node of nodes) {
    if (node.id === id) {
      node.title = title
      return true
    }
    if (node.children && updateNodeTitle(id, title, node.children)) {
      return true
    }
  }
  return false
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
    autoIncrement: false,
    defaultValue: '',
    description: ''
  })
}

// 删除字段
const removeColumn = (index) => {
  if (!selectedSection.value || !selectedSection.value.columns) return
  
  selectedSection.value.columns.splice(index, 1)
}

// 处理主键变化
const handlePrimaryKeyChange = (index) => {
  if (!selectedSection.value || !selectedSection.value.columns) return
  
  // 如果设置为主键，确保其他字段不是主键
  if (selectedSection.value.columns[index].primaryKey) {
    selectedSection.value.columns.forEach((column, i) => {
      if (i !== index) {
        column.primaryKey = false
      }
    })
  }
}

// 添加索引
const addIndex = () => {
  if (!selectedSection.value) return
  
  if (!selectedSection.value.indexes) {
    selectedSection.value.indexes = []
  }
  
  selectedSection.value.indexes.push({
    name: '',
    type: 'INDEX',
    columns: [],
    description: ''
  })
}

// 删除索引
const removeIndex = (index) => {
  if (!selectedSection.value || !selectedSection.value.indexes) return
  
  selectedSection.value.indexes.splice(index, 1)
}

// 添加外键
const addForeignKey = () => {
  if (!selectedSection.value) return
  
  if (!selectedSection.value.foreignKeys) {
    selectedSection.value.foreignKeys = []
  }
  
  selectedSection.value.foreignKeys.push({
    name: '',
    column: '',
    refTable: '',
    refColumn: '',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  })
}

// 删除外键
const removeForeignKey = (index) => {
  if (!selectedSection.value || !selectedSection.value.foreignKeys) return
  
  selectedSection.value.foreignKeys.splice(index, 1)
}

// 获取所有表
const getAllTables = () => {
  const tables = []
  
  const collectTables = (nodes) => {
    for (const node of nodes) {
      if (node.type === 'table') {
        tables.push(node)
      }
      if (node.children) {
        collectTables(node.children)
      }
    }
  }
  
  collectTables(dbStructure.value)
  return tables
}

// 获取引用表的字段
const getRefTableColumns = (refTableId) => {
  if (!refTableId) return []
  
  const refTable = tableDataMap.value[refTableId]
  if (!refTable || !refTable.columns) return []
  
  return refTable.columns
}

// 导入字段
const importColumns = () => {
  ElMessage.info('此功能暂未实现')
}

// 导出字段
const exportColumns = () => {
  if (!selectedSection.value || !selectedSection.value.columns) return
  
  const csvContent = selectedSection.value.columns.map(col => {
    return `${col.name},${col.type},${col.length},${col.nullable},${col.primaryKey},${col.description}`
  }).join('\n')
  
  const blob = new Blob([csvContent], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${selectedSection.value.title}_字段.csv`
  link.click()
  URL.revokeObjectURL(url)
  
  ElMessage.success('字段导出成功')
}

// 预览表SQL
const previewTable = () => {
  if (!selectedSection.value || !selectedSection.value.columns) return
  
  let sql = `-- 表: ${selectedSection.value.title}\n`
  sql += `CREATE TABLE ${selectedSection.value.title.replace(/\(.*\)/, '')} (\n`
  
  selectedSection.value.columns.forEach((column, index) => {
    sql += `  ${column.name} ${column.type}`
    
    if (column.length) {
      sql += `(${column.length})`
    }
    
    if (!column.nullable) {
      sql += ' NOT NULL'
    }
    
    if (column.defaultValue) {
      sql += ` DEFAULT ${column.defaultValue}`
    }
    
    if (column.autoIncrement) {
      sql += ' AUTO_INCREMENT'
    }
    
    if (column.primaryKey) {
      sql += ' PRIMARY KEY'
    }
    
    if (index < selectedSection.value.columns.length - 1) {
      sql += ','
    }
    
    sql += ` -- ${column.description}\n`
  })
  
  sql += `);\n\n`
  
  // 添加索引
  if (selectedSection.value.indexes && selectedSection.value.indexes.length > 0) {
    sql += `-- 索引\n`
    selectedSection.value.indexes.forEach(index => {
      if (index.columns && index.columns.length > 0) {
        sql += `CREATE ${index.type} INDEX ${index.name} ON ${selectedSection.value.title.replace(/\(.*\)/, '')} (${index.columns.join(', ')}); -- ${index.description}\n`
      }
    })
    sql += '\n'
  }
  
  // 添加外键
  if (selectedSection.value.foreignKeys && selectedSection.value.foreignKeys.length > 0) {
    sql += `-- 外键\n`
    selectedSection.value.foreignKeys.forEach(fk => {
      if (fk.column && fk.refTable && fk.refColumn) {
        const refTableName = findNodeById(fk.refTable, dbStructure.value)?.title.replace(/\(.*\)/, '') || fk.refTable
        sql += `ALTER TABLE ${selectedSection.value.title.replace(/\(.*\)/, '')} ADD CONSTRAINT ${fk.name} FOREIGN KEY (${fk.column}) REFERENCES ${refTableName}(${fk.refColumn}) ON DELETE ${fk.onDelete} ON UPDATE ${fk.onUpdate};\n`
      }
    })
  }
  
  sqlPreview.value = sql
  sqlPreviewVisible.value = true
}

// 复制SQL
const copySQL = () => {
  if (!sqlPreview.value) return
  
  navigator.clipboard.writeText(sqlPreview.value).then(() => {
    ElMessage.success('SQL已复制到剪贴板')
  }).catch(() => {
    ElMessage.error('复制失败')
  })
}

// 执行SQL
const executeSQL = () => {
  ElMessage.info('此功能暂未实现')
}

// 导入SQL
const importSQL = () => {
  ElMessage.info('此功能暂未实现')
}

// 导出SQL
const exportSQL = () => {
  let allSQL = '-- 数据库设计文档导出\n'
  allSQL += `-- 导出时间: ${new Date().toLocaleString()}\n\n`
  
  // 导出所有表
  Object.values(tableDataMap.value).forEach(table => {
    if (table.type === 'table') {
      allSQL += `-- 表: ${table.title}\n`
      allSQL += `CREATE TABLE ${table.title.replace(/\(.*\)/, '')} (\n`
      
      table.columns.forEach((column, index) => {
        allSQL += `  ${column.name} ${column.type}`
        
        if (column.length) {
          allSQL += `(${column.length})`
        }
        
        if (!column.nullable) {
          allSQL += ' NOT NULL'
        }
        
        if (column.defaultValue) {
          allSQL += ` DEFAULT ${column.defaultValue}`
        }
        
        if (column.autoIncrement) {
          allSQL += ' AUTO_INCREMENT'
        }
        
        if (column.primaryKey) {
          allSQL += ' PRIMARY KEY'
        }
        
        if (index < table.columns.length - 1) {
          allSQL += ','
        }
        
        allSQL += ` -- ${column.description}\n`
      })
      
      allSQL += `);\n\n`
      
      // 添加索引
      if (table.indexes && table.indexes.length > 0) {
        allSQL += `-- 索引\n`
        table.indexes.forEach(index => {
          if (index.columns && index.columns.length > 0) {
            allSQL += `CREATE ${index.type} INDEX ${index.name} ON ${table.title.replace(/\(.*\)/, '')} (${index.columns.join(', ')}); -- ${index.description}\n`
          }
        })
        allSQL += '\n'
      }
      
      // 添加外键
      if (table.foreignKeys && table.foreignKeys.length > 0) {
        allSQL += `-- 外键\n`
        table.foreignKeys.forEach(fk => {
          if (fk.column && fk.refTable && fk.refColumn) {
            const refTableName = findNodeById(fk.refTable, dbStructure.value)?.title.replace(/\(.*\)/, '') || fk.refTable
            allSQL += `ALTER TABLE ${table.title.replace(/\(.*\)/, '')} ADD CONSTRAINT ${fk.name} FOREIGN KEY (${fk.column}) REFERENCES ${refTableName}(${fk.refColumn}) ON DELETE ${fk.onDelete} ON UPDATE ${fk.onUpdate};\n`
          }
        })
        allSQL += '\n'
      }
    }
  })
  
  const blob = new Blob([allSQL], { type: 'text/sql' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'database_design.sql'
  link.click()
  URL.revokeObjectURL(url)
  
  ElMessage.success('SQL导出成功')
}

// 文本编辑器功能
const contentEditor = ref(null)

// 格式化文本
const formatText = (type) => {
  if (!contentEditor.value || !selectedSection.value) return
  
  const textarea = contentEditor.value.textarea
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const selectedText = selectedSection.value.content.substring(start, end)
  
  let formattedText = ''
  
  switch (type) {
    case 'bold':
      formattedText = `**${selectedText}**`
      break
    case 'italic':
      formattedText = `*${selectedText}*`
      break
    case 'underline':
      formattedText = `__${selectedText}__`
      break
  }
  
  selectedSection.value.content = 
    selectedSection.value.content.substring(0, start) + 
    formattedText + 
    selectedSection.value.content.substring(end)
}

// 插入标题
const insertHeading = (level) => {
  if (!contentEditor.value || !selectedSection.value) return
  
  const textarea = contentEditor.value.textarea
  const start = textarea.selectionStart
  
  const heading = `${'#'.repeat(level)} `
  
  selectedSection.value.content = 
    selectedSection.value.content.substring(0, start) + 
    heading + 
    selectedSection.value.content.substring(start)
}

// 插入列表
const insertList = (type) => {
  if (!contentEditor.value || !selectedSection.value) return
  
  const textarea = contentEditor.value.textarea
  const start = textarea.selectionStart
  
  const listMarker = type === 'ul' ? '- ' : '1. '
  
  selectedSection.value.content = 
    selectedSection.value.content.substring(0, start) + 
    listMarker + 
    selectedSection.value.content.substring(start)
}

// 插入表格
const insertTable = () => {
  if (!contentEditor.value || !selectedSection.value) return
  
  const textarea = contentEditor.value.textarea
  const start = textarea.selectionStart
  
  const table = '\n| 列1 | 列2 | 列3 |\n|-----|-----|-----|\n| 数据1 | 数据2 | 数据3 |\n'
  
  selectedSection.value.content = 
    selectedSection.value.content.substring(0, start) + 
    table + 
    selectedSection.value.content.substring(start)
}

// 插入代码
const insertCode = () => {
  if (!contentEditor.value || !selectedSection.value) return
  
  const textarea = contentEditor.value.textarea
  const start = textarea.selectionStart
  
  const code = '\n```\n代码内容\n```\n'
  
  selectedSection.value.content = 
    selectedSection.value.content.substring(0, start) + 
    code + 
    selectedSection.value.content.substring(start)
}

// 插入链接
const insertLink = () => {
  if (!contentEditor.value || !selectedSection.value) return
  
  ElMessageBox.prompt('请输入链接地址', '插入链接', {
    confirmButtonText: '确定',
    cancelButtonText: '取消'
  }).then(({ value }) => {
    const textarea = contentEditor.value.textarea
    const start = textarea.selectionStart
    
    const link = `[链接文本](${value})`
    
    selectedSection.value.content = 
      selectedSection.value.content.substring(0, start) + 
      link + 
      selectedSection.value.content.substring(start)
  })
}

// 插入图片
const insertImage = () => {
  if (!contentEditor.value || !selectedSection.value) return
  
  ElMessageBox.prompt('请输入图片地址', '插入图片', {
    confirmButtonText: '确定',
    cancelButtonText: '取消'
  }).then(({ value }) => {
    const textarea = contentEditor.value.textarea
    const start = textarea.selectionStart
    
    const image = `![图片描述](${value})`
    
    selectedSection.value.content = 
      selectedSection.value.content.substring(0, start) + 
      image + 
      selectedSection.value.content.substring(start)
  })
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

// 刷新数据
const refreshData = () => {
  ElMessage.success('数据已刷新')
}

// 返回文档管理
const goBack = () => {
  router.push('/docs')
}

// 生成简单ER图
const generateSimpleERD = () => {
  erdType.value = 'simple'
  nextTick(() => {
    drawSimpleERD()
  })
}

// 生成详细ER图
const generateDetailedERD = () => {
  erdType.value = 'detailed'
  nextTick(() => {
    drawDetailedERD()
  })
}

// 生成物理模型
const generatePhysicalERD = () => {
  erdType.value = 'physical'
  nextTick(() => {
    drawPhysicalERD()
  })
}

// 绘制简单ER图
const drawSimpleERD = () => {
  if (!simpleERDCanvas.value) return
  
  const canvas = simpleERDCanvas.value
  const ctx = canvas.getContext('2d')
  
  // 设置画布大小
  canvas.width = canvas.offsetWidth
  canvas.height = 600
  
  // 清空画布
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  
  // 获取所有表
  const tables = getAllTables()
  
  // 绘制表和关系
  const tablePositions = {}
  const tableWidth = 150
  const tableHeight = 80
  const padding = 50
  const columns = 3
  
  // 计算表的位置
  tables.forEach((table, index) => {
    const row = Math.floor(index / columns)
    const col = index % columns
    
    tablePositions[table.id] = {
      x: padding + col * (tableWidth + padding),
      y: padding + row * (tableHeight + padding),
      width: tableWidth,
      height: tableHeight
    }
  })
  
  // 绘制表
  tables.forEach(table => {
    const pos = tablePositions[table.id]
    
    // 绘制矩形
    ctx.fillStyle = '#f0f9ff'
    ctx.fillRect(pos.x, pos.y, pos.width, pos.height)
    ctx.strokeStyle = '#0284c7'
    ctx.lineWidth = 2
    ctx.strokeRect(pos.x, pos.y, pos.width, pos.height)
    
    // 绘制表名
    ctx.fillStyle = '#0c4a6e'
    ctx.font = '14px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(table.title, pos.x + pos.width / 2, pos.y + pos.height / 2)
  })
  
  // 绘制关系线
  Object.values(tableDataMap.value).forEach(table => {
    if (table.type === 'table' && table.foreignKeys) {
      table.foreignKeys.forEach(fk => {
        if (fk.column && fk.refTable && tablePositions[fk.refTable]) {
          const fromPos = tablePositions[table.id]
          const toPos = tablePositions[fk.refTable]
          
          // 绘制连接线
          ctx.beginPath()
          ctx.moveTo(fromPos.x + fromPos.width / 2, fromPos.y + fromPos.height / 2)
          ctx.lineTo(toPos.x + toPos.width / 2, toPos.y + toPos.height / 2)
          ctx.strokeStyle = '#64748b'
          ctx.lineWidth = 1
          ctx.stroke()
          
          // 绘制箭头
          const angle = Math.atan2(
            toPos.y + toPos.height / 2 - (fromPos.y + fromPos.height / 2),
            toPos.x + toPos.width / 2 - (fromPos.x + fromPos.width / 2)
          )
          
          const arrowLength = 10
          const arrowAngle = Math.PI / 6
          
          ctx.beginPath()
          ctx.moveTo(
            toPos.x + toPos.width / 2,
            toPos.y + toPos.height / 2
          )
          ctx.lineTo(
            toPos.x + toPos.width / 2 - arrowLength * Math.cos(angle - arrowAngle),
            toPos.y + toPos.height / 2 - arrowLength * Math.sin(angle - arrowAngle)
          )
          ctx.moveTo(
            toPos.x + toPos.width / 2,
            toPos.y + toPos.height / 2
          )
          ctx.lineTo(
            toPos.x + toPos.width / 2 - arrowLength * Math.cos(angle + arrowAngle),
            toPos.y + toPos.height / 2 - arrowLength * Math.sin(angle + arrowAngle)
          )
          ctx.stroke()
        }
      })
    }
  })
}

// 绘制详细ER图
const drawDetailedERD = () => {
  if (!detailedERDCanvas.value) return
  
  const canvas = detailedERDCanvas.value
  const ctx = canvas.getContext('2d')
  
  // 设置画布大小
  canvas.width = canvas.offsetWidth
  canvas.height = 800
  
  // 清空画布
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  
  // 获取所有表
  const tables = getAllTables()
  
  // 绘制表和关系
  const tablePositions = {}
  const tableWidth = 200
  const columnHeight = 25
  const headerHeight = 30
  const padding = 50
  const columns = 2
  
  // 计算表的位置和高度
  tables.forEach((table, index) => {
    const row = Math.floor(index / columns)
    const col = index % columns
    
    const tableData = tableDataMap.value[table.id]
    const columnCount = tableData && tableData.columns ? tableData.columns.length : 0
    const tableHeight = headerHeight + columnCount * columnHeight
    
    tablePositions[table.id] = {
      x: padding + col * (tableWidth + padding * 2),
      y: padding + row * (tableHeight + padding * 2),
      width: tableWidth,
      height: tableHeight
    }
  })
  
  // 绘制表
  tables.forEach(table => {
    const pos = tablePositions[table.id]
    const tableData = tableDataMap.value[table.id]
    
    if (!tableData) return
    
    // 绘制表头
    ctx.fillStyle = '#dbeafe'
    ctx.fillRect(pos.x, pos.y, pos.width, headerHeight)
    ctx.strokeStyle = '#1e40af'
    ctx.lineWidth = 2
    ctx.strokeRect(pos.x, pos.y, pos.width, headerHeight)
    
    // 绘制表名
    ctx.fillStyle = '#1e3a8a'
    ctx.font = 'bold 14px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(table.title, pos.x + pos.width / 2, pos.y + headerHeight / 2)
    
    // 绘制字段
    if (tableData.columns) {
      tableData.columns.forEach((column, index) => {
        const y = pos.y + headerHeight + index * columnHeight
        
        // 绘制字段背景
        ctx.fillStyle = index % 2 === 0 ? '#f8fafc' : '#f1f5f9'
        ctx.fillRect(pos.x, y, pos.width, columnHeight)
        
        // 绘制字段边框
        ctx.strokeStyle = '#cbd5e1'
        ctx.lineWidth = 1
        ctx.strokeRect(pos.x, y, pos.width, columnHeight)
        
        // 绘制字段名
        ctx.fillStyle = '#334155'
        ctx.font = '12px sans-serif'
        ctx.textAlign = 'left'
        ctx.textBaseline = 'middle'
        
        let columnText = column.name
        if (column.primaryKey) {
          columnText = '🔑 ' + columnText
        }
        if (column.nullable === false) {
          columnText += ' *'
        }
        
        ctx.fillText(columnText, pos.x + 10, y + columnHeight / 2)
        
        // 绘制字段类型
        ctx.textAlign = 'right'
        ctx.fillText(column.type, pos.x + pos.width - 10, y + columnHeight / 2)
      })
    }
    
    // 绘制表边框
    ctx.strokeStyle = '#1e40af'
    ctx.lineWidth = 2
    ctx.strokeRect(pos.x, pos.y, pos.width, pos.height)
  })
  
  // 绘制关系线
  Object.values(tableDataMap.value).forEach(table => {
    if (table.type === 'table' && table.foreignKeys) {
      table.foreignKeys.forEach(fk => {
        if (fk.column && fk.refTable && tablePositions[fk.refTable]) {
          const fromPos = tablePositions[table.id]
          const toPos = tablePositions[fk.refTable]
          
          // 找到源字段和目标字段的位置
          let fromFieldIndex = 0
          let toFieldIndex = 0
          
          if (table.columns) {
            fromFieldIndex = table.columns.findIndex(col => col.name === fk.column)
          }
          
          const refTableData = tableDataMap.value[fk.refTable]
          if (refTableData && refTableData.columns) {
            toFieldIndex = refTableData.columns.findIndex(col => col.name === fk.refColumn)
          }
          
          const fromY = fromPos.y + headerHeight + fromFieldIndex * columnHeight + columnHeight / 2
          const toY = toPos.y + headerHeight + toFieldIndex * columnHeight + columnHeight / 2
          
          // 绘制连接线
          ctx.beginPath()
          ctx.moveTo(fromPos.x + fromPos.width, fromY)
          ctx.lineTo(toPos.x, toY)
          ctx.strokeStyle = '#64748b'
          ctx.lineWidth = 1
          ctx.stroke()
          
          // 绘制箭头
          const angle = Math.atan2(toY - fromY, toPos.x - (fromPos.x + fromPos.width))
          
          const arrowLength = 10
          const arrowAngle = Math.PI / 6
          
          ctx.beginPath()
          ctx.moveTo(toPos.x, toY)
          ctx.lineTo(
            toPos.x - arrowLength * Math.cos(angle - arrowAngle),
            toY - arrowLength * Math.sin(angle - arrowAngle)
          )
          ctx.moveTo(toPos.x, toY)
          ctx.lineTo(
            toPos.x - arrowLength * Math.cos(angle + arrowAngle),
            toY - arrowLength * Math.sin(angle + arrowAngle)
          )
          ctx.stroke()
          
          // 绘制关系标签
          const midX = (fromPos.x + fromPos.width + toPos.x) / 2
          const midY = (fromY + toY) / 2
          
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(midX - 30, midY - 10, 60, 20)
          
          ctx.fillStyle = '#64748b'
          ctx.font = '10px sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(fk.onDelete, midX, midY)
        }
      })
    }
  })
}

// 绘制物理模型
const drawPhysicalERD = () => {
  if (!physicalERDCanvas.value) return
  
  const canvas = physicalERDCanvas.value
  const ctx = canvas.getContext('2d')
  
  // 设置画布大小
  canvas.width = canvas.offsetWidth
  canvas.height = 800
  
  // 清空画布
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  
  // 获取所有表
  const tables = getAllTables()
  
  // 绘制表和关系
  const tablePositions = {}
  const tableWidth = 220
  const columnHeight = 25
  const headerHeight = 30
  const padding = 50
  const columns = 2
  
  // 计算表的位置和高度
  tables.forEach((table, index) => {
    const row = Math.floor(index / columns)
    const col = index % columns
    
    const tableData = tableDataMap.value[table.id]
    const columnCount = tableData && tableData.columns ? tableData.columns.length : 0
    const indexCount = tableData && tableData.indexes ? tableData.indexes.length : 0
    const tableHeight = headerHeight + columnCount * columnHeight + indexCount * columnHeight + 20
    
    tablePositions[table.id] = {
      x: padding + col * (tableWidth + padding * 2),
      y: padding + row * (tableHeight + padding * 2),
      width: tableWidth,
      height: tableHeight
    }
  })
  
  // 绘制表
  tables.forEach(table => {
    const pos = tablePositions[table.id]
    const tableData = tableDataMap.value[table.id]
    
    if (!tableData) return
    
    // 绘制表头
    ctx.fillStyle = '#dcfce7'
    ctx.fillRect(pos.x, pos.y, pos.width, headerHeight)
    ctx.strokeStyle = '#166534'
    ctx.lineWidth = 2
    ctx.strokeRect(pos.x, pos.y, pos.width, headerHeight)
    
    // 绘制表名
    ctx.fillStyle = '#14532d'
    ctx.font = 'bold 14px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(table.title, pos.x + pos.width / 2, pos.y + headerHeight / 2)
    
    // 绘制字段
    let currentY = pos.y + headerHeight
    
    if (tableData.columns) {
      tableData.columns.forEach((column, index) => {
        // 绘制字段背景
        ctx.fillStyle = index % 2 === 0 ? '#f8fafc' : '#f1f5f9'
        ctx.fillRect(pos.x, currentY, pos.width, columnHeight)
        
        // 绘制字段边框
        ctx.strokeStyle = '#cbd5e1'
        ctx.lineWidth = 1
        ctx.strokeRect(pos.x, currentY, pos.width, columnHeight)
        
        // 绘制字段名
        ctx.fillStyle = '#334155'
        ctx.font = '12px sans-serif'
        ctx.textAlign = 'left'
        ctx.textBaseline = 'middle'
        
        let columnText = column.name
        if (column.primaryKey) {
          columnText = '🔑 ' + columnText
        }
        if (column.nullable === false) {
          columnText += ' *'
        }
        
        ctx.fillText(columnText, pos.x + 10, currentY + columnHeight / 2)
        
        // 绘制字段类型和长度
        let typeText = column.type
        if (column.length) {
          typeText += `(${column.length})`
        }
        if (column.defaultValue) {
          typeText += ` = ${column.defaultValue}`
        }
        
        ctx.textAlign = 'right'
        ctx.fillText(typeText, pos.x + pos.width - 10, currentY + columnHeight / 2)
        
        currentY += columnHeight
      })
    }
    
    // 绘制索引
    if (tableData.indexes && tableData.indexes.length > 0) {
      // 绘制索引标题
      ctx.fillStyle = '#e0e7ff'
      ctx.fillRect(pos.x, currentY, pos.width, columnHeight)
      ctx.strokeStyle = '#4338ca'
      ctx.lineWidth = 1
      ctx.strokeRect(pos.x, currentY, pos.width, columnHeight)
      
      ctx.fillStyle = '#312e81'
      ctx.font = 'bold 12px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('索引', pos.x + pos.width / 2, currentY + columnHeight / 2)
      
      currentY += columnHeight
      
      // 绘制每个索引
      tableData.indexes.forEach((index, i) => {
        ctx.fillStyle = i % 2 === 0 ? '#f8fafc' : '#f1f5f9'
        ctx.fillRect(pos.x, currentY, pos.width, columnHeight)
        
        ctx.strokeStyle = '#cbd5e1'
        ctx.lineWidth = 1
        ctx.strokeRect(pos.x, currentY, pos.width, columnHeight)
        
        ctx.fillStyle = '#334155'
        ctx.font = '12px sans-serif'
        ctx.textAlign = 'left'
        ctx.textBaseline = 'middle'
        
        let indexText = index.name
        if (index.type === 'UNIQUE') {
          indexText = '🔒 ' + indexText
        }
        
        ctx.fillText(indexText, pos.x + 10, currentY + columnHeight / 2)
        
        ctx.textAlign = 'right'
        ctx.fillText(index.columns.join(', '), pos.x + pos.width - 10, currentY + columnHeight / 2)
        
        currentY += columnHeight
      })
    }
    
    // 绘制表边框
    ctx.strokeStyle = '#166534'
    ctx.lineWidth = 2
    ctx.strokeRect(pos.x, pos.y, pos.width, pos.height)
  })
  
  // 绘制关系线
  Object.values(tableDataMap.value).forEach(table => {
    if (table.type === 'table' && table.foreignKeys) {
      table.foreignKeys.forEach(fk => {
        if (fk.column && fk.refTable && tablePositions[fk.refTable]) {
          const fromPos = tablePositions[table.id]
          const toPos = tablePositions[fk.refTable]
          
          // 找到源字段和目标字段的位置
          let fromFieldIndex = 0
          let toFieldIndex = 0
          
          if (table.columns) {
            fromFieldIndex = table.columns.findIndex(col => col.name === fk.column)
          }
          
          const refTableData = tableDataMap.value[fk.refTable]
          if (refTableData && refTableData.columns) {
            toFieldIndex = refTableData.columns.findIndex(col => col.name === fk.refColumn)
          }
          
          const fromY = fromPos.y + headerHeight + fromFieldIndex * columnHeight + columnHeight / 2
          const toY = toPos.y + headerHeight + toFieldIndex * columnHeight + columnHeight / 2
          
          // 绘制连接线
          ctx.beginPath()
          ctx.moveTo(fromPos.x + fromPos.width, fromY)
          ctx.lineTo(toPos.x, toY)
          ctx.strokeStyle = '#64748b'
          ctx.lineWidth = 1
          ctx.stroke()
          
          // 绘制箭头
          const angle = Math.atan2(toY - fromY, toPos.x - (fromPos.x + fromPos.width))
          
          const arrowLength = 10
          const arrowAngle = Math.PI / 6
          
          ctx.beginPath()
          ctx.moveTo(toPos.x, toY)
          ctx.lineTo(
            toPos.x - arrowLength * Math.cos(angle - arrowAngle),
            toY - arrowLength * Math.sin(angle - arrowAngle)
          )
          ctx.moveTo(toPos.x, toY)
          ctx.lineTo(
            toPos.x - arrowLength * Math.cos(angle + arrowAngle),
            toY - arrowLength * Math.sin(angle + arrowAngle)
          )
          ctx.stroke()
          
          // 绘制关系标签
          const midX = (fromPos.x + fromPos.width + toPos.x) / 2
          const midY = (fromY + toY) / 2
          
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(midX - 40, midY - 10, 80, 20)
          
          ctx.fillStyle = '#64748b'
          ctx.font = '10px sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(`${fk.onDelete}/${fk.onUpdate}`, midX, midY)
        }
      })
    }
  })
}

// 导出ER图
const exportERD = () => {
  let canvas = null
  
  switch (erdType.value) {
    case 'simple':
      canvas = simpleERDCanvas.value
      break
    case 'detailed':
      canvas = detailedERDCanvas.value
      break
    case 'physical':
      canvas = physicalERDCanvas.value
      break
  }
  
  if (!canvas) return
  
  canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `erd_${erdType.value}_${Date.now()}.png`
    link.click()
    URL.revokeObjectURL(url)
    
    ElMessage.success('ER图导出成功')
  })
}

// 打印ER图
const printERD = () => {
  let canvas = null
  
  switch (erdType.value) {
    case 'simple':
      canvas = simpleERDCanvas.value
      break
    case 'detailed':
      canvas = detailedERDCanvas.value
      break
    case 'physical':
      canvas = physicalERDCanvas.value
      break
  }
  
  if (!canvas) return
  
  const dataUrl = canvas.toDataURL()
  const printWindow = window.open('', '_blank')
  printWindow.document.write(`
    <html>
      <head>
        <title>ER图打印</title>
        <style>
          body { margin: 0; padding: 20px; }
          img { max-width: 100%; }
        </style>
      </head>
      <body>
        <img src="${dataUrl}" />
      </body>
    </html>
  `)
  printWindow.document.close()
  printWindow.print()
}

// 生成ER图
const generateERD = () => {
  erdVisible.value = true
  nextTick(() => {
    generateSimpleERD()
  })
}

// 预览内容
const previewContent = () => {
  if (!selectedSection.value) return
  
  if (selectedSection.value.type === 'table') {
    // 生成表结构的HTML预览
    let html = `<h3>${selectedSection.value.title}</h3>`
    html += '<table border="1" style="border-collapse: collapse; width: 100%;">'
    html += '<tr><th>字段名</th><th>类型</th><th>长度</th><th>可空</th><th>主键</th><th>自增</th><th>默认值</th><th>描述</th></tr>'
    
    selectedSection.value.columns.forEach(column => {
      html += '<tr>'
      html += `<td>${column.name}</td>`
      html += `<td>${column.type}</td>`
      html += `<td>${column.length}</td>`
      html += `<td>${column.nullable ? '是' : '否'}</td>`
      html += `<td>${column.primaryKey ? '是' : '否'}</td>`
      html += `<td>${column.autoIncrement ? '是' : '否'}</td>`
      html += `<td>${column.defaultValue}</td>`
      html += `<td>${column.description}</td>`
      html += '</tr>'
    })
    
    html += '</table>'
    
    // 添加索引信息
    if (selectedSection.value.indexes && selectedSection.value.indexes.length > 0) {
      html += '<h4>索引</h4>'
      html += '<table border="1" style="border-collapse: collapse; width: 100%;">'
      html += '<tr><th>索引名</th><th>类型</th><th>字段</th><th>描述</th></tr>'
      
      selectedSection.value.indexes.forEach(index => {
        html += '<tr>'
        html += `<td>${index.name}</td>`
        html += `<td>${index.type}</td>`
        html += `<td>${index.columns.join(', ')}</td>`
        html += `<td>${index.description}</td>`
        html += '</tr>'
      })
      
      html += '</table>'
    }
    
    // 添加外键信息
    if (selectedSection.value.foreignKeys && selectedSection.value.foreignKeys.length > 0) {
      html += '<h4>外键</h4>'
      html += '<table border="1" style="border-collapse: collapse; width: 100%;">'
      html += '<tr><th>约束名</th><th>本表字段</th><th>引用表</th><th>引用字段</th><th>删除规则</th><th>更新规则</th></tr>'
      
      selectedSection.value.foreignKeys.forEach(fk => {
        const refTableName = findNodeById(fk.refTable, dbStructure.value)?.title || fk.refTable
        html += '<tr>'
        html += `<td>${fk.name}</td>`
        html += `<td>${fk.column}</td>`
        html += `<td>${refTableName}</td>`
        html += `<td>${fk.refColumn}</td>`
        html += `<td>${fk.onDelete}</td>`
        html += `<td>${fk.onUpdate}</td>`
        html += '</tr>'
      })
      
      html += '</table>'
    }
    
    previewHtml.value = html
  } else {
    // 简单的Markdown转HTML预览
    previewHtml.value = selectedSection.value.content
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/__(.*?)__/g, '<u>$1</u>')
      .replace(/#{1,6}\s+(.*?)\n/g, '<h3>$1</h3>')
      .replace(/^- (.*?)$/gm, '<li>$1</li>')
      .replace(/^(\d+)\. (.*?)$/gm, '<li>$1. $2</li>')
      .replace(/<li>/g, '<ul><li>')
      .replace(/<\/li>/g, '</li></ul>')
      .replace(/<\/li><ul><li>/g, '</li><li>')
      .replace(/<\/ul><ul>/g, '')
  }
  
  previewVisible.value = true
}

// 工具函数：生成ID
const generateId = (parentId) => {
  if (!parentId) return Date.now().toString()
  
  const parent = findNodeById(parentId, dbStructure.value)
  if (!parent || !parent.children) return Date.now().toString()
  
  const siblingIds = parent.children.map(child => child.id)
  let maxId = 0
  
  siblingIds.forEach(id => {
    const parts = id.split('.')
    if (parts.length > 1) {
      const lastPart = parseInt(parts[parts.length - 1])
      if (!isNaN(lastPart) && lastPart > maxId) {
        maxId = lastPart
      }
    }
  })
  
  return `${parentId}.${maxId + 1}`
}

// 工具函数：根据ID查找节点
const findNodeById = (id, nodes) => {
  for (const node of nodes) {
    if (node.id === id) {
      return node
    }
    if (node.children) {
      const found = findNodeById(id, node.children)
      if (found) return found
    }
  }
  return null
}

// 工具函数：查找父节点ID
const findParentId = (id, nodes, parent = null) => {
  for (const node of nodes) {
    if (node.id === id) {
      return parent ? parent.id : null
    }
    if (node.children) {
      const found = findParentId(id, node.children, node)
      if (found !== undefined) return found
    }
  }
  return undefined
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

.header-content {
  display: flex;
  align-items: center;
  gap: 12px;
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

.back-button {
  margin-right: 8px;
}

.doc-sidebar {
  background-color: #fafafa;
  border-right: 1px solid #e4e7ed;
  padding: 20px 10px;
  overflow-y: auto;
}

.sidebar-header {
  margin-bottom: 16px;
}

.sidebar-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.tree-node .el-icon {
  font-size: 16px;
}

.node-actions {
  margin-left: auto;
  display: none;
}

.tree-node:hover .node-actions {
  display: flex;
  gap: 4px;
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

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-title h2 {
  margin: 0;
  color: #303133;
}

.section-meta {
  display: flex;
  gap: 10px;
  font-size: 14px;
  color: #909399;
}

.table-editor {
  flex: 1;
  margin: 20px 0;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  overflow: hidden;
}

.table-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
}

.toolbar-left, .toolbar-right {
  display: flex;
  gap: 8px;
}

.table-tabs {
  height: 100%;
}

.table-tabs :deep(.el-tabs__content) {
  height: calc(100% - 40px);
  overflow-y: auto;
}

.table-actions {
  padding: 12px 16px;
  border-top: 1px solid #e4e7ed;
  background-color: #f5f7fa;
}

.editor-container {
  flex: 1;
  margin: 20px 0;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  overflow: hidden;
}

.editor-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background-color: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
  flex-wrap: wrap;
}

.editor-container :deep(.el-textarea__inner) {
  border: none;
  border-radius: 0;
  box-shadow: none;
  resize: none;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 14px;
  line-height: 1.6;
}

.editor-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-top: 20px;
  padding: 12px 0;
  border-top: 1px solid #e4e7ed;
}

.editor-info {
  display: flex;
  gap: 16px;
  font-size: 14px;
  color: #909399;
}

.editor-buttons {
  display: flex;
  gap: 8px;
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

.erd-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 8px 0;
  border-bottom: 1px solid #e4e7ed;
}

.erd-actions {
  display: flex;
  gap: 8px;
}

.erd-container {
  text-align: center;
  height: 600px;
  overflow: auto;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 16px;
}

.erd-container canvas {
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  max-width: 100%;
}

.sql-preview-dialog :deep(.el-dialog__body) {
  padding: 0 20px 20px;
}

.sql-preview-content {
  background-color: #f5f7fa;
  padding: 16px;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 500px;
  overflow-y: auto;
}

/* 右键菜单样式 */
.context-menu {
  position: fixed;
  z-index: 9999;
  background-color: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  padding: 4px 0;
  min-width: 120px;
}

.context-menu-item {
  padding: 8px 16px;
  cursor: pointer;
  font-size: 14px;
  color: #606266;
  display: flex;
  align-items: center;
  gap: 8px;
}

.context-menu-item:hover {
  background-color: #f5f7fa;
  color: #409eff;
}

.context-menu-item.is-disabled {
  color: #c0c4cc;
  cursor: not-allowed;
}

.context-menu-item.is-disabled:hover {
  background-color: transparent;
  color: #c0c4cc;
}

.context-menu-divider {
  height: 1px;
  background-color: #e4e7ed;
  margin: 4px 0;
}

/* 拖拽样式 */
.drag-over {
  background-color: #ecf5ff;
  border: 1px dashed #409eff;
}

.drag-node {
  opacity: 0.5;
}

/* 搜索框样式 */
.search-input {
  margin-bottom: 16px;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .doc-sidebar {
    width: 250px;
  }
}

@media (max-width: 992px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    padding: 16px;
  }
  
  .header-content {
    margin-bottom: 12px;
  }
  
  .header-actions {
    width: 100%;
    justify-content: flex-end;
  }
  
  .doc-sidebar {
    width: 100%;
    height: 300px;
    border-right: none;
    border-bottom: 1px solid #e4e7ed;
  }
}

@media (max-width: 768px) {
  .page-header {
    padding: 12px 16px;
  }
  
  .header-content h1 {
    font-size: 18px;
  }
  
  .header-actions {
    gap: 8px;
  }
  
  .doc-content {
    padding: 16px;
  }
  
  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .section-meta {
    flex-wrap: wrap;
  }
  
  .table-toolbar {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .toolbar-left, .toolbar-right {
    width: 100%;
    justify-content: flex-start;
  }
  
  .editor-toolbar {
    flex-wrap: wrap;
  }
  
  .editor-actions {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .editor-info {
    width: 100%;
  }
  
  .erd-toolbar {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
}
</style>