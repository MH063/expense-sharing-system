const WebSocket = require('ws');
const winston = require('winston');

// WebSocket连接管理器
class WebSocketManager {
  constructor() {
    this.wss = null;
    this.clients = new Map(); // 存储连接的客户端
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/websocket.log' })
      ]
    });
  }

  // 初始化WebSocket服务器
  init(server) {
    this.wss = new WebSocket.Server({ server });
    
    this.wss.on('connection', (ws, req) => {
      const clientId = this.generateClientId();
      this.clients.set(clientId, ws);
      
      this.logger.info(`新的WebSocket连接: ${clientId}, IP: ${req.socket.remoteAddress}`);
      
      // 发送连接确认消息
      ws.send(JSON.stringify({
        type: 'connection_ack',
        clientId: clientId,
        timestamp: new Date().toISOString()
      }));
      
      // 监听客户端消息
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          this.handleMessage(clientId, data);
        } catch (error) {
          this.logger.error(`处理WebSocket消息错误: ${error.message}`);
          ws.send(JSON.stringify({
            type: 'error',
            message: '消息格式错误'
          }));
        }
      });
      
      // 监听连接关闭
      ws.on('close', () => {
        this.clients.delete(clientId);
        this.logger.info(`WebSocket连接关闭: ${clientId}`);
      });
      
      // 监听错误
      ws.on('error', (error) => {
        this.logger.error(`WebSocket错误 (${clientId}): ${error.message}`);
      });
    });
    
    this.logger.info('WebSocket服务器初始化完成');
  }
  
  // 处理客户端消息
  handleMessage(clientId, data) {
    const ws = this.clients.get(clientId);
    if (!ws) return;
    
    switch (data.type) {
      case 'subscribe':
        // 订阅特定事件
        this.subscribeToEvents(clientId, data.events);
        break;
      case 'unsubscribe':
        // 取消订阅特定事件
        this.unsubscribeFromEvents(clientId, data.events);
        break;
      default:
        this.logger.warn(`未知的WebSocket消息类型: ${data.type}`);
        ws.send(JSON.stringify({
          type: 'error',
          message: `未知的消息类型: ${data.type}`
        }));
    }
  }
  
  // 订阅事件
  subscribeToEvents(clientId, events) {
    const client = this.clients.get(clientId);
    if (!client) return;
    
    // 这里可以实现具体的订阅逻辑
    // 例如：将客户端ID和订阅的事件类型存储在某个数据结构中
    if (!client.subscriptions) {
      client.subscriptions = new Set();
    }
    
    events.forEach(event => client.subscriptions.add(event));
    
    client.send(JSON.stringify({
      type: 'subscription_ack',
      events: events,
      timestamp: new Date().toISOString()
    }));
  }
  
  // 取消订阅事件
  unsubscribeFromEvents(clientId, events) {
    const client = this.clients.get(clientId);
    if (!client || !client.subscriptions) return;
    
    events.forEach(event => client.subscriptions.delete(event));
    
    client.send(JSON.stringify({
      type: 'unsubscription_ack',
      events: events,
      timestamp: new Date().toISOString()
    }));
  }
  
  // 向特定客户端发送消息
  sendToClient(clientId, message) {
    const client = this.clients.get(clientId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  }
  
  // 向所有客户端广播消息
  broadcast(message) {
    this.clients.forEach((client, clientId) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }
  
  // 向订阅了特定事件的客户端发送消息
  sendToSubscribers(event, message) {
    this.clients.forEach((client, clientId) => {
      if (client.readyState === WebSocket.OPEN && 
          client.subscriptions && 
          client.subscriptions.has(event)) {
        client.send(JSON.stringify(message));
      }
    });
  }
  
  // 生成客户端ID
  generateClientId() {
    return 'client_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
  
  // 获取连接数统计
  getStats() {
    return {
      totalConnections: this.clients.size,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = new WebSocketManager();