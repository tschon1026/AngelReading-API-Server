# Gemini API Key Server

一個安全的 API Key 伺服器，用於管理和代理 Google Gemini API 請求。

## 功能特色

- 🔐 API Key 驗證和授權
- 🚦 請求速率限制
- 🌐 CORS 支援
- 📊 健康檢查端點
- 🔄 Gemini API 代理
- 🛡️ 錯誤處理和安全性

## API 端點

### 健康檢查
```
GET /health
```

### 獲取 Gemini API Key
```
GET /api/gemini-key
Headers: x-api-key: your_client_api_key
```

### Gemini API 代理
```
POST /api/gemini/generate
Headers: x-api-key: your_client_api_key
Content-Type: application/json

Body:
{
  "prompt": "你的提示文字",
  "model": "gemini-pro",
  "maxTokens": 1000,
  "temperature": 0.7
}
```

## 環境變數

複製 `.env.example` 到 `.env` 並填入以下配置：

- `PORT`: 伺服器端口 (預設: 3000)
- `GEMINI_API_KEY`: 你的 Google Gemini API Key
- `VALID_API_KEYS`: 有效的客戶端 API Keys (用逗號分隔)
- `NODE_ENV`: 環境模式 (development/production)

## 本地開發

1. 安裝依賴：
```bash
npm install
```

2. 配置環境變數：
```bash
cp .env.example .env
# 編輯 .env 文件填入你的配置
```

3. 啟動開發伺服器：
```bash
npm run dev
```

4. 啟動生產伺服器：
```bash
npm start
```

## 部署到 Render

1. 推送代碼到 GitHub
2. 在 Render 創建新的 Web Service
3. 連接你的 GitHub 倉庫
4. 配置環境變數
5. 部署

## 使用範例

```javascript
// 獲取 API Key
const response = await fetch('https://your-server.com/api/gemini-key', {
  headers: {
    'x-api-key': 'your_client_api_key'
  }
});

// 使用代理端點
const generateResponse = await fetch('https://your-server.com/api/gemini/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'your_client_api_key'
  },
  body: JSON.stringify({
    prompt: '請介紹一下人工智慧',
    model: 'gemini-pro'
  })
});
```

## 安全性注意事項

- 永遠不要在客戶端代碼中暴露 Gemini API Key
- 使用強密碼作為客戶端 API Key
- 定期輪換 API Keys
- 監控 API 使用情況

## 授權

MIT License
