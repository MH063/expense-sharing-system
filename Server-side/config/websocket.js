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
    const MAX_CONNECTIONS = Number(process.env.WS_MAX_CONNECTIONS || 1000);
    const MAX_CONNECTIONS_PER_IP = Number(process.env.WS_MAX_CONNECTIONS_PER_IP || 50);
    const HEARTBEAT_INTERVAL_MS = Number(process.env.WS_HEARTBEAT_INTERVAL_MS || 30000);
    const IDLE_TIMEOUT_MS = Number(process.env.WS_IDLE_TIMEOUT_MS || 120000);

    this.wss = new WebSocket.Server({ server });
    const ipCounts = new Map();

    const getIp = (req) => (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString().split(',')[0].trim();

    const scheduleHeartbeat = () => {
      this.wss.clients.forEach((client) => {
        if (client.isAlive === false) {
          try { client.terminate(); } catch (e) {}
          return;
        }
        client.isAlive = false;
        try { client.ping(); } catch (e) {}
      });
    };

    const heartbeatTimer = setInterval(scheduleHeartbeat, HEARTBEAT_INTERVAL_MS);
    this.wss.on('close', () => clearInterval(heartbeatTimer));

    this.wss.on('connection', (ws, req) => {
      const currentTotal = this.clients.size;
      if (currentTotal >= MAX_CONNECTIONS) {
        ws.close(1013, 'Server overloaded');
        return;
      }

      const ip = getIp(req);
      const perIp = (ipCounts.get(ip) || 0) + 1;
      if (perIp > MAX_CONNECTIONS_PER_IP) {
        ws.close(1008, 'Too many connections from this IP');
        return;
      }
      ipCounts.set(ip, perIp);

      ws.isAlive = true;
      ws.lastActivityAt = Date.now();
      ws.on('pong', () => { ws.isAlive = true; ws.lastActivityAt = Date.now(); });
      ws.on('message', () => { ws.lastActivityAt = Date.now(); });

      const clientId = this.generateClientId();
      this.clients.set(clientId, ws);

      this.logger.info(`新的WebSocket连接: ${clientId}, IP: ${ip}`);

      ws.send(JSON.stringify({ type: 'connection_ack', clientId, timestamp: new Date().toISOString() }));

      const idleTimer = setInterval(() => {
        if (Date.now() - (ws.lastActivityAt || 0) > IDLE_TIMEOUT_MS) {
          try { ws.terminate(); } catch (e) {}
          clearInterval(idleTimer);
        }
      }, Math.min(IDLE_TIMEOUT_MS, 60000));

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          this.handleMessage(clientId, data);
        } catch (error) {
          this.logger.error(`处理WebSocket消息错误: ${error.message}`);
          ws.send(JSON.stringify({ type: 'error', message: '消息格式错误' }));
        }
      });

      ws.on('close', () => {
        clearInterval(idleTimer);
        this.clients.delete(clientId);
        ipCounts.set(ip, Math.max(0, (ipCounts.get(ip) || 1) - 1));
        this.logger.info(`WebSocket连接关闭: ${clientId}`);
      });

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
      case 'auth':
        // 处理认证消息
        this.handleAuth(clientId, data.token);
        break;
      case 'heartbeat':
        // 处理心跳消息
        this.handleHeartbeat(clientId, data.timestamp);
        break;
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
  
  // 处理认证消息
  handleAuth(clientId, token) {
    const ws = this.clients.get(clientId);
    if (!ws) return;
    try {
      const { TokenManager } = require('../middleware/tokenManager');
      const decoded = TokenManager.verifyAccessToken(token);
      if (!decoded) {
        throw new Error('无效或过期的访问令牌');
      }
      ws.userId = decoded.sub;
      ws.username = decoded.username;
      ws.roles = decoded.roles || [];
      ws.authenticated = true;
      this.logger.info(`WebSocket客户端认证成功: ${clientId}, 用户: ${decoded.username}`);
      ws.send(JSON.stringify({ type: 'auth', success: true, message: '认证成功', userId: decoded.sub, username: decoded.username, timestamp: new Date().toISOString() }));
    } catch (error) {
      this.logger.error(`WebSocket认证失败 (${clientId}): ${error.message}`);
      ws.send(JSON.stringify({ type: 'auth', success: false, message: '认证失败: ' + error.message, timestamp: new Date().toISOString() }));
    }
  }
  
  // 处理心跳消息
  handleHeartbeat(clientId, timestamp) {
    const ws = this.clients.get(clientId);
    if (!ws) return;
    
    // 发送心跳响应
    ws.send(JSON.stringify({
      type: 'heartbeat_response',
      timestamp: timestamp || Date.now(),
      serverTimestamp: new Date().toISOString()
    }));
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