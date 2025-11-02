<template>
  <div class="system-doc">
    <el-container>
      <el-header class="page-header">
        <div class="header-content">
          <h1>系统设计文档管理</h1>
          <p>管理系统架构设计、模块设计和界面设计文档</p>
        </div>
        <div class="header-actions">
          <el-button type="primary" @click="saveDocument">保存更改</el-button>
          <el-button @click="exportDocument">导出文档</el-button>
          <el-button @click="generateDiagrams">生成图表</el-button>
        </div>
      </el-header>
      
      <el-container>
        <el-aside width="250px" class="doc-sidebar">
          <el-tree
            :data="systemStructure"
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
            
            <!-- 系统架构编辑器 -->
            <div v-if="selectedSection.type === 'architecture'" class="architecture-editor">
              <el-form :model="selectedSection" label-width="100px">
                <el-form-item label="架构类型">
                  <el-select v-model="selectedSection.archType" placeholder="选择架构类型">
                    <el-option label="系统整体架构" value="system" />
                    <el-option label="前端架构" value="frontend" />
                    <el-option label="后端架构" value="backend" />
                    <el-option label="数据库架构" value="database" />
                  </el-select>
                </el-form-item>
                
                <el-form-item label="架构描述">
                  <el-input
                    v-model="selectedSection.description"
                    type="textarea"
                    :rows="5"
                    placeholder="请描述架构设计思路和原则"
                  />
                </el-form-item>
                
                <el-form-item label="架构图">
                  <div class="diagram-container">
                    <img v-if="selectedSection.diagram" :src="selectedSection.diagram" alt="架构图" />
                    <div v-else class="diagram-placeholder">
                      <el-button @click="uploadDiagram">上传架构图</el-button>
                    </div>
                  </div>
                </el-form-item>
                
                <el-form-item label="组件说明">
                  <el-table :data="selectedSection.components" style="width: 100%">
                    <el-table-column prop="name" label="组件名" width="200">
                      <template #default="scope">
                        <el-input v-model="scope.row.name" />
                      </template>
                    </el-table-column>
                    <el-table-column prop="type" label="类型" width="150">
                      <template #default="scope">
                        <el-select v-model="scope.row.type" placeholder="选择类型">
                          <el-option label="服务" value="service" />
                          <el-option label="组件" value="component" />
                          <el-option label="模块" value="module" />
                          <el-option label="接口" value="interface" />
                        </el-select>
                      </template>
                    </el-table-column>
                    <el-table-column prop="description" label="描述">
                      <template #default="scope">
                        <el-input v-model="scope.row.description" />
                      </template>
                    </el-table-column>
                    <el-table-column label="操作" width="100">
                      <template #default="scope">
                        <el-button type="danger" size="small" @click="removeComponent(scope.$index)">删除</el-button>
                      </template>
                    </el-table-column>
                  </el-table>
                  
                  <div class="table-actions">
                    <el-button type="primary" @click="addComponent">添加组件</el-button>
                  </div>
                </el-form-item>
              </el-form>
            </div>
            
            <!-- 模块设计编辑器 -->
            <div v-else-if="selectedSection.type === 'module'" class="module-editor">
              <el-form :model="selectedSection" label-width="100px">
                <el-form-item label="模块名称">
                  <el-input v-model="selectedSection.moduleName" />
                </el-form-item>
                
                <el-form-item label="模块描述">
                  <el-input
                    v-model="selectedSection.description"
                    type="textarea"
                    :rows="3"
                    placeholder="请描述模块功能和职责"
                  />
                </el-form-item>
                
                <el-form-item label="模块功能">
                  <el-table :data="selectedSection.functions" style="width: 100%">
                    <el-table-column prop="name" label="功能名" width="200">
                      <template #default="scope">
                        <el-input v-model="scope.row.name" />
                      </template>
                    </el-table-column>
                    <el-table-column prop="description" label="描述">
                      <template #default="scope">
                        <el-input v-model="scope.row.description" />
                      </template>
                    </el-table-column>
                    <el-table-column label="操作" width="100">
                      <template #default="scope">
                        <el-button type="danger" size="small" @click="removeFunction(scope.$index)">删除</el-button>
                      </template>
                    </el-table-column>
                  </el-table>
                  
                  <div class="table-actions">
                    <el-button type="primary" @click="addFunction">添加功能</el-button>
                  </div>
                </el-form-item>
                
                <el-form-item label="接口定义">
                  <el-table :data="selectedSection.interfaces" style="width: 100%">
                    <el-table-column prop="name" label="接口名" width="200">
                      <template #default="scope">
                        <el-input v-model="scope.row.name" />
                      </template>
                    </el-table-column>
                    <el-table-column prop="method" label="方法" width="100">
                      <template #default="scope">
                        <el-select v-model="scope.row.method" placeholder="方法">
                          <el-option label="GET" value="GET" />
                          <el-option label="POST" value="POST" />
                          <el-option label="PUT" value="PUT" />
                          <el-option label="DELETE" value="DELETE" />
                        </el-select>
                      </template>
                    </el-table-column>
                    <el-table-column prop="path" label="路径" width="200">
                      <template #default="scope">
                        <el-input v-model="scope.row.path" />
                      </template>
                    </el-table-column>
                    <el-table-column prop="description" label="描述">
                      <template #default="scope">
                        <el-input v-model="scope.row.description" />
                      </template>
                    </el-table-column>
                    <el-table-column label="操作" width="100">
                      <template #default="scope">
                        <el-button type="danger" size="small" @click="removeInterface(scope.$index)">删除</el-button>
                      </template>
                    </el-table-column>
                  </el-table>
                  
                  <div class="table-actions">
                    <el-button type="primary" @click="addInterface">添加接口</el-button>
                  </div>
                </el-form-item>
              </el-form>
            </div>
            
            <!-- 界面设计编辑器 -->
            <div v-else-if="selectedSection.type === 'ui'" class="ui-editor">
              <el-form :model="selectedSection" label-width="100px">
                <el-form-item label="页面名称">
                  <el-input v-model="selectedSection.pageName" />
                </el-form-item>
                
                <el-form-item label="页面描述">
                  <el-input
                    v-model="selectedSection.description"
                    type="textarea"
                    :rows="3"
                    placeholder="请描述页面功能和用途"
                  />
                </el-form-item>
                
                <el-form-item label="界面原型">
                  <div class="diagram-container">
                    <img v-if="selectedSection.prototype" :src="selectedSection.prototype" alt="界面原型" />
                    <div v-else class="diagram-placeholder">
                      <el-button @click="uploadPrototype">上传界面原型</el-button>
                    </div>
                  </div>
                </el-form-item>
                
                <el-form-item label="UI组件">
                  <el-table :data="selectedSection.components" style="width: 100%">
                    <el-table-column prop="name" label="组件名" width="200">
                      <template #default="scope">
                        <el-input v-model="scope.row.name" />
                      </template>
                    </el-table-column>
                    <el-table-column prop="type" label="类型" width="150">
                      <template #default="scope">
                        <el-select v-model="scope.row.type" placeholder="选择类型">
                          <el-option label="表单" value="form" />
                          <el-option label="表格" value="table" />
                          <el-option label="图表" value="chart" />
                          <el-option label="按钮" value="button" />
                          <el-option label="对话框" value="dialog" />
                        </el-select>
                      </template>
                    </el-table-column>
                    <el-table-column prop="description" label="描述">
                      <template #default="scope">
                        <el-input v-model="scope.row.description" />
                      </template>
                    </el-table-column>
                    <el-table-column label="操作" width="100">
                      <template #default="scope">
                        <el-button type="danger" size="small" @click="removeUIComponent(scope.$index)">删除</el-button>
                      </template>
                    </el-table-column>
                  </el-table>
                  
                  <div class="table-actions">
                    <el-button type="primary" @click="addUIComponent">添加组件</el-button>
                  </div>
                </el-form-item>
              </el-form>
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
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'

// 系统结构数据
const systemStructure = ref([
  {
    id: '1',
    title: '系统架构设计',
    children: [
      { id: '1.1', title: '整体架构', type: 'architecture' },
      { id: '1.2', title: '前端架构', type: 'architecture' },
      { id: '1.3', title: '后端架构', type: 'architecture' },
      { id: '1.4', title: '数据库架构', type: 'architecture' }
    ]
  },
  {
    id: '2',
    title: '模块设计',
    children: [
      { id: '2.1', title: '用户管理模块', type: 'module' },
      { id: '2.2', title: '寝室管理模块', type: 'module' },
      { id: '2.3', title: '费用管理模块', type: 'module' },
      { id: '2.4', title: '支付管理模块', type: 'module' },
      { id: '2.5', title: '系统管理模块', type: 'module' }
    ]
  },
  {
    id: '3',
    title: '界面设计',
    children: [
      { id: '3.1', title: '首页设计', type: 'ui' },
      { id: '3.2', title: '用户界面设计', type: 'ui' },
      { id: '3.3', title: '寝室界面设计', type: 'ui' },
      { id: '3.4', title: '费用界面设计', type: 'ui' },
      { id: '3.5', title: '支付界面设计', type: 'ui' }
    ]
  },
  {
    id: '4',
    title: '设计原则',
    children: [
      { id: '4.1', title: '可扩展性' },
      { id: '4.2', title: '安全性' },
      { id: '4.3', title: '性能优化' },
      { id: '4.4', title: '用户体验' }
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

// 系统设计数据（实际项目中应该从API获取）
const systemDataMap = ref({
  '1.1': {
    id: '1.1',
    title: '整体架构',
    type: 'architecture',
    version: 'v1.2',
    updateTime: '2023-12-01',
    author: '张三',
    archType: 'system',
    description: '记账系统采用前后端分离的架构设计，前端使用Vue3+Element Plus，后端使用Node.js+Express，数据库使用MySQL。系统分为用户端和管理端两个主要部分，用户端提供费用记录、分摊计算、支付等功能，管理端提供用户管理、系统配置、数据统计等功能。',
    diagram: 'https://picsum.photos/seed/system-architecture/800/600.jpg',
    components: [
      { name: '前端应用', type: 'component', description: '基于Vue3的SPA应用，提供用户界面' },
      { name: '管理端应用', type: 'component', description: '基于Vue3的管理后台，提供系统管理功能' },
      { name: 'API网关', type: 'service', description: '统一API入口，处理请求路由和认证' },
      { name: '用户服务', type: 'service', description: '处理用户注册、登录、信息管理等功能' },
      { name: '费用服务', type: 'service', description: '处理费用记录、分摊计算等功能' },
      { name: '支付服务', type: 'service', description: '处理支付流程和支付记录' },
      { name: '数据库', type: 'module', description: 'MySQL数据库，存储系统数据' }
    ]
  },
  '2.1': {
    id: '2.1',
    title: '用户管理模块',
    type: 'module',
    version: 'v1.1',
    updateTime: '2023-11-28',
    author: '李四',
    moduleName: '用户管理模块',
    description: '用户管理模块负责处理用户注册、登录、信息管理、权限控制等功能，是系统的基础模块。',
    functions: [
      { name: '用户注册', description: '新用户注册账号，支持邮箱和手机号注册' },
      { name: '用户登录', description: '用户登录验证，支持账号密码和手机验证码登录' },
      { name: '信息管理', description: '用户个人信息管理，包括昵称、头像、联系方式等' },
      { name: '密码管理', description: '密码修改、重置功能' },
      { name: '权限控制', description: '基于角色的权限控制，管理用户访问权限' }
    ],
    interfaces: [
      { name: '用户注册', method: 'POST', path: '/api/user/register', description: '用户注册接口' },
      { name: '用户登录', method: 'POST', path: '/api/user/login', description: '用户登录接口' },
      { name: '获取用户信息', method: 'GET', path: '/api/user/info', description: '获取当前用户信息' },
      { name: '更新用户信息', method: 'PUT', path: '/api/user/info', description: '更新用户信息' },
      { name: '修改密码', method: 'PUT', path: '/api/user/password', description: '修改用户密码' }
    ]
  },
  '3.1': {
    id: '3.1',
    title: '首页设计',
    type: 'ui',
    version: 'v1.0',
    updateTime: '2023-11-25',
    author: '王五',
    pageName: '首页',
    description: '首页是用户进入系统的第一个页面，展示用户概览信息、快捷操作入口和最新动态。',
    prototype: 'https://picsum.photos/seed/homepage-ui/800/600.jpg',
    components: [
      { name: '用户信息卡片', type: 'form', description: '显示用户头像、昵称和基本信息' },
      { name: '费用概览', type: 'chart', description: '展示本月费用统计和图表' },
      { name: '快捷操作', type: 'button', description: '提供添加费用、支付等快捷操作按钮' },
      { name: '最新动态', type: 'table', description: '显示最新的费用记录和支付记录' }
    ]
  },
  '4.1': {
    id: '4.1',
    title: '可扩展性',
    type: 'text',
    version: 'v1.0',
    updateTime: '2023-11-20',
    author: '赵六',
    content: '系统可扩展性设计原则：\n\n1. 模块化设计\n   - 系统采用模块化设计，各模块之间低耦合高内聚\n   - 通过API接口进行模块间通信，便于独立扩展\n\n2. 微服务架构\n   - 后端采用微服务架构，各服务可独立部署和扩展\n   - 使用API网关统一管理服务入口\n\n3. 数据库设计\n   - 数据库设计考虑未来扩展需求，预留扩展字段\n   - 采用分库分表策略，支持数据量增长\n\n4. 前端组件化\n   - 前端采用组件化开发，组件可复用和独立扩展\n   - 使用组件库统一UI风格，便于维护和扩展'
  }
})

// 处理节点点击事件
const handleNodeClick = (data) => {
  // 检查是否是叶子节点（没有子节点）
  if (!data.children || data.children.length === 0) {
    if (data.type === 'architecture') {
      selectedSection.value = systemDataMap.value[data.id] || {
        id: data.id,
        title: data.title,
        type: 'architecture',
        version: 'v1.0',
        updateTime: new Date().toISOString().split('T')[0],
        author: '当前用户',
        archType: 'system',
        description: '',
        diagram: '',
        components: []
      }
    } else if (data.type === 'module') {
      selectedSection.value = systemDataMap.value[data.id] || {
        id: data.id,
        title: data.title,
        type: 'module',
        version: 'v1.0',
        updateTime: new Date().toISOString().split('T')[0],
        author: '当前用户',
        moduleName: '',
        description: '',
        functions: [],
        interfaces: []
      }
    } else if (data.type === 'ui') {
      selectedSection.value = systemDataMap.value[data.id] || {
        id: data.id,
        title: data.title,
        type: 'ui',
        version: 'v1.0',
        updateTime: new Date().toISOString().split('T')[0],
        author: '当前用户',
        pageName: '',
        description: '',
        prototype: '',
        components: []
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

// 添加组件
const addComponent = () => {
  if (!selectedSection.value || !selectedSection.value.components) return
  
  selectedSection.value.components.push({
    name: '',
    type: 'component',
    description: ''
  })
}

// 删除组件
const removeComponent = (index) => {
  if (!selectedSection.value || !selectedSection.value.components) return
  
  selectedSection.value.components.splice(index, 1)
}

// 添加功能
const addFunction = () => {
  if (!selectedSection.value || !selectedSection.value.functions) return
  
  selectedSection.value.functions.push({
    name: '',
    description: ''
  })
}

// 删除功能
const removeFunction = (index) => {
  if (!selectedSection.value || !selectedSection.value.functions) return
  
  selectedSection.value.functions.splice(index, 1)
}

// 添加接口
const addInterface = () => {
  if (!selectedSection.value || !selectedSection.value.interfaces) return
  
  selectedSection.value.interfaces.push({
    name: '',
    method: 'GET',
    path: '',
    description: ''
  })
}

// 删除接口
const removeInterface = (index) => {
  if (!selectedSection.value || !selectedSection.value.interfaces) return
  
  selectedSection.value.interfaces.splice(index, 1)
}

// 添加UI组件
const addUIComponent = () => {
  if (!selectedSection.value || !selectedSection.value.components) return
  
  selectedSection.value.components.push({
    name: '',
    type: 'form',
    description: ''
  })
}

// 删除UI组件
const removeUIComponent = (index) => {
  if (!selectedSection.value || !selectedSection.value.components) return
  
  selectedSection.value.components.splice(index, 1)
}

// 上传架构图
const uploadDiagram = () => {
  // 实际项目中应该实现文件上传逻辑
  ElMessage.success('架构图上传成功')
  if (selectedSection.value) {
    selectedSection.value.diagram = 'https://picsum.photos/seed/new-diagram/800/600.jpg'
  }
}

// 上传界面原型
const uploadPrototype = () => {
  // 实际项目中应该实现文件上传逻辑
  ElMessage.success('界面原型上传成功')
  if (selectedSection.value) {
    selectedSection.value.prototype = 'https://picsum.photos/seed/new-prototype/800/600.jpg'
  }
}

// 保存章节
const saveSection = () => {
  if (!selectedSection.value) return
  
  // 更新内容映射
  systemDataMap.value[selectedSection.value.id] = {
    ...selectedSection.value,
    updateTime: new Date().toISOString().split('T')[0]
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

// 生成图表
const generateDiagrams = () => {
  // 实际项目中应该调用API生成图表
  ElMessage.success('图表生成中...')
}

// 预览内容
const previewContent = () => {
  if (!selectedSection.value) return
  
  if (selectedSection.value.type === 'architecture') {
    // 生成系统架构的HTML预览
    let html = `<h3>${selectedSection.value.title}</h3>`
    html += `<p><strong>架构类型:</strong> ${selectedSection.value.archType}</p>`
    html += `<p><strong>架构描述:</strong> ${selectedSection.value.description}</p>`
    
    if (selectedSection.value.diagram) {
      html += '<h4>架构图:</h4>'
      html += `<img src="${selectedSection.value.diagram}" alt="架构图" style="max-width: 100%; border: 1px solid #e4e7ed; border-radius: 4px;" />`
    }
    
    html += '<h4>组件说明:</h4>'
    html += '<table border="1" style="border-collapse: collapse; width: 100%;">'
    html += '<tr><th>组件名</th><th>类型</th><th>描述</th></tr>'
    
    selectedSection.value.components.forEach(component => {
      html += '<tr>'
      html += `<td>${component.name}</td>`
      html += `<td>${component.type}</td>`
      html += `<td>${component.description}</td>`
      html += '</tr>'
    })
    
    html += '</table>'
    
    previewHtml.value = html
  } else if (selectedSection.value.type === 'module') {
    // 生成模块设计的HTML预览
    let html = `<h3>${selectedSection.value.title}</h3>`
    html += `<p><strong>模块名称:</strong> ${selectedSection.value.moduleName}</p>`
    html += `<p><strong>模块描述:</strong> ${selectedSection.value.description}</p>`
    
    html += '<h4>模块功能:</h4>'
    html += '<table border="1" style="border-collapse: collapse; width: 100%;">'
    html += '<tr><th>功能名</th><th>描述</th></tr>'
    
    selectedSection.value.functions.forEach(func => {
      html += '<tr>'
      html += `<td>${func.name}</td>`
      html += `<td>${func.description}</td>`
      html += '</tr>'
    })
    
    html += '</table>'
    
    html += '<h4>接口定义:</h4>'
    html += '<table border="1" style="border-collapse: collapse; width: 100%;">'
    html += '<tr><th>接口名</th><th>方法</th><th>路径</th><th>描述</th></tr>'
    
    selectedSection.value.interfaces.forEach(iface => {
      html += '<tr>'
      html += `<td>${iface.name}</td>`
      html += `<td>${iface.method}</td>`
      html += `<td>${iface.path}</td>`
      html += `<td>${iface.description}</td>`
      html += '</tr>'
    })
    
    html += '</table>'
    
    previewHtml.value = html
  } else if (selectedSection.value.type === 'ui') {
    // 生成界面设计的HTML预览
    let html = `<h3>${selectedSection.value.title}</h3>`
    html += `<p><strong>页面名称:</strong> ${selectedSection.value.pageName}</p>`
    html += `<p><strong>页面描述:</strong> ${selectedSection.value.description}</p>`
    
    if (selectedSection.value.prototype) {
      html += '<h4>界面原型:</h4>'
      html += `<img src="${selectedSection.value.prototype}" alt="界面原型" style="max-width: 100%; border: 1px solid #e4e7ed; border-radius: 4px;" />`
    }
    
    html += '<h4>UI组件:</h4>'
    html += '<table border="1" style="border-collapse: collapse; width: 100%;">'
    html += '<tr><th>组件名</th><th>类型</th><th>描述</th></tr>'
    
    selectedSection.value.components.forEach(component => {
      html += '<tr>'
      html += `<td>${component.name}</td>`
      html += `<td>${component.type}</td>`
      html += `<td>${component.description}</td>`
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
  // 这里可以添加API调用来获取最新的系统设计数据
  console.log('系统设计文档管理页面已加载')
})
</script>

<style scoped>
.system-doc {
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

.architecture-editor,
.module-editor,
.ui-editor {
  flex: 1;
  margin: 20px 0;
}

.diagram-container {
  width: 100%;
  text-align: center;
  border: 1px dashed #dcdfe6;
  border-radius: 4px;
  padding: 10px;
}

.diagram-container img {
  max-width: 100%;
  border-radius: 4px;
}

.diagram-placeholder {
  padding: 20px;
  color: #909399;
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
</style>