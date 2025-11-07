<template>
  <div class="api-doc">
    <el-container>
      <el-header class="page-header">
        <div class="header-content">
          <h1>API接口文档管理</h1>
          <p>管理API接口定义、请求参数、响应格式和示例代码</p>
        </div>
        <div class="header-actions">
          <el-button type="primary" @click="saveDocument">保存更改</el-button>
          <el-button @click="exportDocument">导出文档</el-button>
          <el-button @click="generateSwagger">生成Swagger</el-button>
        </div>
      </el-header>
      
      <el-container>
        <el-aside width="250px" class="doc-sidebar">
          <el-tree
            :data="apiStructure"
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
            
            <!-- API接口编辑器 -->
            <div v-if="selectedSection.type === 'api'" class="api-editor">
              <el-form :model="selectedSection" label-width="100px">
                <el-form-item label="接口名称">
                  <el-input v-model="selectedSection.name" />
                </el-form-item>
                
                <el-form-item label="请求方法">
                  <el-select v-model="selectedSection.method" placeholder="选择请求方法">
                    <el-option label="GET" value="GET" />
                    <el-option label="POST" value="POST" />
                    <el-option label="PUT" value="PUT" />
                    <el-option label="DELETE" value="DELETE" />
                    <el-option label="PATCH" value="PATCH" />
                  </el-select>
                </el-form-item>
                
                <el-form-item label="接口路径">
                  <el-input v-model="selectedSection.path" placeholder="/api/example" />
                </el-form-item>
                
                <el-form-item label="接口描述">
                  <el-input
                    v-model="selectedSection.description"
                    type="textarea"
                    :rows="3"
                    placeholder="请描述接口功能和用途"
                  />
                </el-form-item>
                
                <el-form-item label="请求参数">
                  <el-table :data="selectedSection.parameters" style="width: 100%">
                    <el-table-column prop="name" label="参数名" width="150">
                      <template #default="scope">
                        <el-input v-model="scope.row.name" />
                      </template>
                    </el-table-column>
                    <el-table-column prop="type" label="类型" width="100">
                      <template #default="scope">
                        <el-select v-model="scope.row.type" placeholder="类型">
                          <el-option label="String" value="String" />
                          <el-option label="Number" value="Number" />
                          <el-option label="Boolean" value="Boolean" />
                          <el-option label="Array" value="Array" />
                          <el-option label="Object" value="Object" />
                        </el-select>
                      </template>
                    </el-table-column>
                    <el-table-column prop="required" label="必填" width="80">
                      <template #default="scope">
                        <el-checkbox v-model="scope.row.required" />
                      </template>
                    </el-table-column>
                    <el-table-column prop="location" label="位置" width="100">
                      <template #default="scope">
                        <el-select v-model="scope.row.location" placeholder="位置">
                          <el-option label="Query" value="Query" />
                          <el-option label="Body" value="Body" />
                          <el-option label="Path" value="Path" />
                          <el-option label="Header" value="Header" />
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
                        <el-button type="danger" size="small" @click="removeParameter(scope.$index)">删除</el-button>
                      </template>
                    </el-table-column>
                  </el-table>
                  
                  <div class="table-actions">
                    <el-button type="primary" @click="addParameter">添加参数</el-button>
                  </div>
                </el-form-item>
                
                <el-form-item label="响应格式">
                  <el-input
                    v-model="selectedSection.responseFormat"
                    type="textarea"
                    :rows="10"
                    placeholder="请输入响应格式示例(JSON)"
                  />
                </el-form-item>
                
                <el-form-item label="示例代码">
                  <el-tabs v-model="activeCodeTab">
                    <el-tab-pane label="JavaScript" name="javascript">
                      <el-input
                        v-model="selectedSection.exampleCode.javascript"
                        type="textarea"
                        :rows="10"
                        placeholder="// JavaScript示例代码"
                      />
                    </el-tab-pane>
                    <el-tab-pane label="Python" name="python">
                      <el-input
                        v-model="selectedSection.exampleCode.python"
                        type="textarea"
                        :rows="10"
                        placeholder="# Python示例代码"
                      />
                    </el-tab-pane>
                    <el-tab-pane label="cURL" name="curl">
                      <el-input
                        v-model="selectedSection.exampleCode.curl"
                        type="textarea"
                        :rows="10"
                        placeholder="# cURL示例代码"
                      />
                    </el-tab-pane>
                  </el-tabs>
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
              <el-button @click="testApi">测试接口</el-button>
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
    
    <!-- API测试对话框 -->
    <el-dialog v-model="testApiVisible" title="API测试" width="60%">
      <el-form :model="testForm" label-width="100px">
        <el-form-item label="请求方法">
          <el-tag>{{ selectedSection?.method || 'GET' }}</el-tag>
        </el-form-item>
        <el-form-item label="请求路径">
          <el-input v-model="testForm.url" readonly />
        </el-form-item>
        <el-form-item label="请求参数">
          <el-input
            v-model="testForm.params"
            type="textarea"
            :rows="5"
            placeholder="请输入JSON格式的请求参数"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="testApiVisible = false">取消</el-button>
          <el-button type="primary" @click="sendTestRequest">发送请求</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 测试结果对话框 -->
    <el-dialog v-model="testResultVisible" title="测试结果" width="60%">
      <div class="test-result">
        <div class="result-status">
          <span>状态码: </span>
          <el-tag :type="testResult.status >= 200 && testResult.status < 300 ? 'success' : 'danger'">
            {{ testResult.status }}
          </el-tag>
        </div>
        <div class="result-response">
          <h4>响应内容:</h4>
          <pre>{{ testResult.response }}</pre>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/request'

// API结构数据
const apiStructure = ref([])

// 选中的章节
const selectedSection = ref(null)

// 默认展开的节点
const expandedKeys = ref(['1', '2', '3', '4', '5'])

// 当前激活的代码标签页
const activeCodeTab = ref('javascript')

// 预览相关
const previewVisible = ref(false)
const previewHtml = ref('')

// API测试相关
const testApiVisible = ref(false)
const testResultVisible = ref(false)
const testForm = ref({
  url: '',
  params: ''
})
const testResult = ref({
  status: 200,
  response: ''
})

// API数据（实际项目中应该从API获取）
const apiDataMap = ref({})

// 处理节点点击事件
const handleNodeClick = async (data) => {
  // 检查是否是叶子节点（没有子节点）
  if (!data.children || data.children.length === 0) {
    try {
      // 调用API获取文档详情
      const response = await request({
        url: `/api/docs/${data.id}`,
        method: 'get'
      })
      
      if (response.success) {
        selectedSection.value = response.data
      } else {
        console.error('获取文档详情失败:', response.message)
        ElMessage.error('获取文档详情失败')
        
        // 如果API失败，创建默认空文档
        if (data.type === 'api') {
          selectedSection.value = {
            id: data.id,
            title: data.title,
            type: 'api',
            version: 'v1.0',
            updateTime: new Date().toISOString().split('T')[0],
            author: '当前用户',
            name: '',
            method: 'GET',
            path: '',
            description: '',
            parameters: [],
            responseFormat: '',
            exampleCode: {
              javascript: '',
              python: '',
              curl: ''
            }
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
    } catch (error) {
      console.error('获取文档详情失败:', error)
      ElMessage.error('获取文档详情失败')
      
      // 如果API失败，创建默认空文档
      if (data.type === 'api') {
        selectedSection.value = {
          id: data.id,
          title: data.title,
          type: 'api',
          version: 'v1.0',
          updateTime: new Date().toISOString().split('T')[0],
          author: '当前用户',
          name: '',
          method: 'GET',
          path: '',
          description: '',
          parameters: [],
          responseFormat: '',
          exampleCode: {
            javascript: '',
            python: '',
            curl: ''
          }
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
}

// 添加参数
const addParameter = () => {
  if (!selectedSection.value || !selectedSection.value.parameters) return
  
  selectedSection.value.parameters.push({
    name: '',
    type: 'String',
    required: false,
    location: 'Query',
    description: ''
  })
}

// 删除参数
const removeParameter = (index) => {
  if (!selectedSection.value || !selectedSection.value.parameters) return
  
  selectedSection.value.parameters.splice(index, 1)
}

// 保存章节
const saveSection = async () => {
  if (!selectedSection.value) return
  
  try {
    // 调用API保存文档
    const response = await request({
      url: `/api/docs/${selectedSection.value.id}`,
      method: 'put',
      data: selectedSection.value
    })
    
    if (response.success) {
      ElMessage.success('章节保存成功')
    } else {
      console.error('保存章节失败:', response.message)
      ElMessage.error('保存章节失败')
    }
  } catch (error) {
    console.error('保存章节失败:', error)
    ElMessage.error('保存章节失败')
  }
}

// 保存整个文档
const saveDocument = async () => {
  try {
    // 调用API保存整个文档
    const response = await request({
      url: '/api/docs/save-all',
      method: 'post',
      data: {
        structure: apiStructure.value,
        content: apiDataMap.value
      }
    })
    
    if (response.success) {
      ElMessage.success('文档保存成功')
    } else {
      console.error('保存文档失败:', response.message)
      ElMessage.error('保存文档失败')
    }
  } catch (error) {
    console.error('保存文档失败:', error)
    ElMessage.error('保存文档失败')
  }
}

// 导出文档
const exportDocument = async () => {
  try {
    // 调用API导出文档
    const response = await request({
      url: '/api/docs/export',
      method: 'post',
      data: {
        structure: apiStructure.value,
        content: apiDataMap.value
      },
      responseType: 'blob'
    })
    
    // 创建下载链接
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `api-docs-${new Date().toISOString().split('T')[0]}.pdf`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    
    ElMessage.success('文档导出成功')
  } catch (error) {
    console.error('导出文档失败:', error)
    ElMessage.error('导出文档失败')
  }
}

// 生成Swagger
const generateSwagger = async () => {
  try {
    // 调用API生成Swagger文档
    const response = await request({
      url: '/api/docs/swagger',
      method: 'post',
      data: {
        structure: apiStructure.value,
        content: apiDataMap.value
      }
    })
    
    if (response.success) {
      // 打开Swagger文档页面
      window.open(response.data.url, '_blank')
      ElMessage.success('Swagger文档生成成功')
    } else {
      console.error('生成Swagger文档失败:', response.message)
      ElMessage.error('生成Swagger文档失败')
    }
  } catch (error) {
    console.error('生成Swagger文档失败:', error)
    ElMessage.error('生成Swagger文档失败')
  }
}

// 测试API
const testApi = () => {
  if (!selectedSection.value || selectedSection.value.type !== 'api') {
    ElMessage.warning('请选择一个API接口进行测试')
    return
  }
  
  testForm.value = {
    url: `${selectedSection.value.method} ${selectedSection.value.path}`,
    params: JSON.stringify({
      // 根据参数生成默认测试参数
      ...Object.fromEntries(
        selectedSection.value.parameters
          .filter(p => p.location === 'Body')
          .map(p => [p.name, p.type === 'String' ? 'example' : p.type === 'Number' ? 123 : p.type === 'Boolean' ? true : {}])
      )
    }, null, 2)
  }
  
  testApiVisible.value = true
}

// 发送测试请求
const sendTestRequest = async () => {
  try {
    // 验证参数格式
    const params = JSON.parse(testForm.value.params)
    
    // 调用API发送测试请求
    const response = await request({
      url: '/api/docs/test',
      method: 'post',
      data: {
        method: selectedSection.value.method,
        path: selectedSection.value.path,
        params: params
      }
    })
    
    if (response.success) {
      testResult.value = JSON.stringify(response.data, null, 2)
      ElMessage.success('测试请求发送成功')
    } else {
      testResult.value = JSON.stringify({ error: response.message }, null, 2)
      ElMessage.error('测试请求失败')
    }
  } catch (error) {
    if (error instanceof SyntaxError) {
      ElMessage.error('参数格式错误，请检查JSON格式')
    } else {
      console.error('测试请求失败:', error)
      ElMessage.error('测试请求失败')
      testResult.value = JSON.stringify({ error: error.message }, null, 2)
    }
  }
}

// 预览内容
const previewContent = () => {
  if (!selectedSection.value) return
  
  if (selectedSection.value.type === 'api') {
    // 生成API接口的HTML预览
    let html = `<h3>${selectedSection.value.title}</h3>`
    html += `<p><strong>接口名称:</strong> ${selectedSection.value.name}</p>`
    html += `<p><strong>请求方法:</strong> <span class="method-${selectedSection.value.method}">${selectedSection.value.method}</span></p>`
    html += `<p><strong>接口路径:</strong> ${selectedSection.value.path}</p>`
    html += `<p><strong>接口描述:</strong> ${selectedSection.value.description}</p>`
    
    html += '<h4>请求参数:</h4>'
    html += '<table border="1" style="border-collapse: collapse; width: 100%;">'
    html += '<tr><th>参数名</th><th>类型</th><th>必填</th><th>位置</th><th>描述</th></tr>'
    
    selectedSection.value.parameters.forEach(param => {
      html += '<tr>'
      html += `<td>${param.name}</td>`
      html += `<td>${param.type}</td>`
      html += `<td>${param.required ? '是' : '否'}</td>`
      html += `<td>${param.location}</td>`
      html += `<td>${param.description}</td>`
      html += '</tr>'
    })
    
    html += '</table>'
    
    html += '<h4>响应格式:</h4>'
    html += `<pre>${selectedSection.value.responseFormat}</pre>`
    
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
onMounted(async () => {
  try {
    // 调用API获取API文档结构
    const response = await request({
      url: '/api/docs/structure',
      method: 'get'
    })
    
    if (response.success) {
      apiStructure.value = response.data
    } else {
      console.error('获取API文档结构失败:', response.message)
      ElMessage.error('获取API文档结构失败')
    }
  } catch (error) {
    console.error('获取API文档结构失败:', error)
    ElMessage.error('获取API文档结构失败')
  }
})
</script>

<style scoped>
.api-doc {
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

.api-editor {
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

.test-result {
  max-height: 60vh;
  overflow-y: auto;
}

.result-status {
  margin-bottom: 15px;
}

.result-response h4 {
  margin: 0 0 10px 0;
}

.result-response pre {
  background-color: #f5f7fa;
  padding: 15px;
  border-radius: 4px;
  overflow-x: auto;
}

/* 请求方法标签样式 */
:deep(.preview-content .method-GET) {
  color: #67C23A;
  font-weight: bold;
}

:deep(.preview-content .method-POST) {
  color: #409EFF;
  font-weight: bold;
}

:deep(.preview-content .method-PUT) {
  color: #E6A23C;
  font-weight: bold;
}

:deep(.preview-content .method-DELETE) {
  color: #F56C6C;
  font-weight: bold;
}

:deep(.preview-content .method-PATCH) {
  color: #909399;
  font-weight: bold;
}
</style>