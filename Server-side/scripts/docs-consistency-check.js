const fs = require('fs');
const path = require('path');

function extractApiRoutesFromServer() {
  const serverPath = path.resolve(__dirname, '..', 'server.js');
  const content = fs.readFileSync(serverPath, 'utf-8');
  const routeRegex = /app\.use\('\/api\/(.*?)',\s*([\w-]+)\)/g;
  const routes = [];
  let match;
  while ((match = routeRegex.exec(content)) !== null) {
    routes.push(`/api/${match[1]}`);
  }
  return routes.sort();
}

function extractApiRoutesFromDocs() {
  const docPath = path.resolve(__dirname, '..', '..', '接口开发计划.md');
  const content = fs.readFileSync(docPath, 'utf-8');
  const routeRegex = /`\/api\/[a-zA-Z0-9_/:-]+`/g;
  const routes = new Set();
  let match;
  while ((match = routeRegex.exec(content)) !== null) {
    routes.add(match[0].slice(1, -1)); // 去掉反引号
  }
  return Array.from(routes).sort();
}

function main() {
  const serverRoutes = extractApiRoutesFromServer();
  const docRoutes = extractApiRoutesFromDocs();
  const missingInDocs = serverRoutes.filter(r => !docRoutes.includes(r));
  const missingInServer = docRoutes.filter(r => !serverRoutes.includes(r));
  const result = {
    success: missingInDocs.length === 0 && missingInServer.length === 0,
    serverRoutes,
    docRoutes,
    missingInDocs,
    missingInServer
  };
  console.log(JSON.stringify(result, null, 2));
  if (!result.success) {
    console.error('文档与服务器路由不一致:\n缺少文档记录:', missingInDocs, '\n文档中未挂载的路由:', missingInServer);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
