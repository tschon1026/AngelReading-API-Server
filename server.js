const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 中間件設置
app.use(cors());
app.use(express.json());

// 速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分鐘
  max: 100, // 每15分鐘最多100次請求
  message: {
    error: '請求過於頻繁，請稍後再試'
  }
});

app.use('/api/', limiter);

// API Key 驗證中間件
const authenticateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({ 
      error: '需要提供 API Key',
      message: '請在請求標頭中包含 x-api-key' 
    });
  }
  
  // 這裡可以實現更複雜的 API Key 驗證邏輯
  const validApiKeys = process.env.VALID_API_KEYS ? 
    process.env.VALID_API_KEYS.split(',') : ['default-key'];
  
  if (!validApiKeys.includes(apiKey)) {
    return res.status(401).json({ 
      error: '無效的 API Key' 
    });
  }
  
  next();
};

// 健康檢查端點
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Gemini API Key Server'
  });
});

// 獲取 Gemini API Key
app.get('/api/gemini-key', authenticateApiKey, (req, res) => {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  
  if (!geminiApiKey) {
    return res.status(500).json({ 
      error: '伺服器配置錯誤',
      message: 'Gemini API Key 未設置' 
    });
  }
  
  res.json({ 
    apiKey: geminiApiKey,
    provider: 'Google Gemini',
    timestamp: new Date().toISOString()
  });
});

// Gemini API 代理端點
app.post('/api/gemini/generate', authenticateApiKey, async (req, res) => {
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    const { 
      model = 'gemini-pro', 
      prompt, 
      maxTokens = 1000,
      temperature = 0.7 
    } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ 
        error: '缺少必要參數',
        message: '請提供 prompt 參數' 
      });
    }
    
    const geminiModel = genAI.getGenerativeModel({ model });
    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    res.json({
      success: true,
      response: text,
      model: model,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Gemini API 錯誤:', error);
    res.status(500).json({ 
      error: '生成內容失敗',
      message: error.message 
    });
  }
});

// 錯誤處理中間件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: '伺服器內部錯誤',
    message: '請稍後再試' 
  });
});

// 404 處理
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: '找不到請求的資源',
    availableEndpoints: [
      'GET /health',
      'GET /api/gemini-key',
      'POST /api/gemini/generate'
    ]
  });
});

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`伺服器運行在端口 ${PORT}`);
  console.log(`健康檢查: http://localhost:${PORT}/health`);
});
