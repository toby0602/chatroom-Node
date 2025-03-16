require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const mongoose = require('mongoose');
const path = require('path');

// 創建 Express 應用程式
const app = express();
const server = http.createServer(app);

const wss = new WebSocket.Server({ server });

// 設置靜態文件目錄
app.use('/assets', express.static(path.join(__dirname, 'template/assets')));

// 記錄請求 URL
app.use((req, res, next) => {
    console.log(`Request URL: ${req.url}`);
    next();
});

// 連接到 MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 50000,
})
  .then(() => console.log('MongoDB 連接成功'))
  .catch((err) => console.error('MongoDB 連接失敗：', err));

// 定義聊天訊息模型
const messageSchema = new mongoose.Schema({
  event: String,
  name: String,
  photo: String,
  content: String,
  timestamp: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', messageSchema);

// 用於儲存連接的映射
const clients = new Map();

function broadcast(message) {
  clients.forEach((_, ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });
}

// 保留最新 100 則消息的函數
async function keepLatestMessages() {
    const count = await Message.countDocuments();
    if (count > 100) {
        const messagesToRemove = await Message.find().sort({ timestamp: 1 }).limit(count - 100);
        const idsToRemove = messagesToRemove.map(msg => msg._id);
        await Message.deleteMany({ _id: { $in: idsToRemove } });
    }
}

const allowedOrigins = ['http://localhost:5000', 'https://chatroom-node.onrender.com'];

// WebSocket 處理函數
wss.on('connection', (ws, req) => {
  const origin = req.headers.origin;
  if (!allowedOrigins.includes(origin)) {
    ws.terminate(); // 終止未授權的連線
    console.log(`拒絕來自 ${origin} 的 WebSocket 連線`);
    return;
  }

  const id = new URL(req.url, `http://${req.headers.host}`).searchParams.get('id');
  clients.set(ws, id);

  // 發送歷史消息給新連接
  Message.find().sort({ timestamp: 1 }).then(messages => {
    messages.forEach(msg => ws.send(JSON.stringify(msg)));
  }).catch(err => console.error('Error fetching messages:', err));

  // 通知其他用戶新用戶加入
  const joinMessage = JSON.stringify({ event: 'other', name: id, content: '加入聊天室' });
  broadcast(joinMessage);

  // 當 WebSocket 收到訊息時觸發
  ws.on('message', (data) => {
    const message = JSON.parse(data);
    
    // 儲存新消息到 MongoDB
    const newMessage = new Message(message);
    newMessage.save()
      .then(() => {
        broadcast(data);
        keepLatestMessages(); // 保持最新 100 則消息
      })
      .catch(err => console.error('Error saving message:', err));
  });

  ws.on('close', () => {
    clients.delete(ws);
    const leaveMessage = JSON.stringify({ event: 'other', name: id, content: '離開聊天室' });
    broadcast(leaveMessage);
  });
});

// 設置首頁路由
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'template/html/index.html'));
});

const PORT = process.env.PORT || 5000;
// 運行伺服器
server.listen(PORT, () => {
  console.log(`伺服器運行於 http://localhost:${PORT}`);
});
