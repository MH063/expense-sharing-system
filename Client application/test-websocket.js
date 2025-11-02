import WebSocket from 'ws';

// 创建WebSocket连接
const ws = new WebSocket('ws://localhost:4000');

ws.on('open', function open() {
  console.log('WebSocket连接已建立');
  
  // 发送认证消息
  const authMessage = {
    type: 'auth',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4NDAyMzZjNy0xZWY3LTQxYzUtOGM3Yi0xOWIzZTllMjZlM2IiLCJ1c2VybmFtZSI6InRlc3R1c2VyMiIsInJvbGVzIjpbInVzZXIiXSwicGVybWlzc2lvbnMiOlsicmVhZCIsIndyaXRlIl0sImlhdCI6MTc2MjA4MjI5NiwiZXhwIjoxNzYyMDg1ODk2fQ.OjiTty3B5PuKoXx8t_sYbnMTDgLQB9LxvBHsD7w0h7s'
  };
  
  ws.send(JSON.stringify(authMessage));
  console.log('已发送认证消息');
});

ws.on('message', function message(data) {
  console.log('收到消息:', data.toString());
});

ws.on('error', function error(err) {
  console.error('WebSocket错误:', err);
});

ws.on('close', function close() {
  console.log('WebSocket连接已关闭');
});

// 5秒后关闭连接
setTimeout(() => {
  ws.close();
}, 5000);