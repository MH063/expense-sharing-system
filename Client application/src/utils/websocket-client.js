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
  }

  // 连接到WebSocket服务器
  connect() {
    try {
      this.ws = new WebSocket(this.url);
      
      this.ws.onopen = (event) => {
        console.log('WebSocket连接已建立');
        this.isConnected = true;
        this.reconnectAttempts = 0; // 重置重连次数
        this.emit('connected', event);
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
        console.log('WebSocket连接已关闭:', event);
        this.isConnected = false;
        this.emit('disconnected', event);
        
        // 尝试重连
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          setTimeout(() => {
            this.reconnectAttempts++;
            console.log(`尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            this.connect();
          }, this.reconnectInterval);
        } else {
          console.log('达到最大重连次数，停止重连');
          this.emit('reconnect_failed');
        }
      };
      
      this.ws.onerror = (error) => {
        console.error('WebSocket错误:', error);
        this.emit('error', error);
      };
    } catch (error) {
      console.error('创建WebSocket连接失败:', error);
      this.emit('error', error);
    }
  }

  // 处理接收到的消息
  handleMessage(data) {
    const type = data.type;
    
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
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket未连接，无法发送消息');
    }
  }

  // 订阅事件
  subscribe(events) {
    this.send({
      type: 'subscribe',
      events: Array.isArray(events) ? events : [events]
    });
  }

  // 取消订阅事件
  unsubscribe(events) {
    this.send({
      type: 'unsubscribe',
      events: Array.isArray(events) ? events : [events]
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
    if (this.ws) {
      this.ws.close();
    }
  }

  // 获取连接状态
  getStatus() {
    return {
      isConnected: this.isConnected,
      readyState: this.ws ? this.ws.readyState : null,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

// 创建单例实例
const websocketClient = new WebSocketClient();

// 导出WebSocket客户端
export default websocketClient;