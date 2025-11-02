// WebSocket客户端
class WebSocketClient {
  constructor() {
    this.ws = null;
    this.url = `ws://localhost:4000`; // WebSocket服务器地址
    this.reconnectInterval = 5000; // 重连间隔（毫秒）
    this.maxReconnectAttempts = 5; // 最大重连次数
    this.reconnectAttempts = 0; // 当前重连次数
    this.listeners = new Map(); // 事件监听器
    this.isConnected = false; // 连接状态
    this.heartbeatInterval = null; // 心跳定时器
    this.heartbeatIntervalMs = 30000; // 心跳间隔（毫秒）
    this.subscribedEvents = new Set(); // 已订阅的事件列表
    this.reconnectTimer = null; // 重连定时器
    this.isManualClose = false; // 是否手动关闭连接
    this.authToken = null; // 认证令牌
    this.connectionPromise = null; // 连接Promise
    this.pendingMessages = []; // 待发送的消息队列
    this.connectionTimeout = 10000; // 连接超时时间（毫秒）
  }

  // 连接到WebSocket服务器
  connect(authToken = null) {
    // 如果已经在连接中，返回现有的Promise
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    // 重置手动关闭状态
    this.isManualClose = false;
    this.authToken = authToken;

    // 创建连接Promise
    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        // 设置连接超时
        const timeoutId = setTimeout(() => {
          this.ws = null;
          this.connectionPromise = null;
          reject(new Error('WebSocket连接超时'));
          this.handleReconnect();
        }, this.connectionTimeout);

        this.ws = new WebSocket(this.url);
        
        this.ws.onopen = (event) => {
          clearTimeout(timeoutId);
          console.log('WebSocket连接已建立');
          this.isConnected = true;
          this.reconnectAttempts = 0; // 重置重连次数
          
          // 发送认证消息
          if (this.authToken) {
            this.send({
              type: 'auth',
              token: this.authToken
            });
          }
          
          // 重新订阅之前订阅的事件
          if (this.subscribedEvents.size > 0) {
            this.subscribe([...this.subscribedEvents]);
          }
          
          // 发送待发送的消息
          this.flushPendingMessages();
          
          // 启动心跳机制
          this.startHeartbeat();
          
          this.emit('connected', event);
          this.connectionPromise = null;
          resolve();
        };
        
        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('收到WebSocket消息:', data);
            this.handleMessage(data);
          } catch (error) {
            console.error('解析WebSocket消息失败:', error);
          }
        };
        
        this.ws.onclose = (event) => {
          clearTimeout(timeoutId);
          console.log('WebSocket连接已关闭:', event);
          this.isConnected = false;
          this.stopHeartbeat(); // 停止心跳
          
          // 如果不是手动关闭且不是正常关闭，则尝试重连
          if (!this.isManualClose && !event.wasClean) {
            this.handleReconnect();
          }
          
          this.emit('disconnected', event);
        };
        
        this.ws.onerror = (error) => {
          clearTimeout(timeoutId);
          console.error('WebSocket错误:', error);
          this.emit('error', error);
          this.connectionPromise = null;
          reject(error);
        };
      } catch (error) {
        console.error('创建WebSocket连接失败:', error);
        this.emit('error', error);
        this.connectionPromise = null;
        reject(error);
        this.handleReconnect();
      }
    });

    return this.connectionPromise;
  }

  // 处理重连逻辑
  handleReconnect() {
    // 清除之前的重连定时器
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    // 如果已达到最大重连次数
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('达到最大重连次数，停止重连');
      this.emit('reconnect_failed', {
        attempts: this.reconnectAttempts,
        maxAttempts: this.maxReconnectAttempts
      });
      return;
    }
    
    // 增加重连次数
    this.reconnectAttempts++;
    
    console.log(`尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    this.emit('reconnecting', {
      attempt: this.reconnectAttempts,
      maxAttempts: this.maxReconnectAttempts
    });
    
    // 设置重连定时器
    this.reconnectTimer = setTimeout(() => {
      this.connect(this.authToken);
    }, this.reconnectInterval);
  }

  // 更新认证令牌
  updateAuthToken(token) {
    this.authToken = token;
    if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
      this.send({
        type: 'auth',
        token: this.authToken
      });
    }
  }

  // 刷新待发送的消息队列
  flushPendingMessages() {
    if (this.pendingMessages.length > 0) {
      console.log(`发送${this.pendingMessages.length}条待发送消息`);
      const messages = [...this.pendingMessages];
      this.pendingMessages = [];
      messages.forEach(message => {
        this.send(message);
      });
    }
  }

  // 启动心跳机制
  startHeartbeat() {
    this.stopHeartbeat(); // 先清除之前的心跳定时器
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
        this.send({ type: 'heartbeat', timestamp: Date.now() });
      }
    }, this.heartbeatIntervalMs);
  }

  // 停止心跳机制
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // 处理接收到的消息
  handleMessage(data) {
    const type = data.type;
    
    // 心跳响应处理
    if (type === 'heartbeat_response') {
      console.log('收到心跳响应:', data.timestamp);
      return;
    }
    
    // 认证响应处理
    if (type === 'auth') {
      console.log('收到认证响应:', data);
      if (data.success) {
        console.log('WebSocket认证成功');
        this.emit('auth_success', data);
      } else {
        console.error('WebSocket认证失败:', data.message);
        this.emit('auth_error', data);
      }
      return;
    }
    
    // 错误消息处理
    if (type === 'error') {
      console.error('服务器错误:', data.message);
      this.emit('server_error', data);
      return;
    }
    
    // 订阅确认处理
    if (type === 'subscription_confirmed') {
      console.log('订阅确认:', data.events);
      this.emit('subscription_confirmed', data);
      return;
    }
    
    // 触发对应的事件监听器
    if (this.listeners.has(type)) {
      this.listeners.get(type).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`处理${type}事件时出错:`, error);
        }
      });
    }
    
    // 触发通用消息事件
    this.emit('message', data);
  }

  // 发送消息到服务器
  send(data) {
    if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(data));
        return true;
      } catch (error) {
        console.error('发送WebSocket消息失败:', error);
        return false;
      }
    } else {
      console.warn('WebSocket未连接，消息加入队列');
      this.pendingMessages.push(data);
      return false;
    }
  }

  // 订阅事件
  subscribe(events) {
    const eventArray = Array.isArray(events) ? events : [events];
    
    // 添加到已订阅事件列表
    eventArray.forEach(event => this.subscribedEvents.add(event));
    
    this.send({
      type: 'subscribe',
      events: eventArray
    });
  }

  // 取消订阅事件
  unsubscribe(events) {
    const eventArray = Array.isArray(events) ? events : [events];
    
    // 从已订阅事件列表中移除
    eventArray.forEach(event => this.subscribedEvents.delete(event));
    
    this.send({
      type: 'unsubscribe',
      events: eventArray
    });
  }

  // 添加事件监听器
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
  }

  // 移除事件监听器
  off(event, callback) {
    if (this.listeners.has(event)) {
      if (callback) {
        this.listeners.get(event).delete(callback);
      } else {
        this.listeners.delete(event);
      }
    }
  }

  // 触发事件
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`执行${event}事件回调时出错:`, error);
        }
      });
    }
  }

  // 关闭连接
  disconnect() {
    this.isManualClose = true;
    this.stopHeartbeat(); // 停止心跳
    this.subscribedEvents.clear(); // 清空订阅列表
    this.pendingMessages = []; // 清空待发送消息
    
    // 清除重连定时器
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    // 重置重连次数
    this.reconnectAttempts = 0;
    
    // 清除连接Promise
    if (this.connectionPromise) {
      this.connectionPromise = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.isConnected = false;
    this.authToken = null;
  }

  // 获取连接状态
  getStatus() {
    return {
      isConnected: this.isConnected,
      readyState: this.ws ? this.ws.readyState : null,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      subscribedEvents: [...this.subscribedEvents]
    };
  }
}

// 创建单例实例
const websocketClient = new WebSocketClient();

// 导出WebSocket客户端
export default websocketClient;