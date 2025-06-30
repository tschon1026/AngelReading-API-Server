// ... existing code ...
app.use(cors());
app.use(express.json());

// 中間件 1: 驗證 App 是否有權限跟後端伺服器溝通
const authenticateServerKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey && apiKey === process.env.SERVER_API_KEY) {
    next();
  } else {
    console.log('DEBUG: Failed authenticateServerKey check.');
    console.log('Received Key:', apiKey);
    console.log('Expected Key:', process.env.SERVER_API_KEY);
    res.status(401).json({ error: '未授權 - 無效的伺服器金鑰 (Server Key)' });
  }
};

// 中間件 2: 驗證從 App 端傳來的 Gemini 金鑰是否有效 (雖然有點多餘，但作為安全檢查)
const authenticateGeminiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    // 這裡我們只是檢查金鑰是否存在，因為金鑰是動態從前端傳來的
    if (apiKey) {
      next();
    } else {
      console.log('DEBUG: Failed authenticateGeminiKey check. No key provided.');
      res.status(401).json({ error: '未授權 - 未提供 Gemini API Key' });
    }
  };

// 健康檢查端點
app.get('/health', (req, res) => {
  res.status(200).json({
// ... existing code ...
  });
});

// Gemini API Key 提供端點 - 只需驗證伺服器金鑰
app.get('/api/gemini-key', authenticateServerKey, (req, res) => {
  res.json({ apiKey: process.env.GEMINI_API_KEY });
});

// 測驗生成引擎端點 - 這裡應該用 Gemini 金鑰來驗證
app.post('/api/generate-exam', authenticateGeminiKey, async (req, res) => {
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    
    // 從 header 獲取 Gemini key 來初始化
    const geminiApiKeyFromRequest = req.headers['x-api-key'];
    const genAI = new GoogleGenerativeAI(geminiApiKeyFromRequest);
    
    // 1. Get request body
    const { examType = 'TOEIC', difficulty = 'medium' } = req.body;
// ... existing code ...
