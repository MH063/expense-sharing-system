const fs = require('fs');
const path = require('path');

// 读取API文档
const apiDocPath = path.join(__dirname, 'Admin panel/docs/API接口设计文档.md');
const apiDocContent = fs.readFileSync(apiDocPath, 'utf8');

// 解析API文档表格
function parseApiDoc(content) {
  const lines = content.split('\n');
  const sections = [];
  let currentSection = null;
  let currentTable = [];
  let inTable = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // 检测章节标题
    if (line.startsWith('## ') && !line.includes('管理端专用接口')) {
      if (currentSection) {
        sections.push({
          name: currentSection,
          apis: currentTable
        });
      }
      currentSection = line.replace('## ', '');
      currentTable = [];
      inTable = false;
    }
    
    // 检测表格开始
    if (line.includes('接口名称') && line.includes('HTTP方法')) {
      inTable = true;
      continue;
    }
    
    // 跳过表格分隔线
    if (inTable && line.startsWith('|---')) {
      continue;
    }
    
    // 解析表格行
    if (inTable && line.startsWith('|')) {
      const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell);
      if (cells.length >= 4) {
        currentTable.push({
          name: cells[0],
          method: cells[1],
          path: cells[2],
          table: cells[3],
          description: cells[4] || ''
        });
      }
    }
  }
  
  // 添加最后一个章节
  if (currentSection) {
    sections.push({
      name: currentSection,
      apis: currentTable
    });
  }
  
  return sections;
}

// 生成OpenAPI文档
function generateOpenAPI(sections) {
  const openapi = {
    openapi: '3.0.0',
    info: {
      title: '记账系统API',
      version: '1.0.0',
      description: '寝室费用分摊记账系统API接口文档'
    },
    servers: [
      {
        url: 'http://localhost:4000',
        description: '开发环境'
      }
    ],
    tags: [],
    paths: {},
    components: {
      schemas: {
        StandardResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: '请求是否成功'
            },
            data: {
              type: 'object',
              description: '响应数据'
            },
            message: {
              type: 'string',
              description: '响应消息'
            }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              description: '错误信息'
            },
            error: {
              type: 'object',
              description: '详细错误信息'
            }
          }
        }
      }
    }
  };
  
  // 添加标签
  sections.forEach(section => {
    openapi.tags.push({
      name: section.name,
      description: section.name
    });
  });
  
  // 添加路径
  sections.forEach(section => {
    section.apis.forEach(api => {
      if (!openapi.paths[api.path]) {
        openapi.paths[api.path] = {};
      }
      
      const method = api.method.toLowerCase();
      openapi.paths[api.path][method] = {
        summary: api.name,
        description: api.description,
        tags: [section.name],
        responses: {
          '200': {
            description: '请求成功',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/StandardResponse'
                }
              }
            }
          },
          '400': {
            description: '请求参数错误',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          },
          '401': {
            description: '未授权',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          },
          '500': {
            description: '服务器内部错误',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          }
        }
      };
      
      // 添加认证（如果需要）
      if (api.path !== '/api/auth/login' && 
          api.path !== '/api/auth/register' && 
          api.path !== '/api/auth/forgot-password' && 
          api.path !== '/api/auth/reset-password') {
        openapi.paths[api.path][method].security = [{
          bearerAuth: []
        }];
      }
    });
  });
  
  // 添加认证方案
  openapi.components.securitySchemes = {
    bearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT'
    }
  };
  
  return openapi;
}

// 主函数
function main() {
  try {
    console.log('开始解析API文档...');
    const sections = parseApiDoc(apiDocContent);
    console.log(`解析完成，共${sections.length}个章节`);
    
    console.log('生成OpenAPI文档...');
    const openapiDoc = generateOpenAPI(sections);
    
    // 保存OpenAPI文档
    const outputPath = path.join(__dirname, 'openapi.json');
    fs.writeFileSync(outputPath, JSON.stringify(openapiDoc, null, 2));
    console.log(`OpenAPI文档已保存到: ${outputPath}`);
    
    // 同时保存YAML格式
    const yaml = require('js-yaml');
    const yamlPath = path.join(__dirname, 'openapi.yaml');
    fs.writeFileSync(yamlPath, yaml.dump(openapiDoc));
    console.log(`OpenAPI YAML文档已保存到: ${yamlPath}`);
    
  } catch (error) {
    console.error('转换失败:', error);
  }
}

// 检查是否安装了js-yaml
try {
  require('js-yaml');
  main();
} catch (error) {
  console.log('正在安装js-yaml依赖...');
  const { execSync } = require('child_process');
  execSync('npm install js-yaml', { stdio: 'inherit' });
  main();
}