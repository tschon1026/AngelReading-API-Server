const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
// For Railway, it's best to use process.env.PORT, but we'll set 8080 as a fallback.
const PORT = process.env.PORT || 8080;

// --- START DEBUG LOGGING ---
console.log(`[DEBUG] SERVER_API_KEY on startup: ${process.env.SERVER_API_KEY}`);
console.log(`[DEBUG] GEMINI_API_KEY on startup: ${process.env.GEMINI_API_KEY ? 'Loaded' : 'NOT LOADED'}`);

// 中間件
app.use(cors());
app.use(express.json());

// Logger Middleware to see all incoming requests
app.use((req, res, next) => {
  console.log(`[INCOMING REQUEST] Method: ${req.method}, URL: ${req.originalUrl}`);
  next();
});
// --- END DEBUG LOGGING ---

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

// 中間件 2: 驗證從 App 端傳來的 Gemini 金鑰是否有效
const authenticateGeminiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
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
    status: 'ok', 
    message: 'AngelReading API Server is running on Railway.',
    timestamp: new Date().toISOString()
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
    const { examType = 'TOEIC', difficulty = 'medium', timestamp, randomSeed, requestId } = req.body;

    if (!examType || !difficulty) {
        return res.status(400).json({ 
            error: 'Missing parameters',
            message: 'Please provide examType and difficulty.' 
        });
    }

    console.log(`[EXAM GENERATION] New request - ID: ${requestId}, Seed: ${randomSeed}, Timestamp: ${timestamp}`);

    // 2. 生成主題變化的種子，確保每次都有不同的文章主題
    const topicVariations = [
        "technology and innovation", "environmental conservation", "cultural traditions", 
        "scientific discoveries", "historical events", "social media impact", 
        "education systems", "healthcare advancements", "business trends", 
        "travel and tourism", "food and nutrition", "art and creativity",
        "sports and fitness", "urban development", "climate change",
        "artificial intelligence", "space exploration", "renewable energy",
        "psychology and behavior", "economic development"
    ];
    
    const selectedTopic = topicVariations[randomSeed % topicVariations.length];

    // 2. 動態生成特定考試類型的說明
    let examSpecificInstructions = '';
    switch (examType) {
        case '國中會考':
            examSpecificInstructions = `
**Exam-Specific Rules for 國中會考:**
- **CEFR Level:** A2
- **Passage Length:** Approximately 150-300 words.
- **Paragraphs:** 1-2 paragraphs.
- **Question Guidelines:** Focus on understanding the main idea, specific details, contextual inference, and sentence meaning.
- **Skills Tested:** Basic reading comprehension and contextual interpretation.
`;
            break;
        case '大學學測':
            examSpecificInstructions = `
**Exam-Specific Rules for 大學學測:**
- **CEFR Level:** B1-B2
- **Passage Length:** Approximately 250-500 words.
- **Paragraphs:** 2-4 paragraphs.
- **Question Guidelines:** Test main idea, details, inference, word meaning in context, and understanding of passage structure.
- **Skills Tested:** Intermediate to advanced reading ability, discourse comprehension, and logical reasoning.
`;
            break;
        case 'TOEIC':
            examSpecificInstructions = `
**Exam-Specific Rules for TOEIC:**
- **CEFR Level:** A1-B2
- **Passage Length:** Approximately 100-300 words.
- **Paragraphs:** 1-3 paragraphs.
- **Question Guidelines:** Focus on detail comprehension, information synthesis, and integrating text with potential graphics (though you will only generate text).
- **Skills Tested:** Workplace English application and information retrieval skills.
- **Content Style:** The passage MUST simulate a real-world business or daily-life document like an email, memo, announcement, or advertisement.
`;
            break;
        case 'TOEFL':
            examSpecificInstructions = `
**Exam-Specific Rules for TOEFL:**
- **CEFR Level:** B2-C1
- **Passage Length:** Approximately 600-700 words.
- **Paragraphs:** 5-7 paragraphs.
- **Question Guidelines:** Include questions on main idea, details, inference, sentence insertion, and information synthesis.
- **Skills Tested:** Academic article comprehension, summarizing, and synthesizing information.
`;
            break;
        case 'IELTS':
            examSpecificInstructions = `
**Exam-Specific Rules for IELTS:**
- **CEFR Level:** B1-C2
- **Passage Length:** Approximately 700-900 words (to simulate one of the three long passages).
- **Paragraphs:** 5-8 paragraphs.
- **Question Guidelines:** Create a mix of question types like paragraph matching, fill-in-the-blanks, multiple choice, and True/False/Not Given.
- **Skills Tested:** Ability to handle diverse question formats and critical reading.
`;
            break;
        case 'GEPT':
            examSpecificInstructions = `
**Exam-Specific Rules for GEPT:**
- **CEFR Level:** A2-C1 (adapt difficulty based on the provided level, default to B1 if unspecified).
- **Passage Length:** Approximately 200-600 words.
- **Paragraphs:** 1-5 paragraphs.
- **Question Guidelines:** Test word meaning, main idea, details, and inference.
- **Skills Tested:** Practical and functional English reading ability.
`;
            break;
        case 'SAT':
            examSpecificInstructions = `
**Exam-Specific Rules for SAT:**
- **CEFR Level:** B2-C1
- **Passage Length:** Approximately 500-750 words.
- **Paragraphs:** 4-6 paragraphs.
- **Question Guidelines:** Emphasize evidence-based answers, word in context, analysis of arguments, and interpretation of (hypothetical) charts/data.
- **Skills Tested:** Academic and critical reading, and argument analysis.
`;
            break;
        case 'GRE':
            examSpecificInstructions = `
**Exam-Specific Rules for GRE:**
- **CEFR Level:** C1-C2
- **Passage Length:** Approximately 200-500 words.
- **Paragraphs:** 2-5 paragraphs.
- **Question Guidelines:** Focus on high-level inference, sentence meaning, logical structure, and analysis of the author's claims.
- **Skills Tested:** Advanced logical reasoning and comprehension of abstract concepts.
`;
            break;
        case 'GMAT':
            examSpecificInstructions = `
**Exam-Specific Rules for GMAT:**
- **CEFR Level:** C1-C2
- **Passage Length:** Approximately 250-400 words.
- **Paragraphs:** 2-4 paragraphs.
- **Question Guidelines:** Test understanding of main idea, inference, evaluation of arguments, and identification of logical fallacies.
- **Skills Tested:** Business and academic reading comprehension, and logical judgment.
`;
            break;
        default:
            examSpecificInstructions = `
- **Passage Length:** Approximately 200-300 words.
- **Question Guidelines:** General reading comprehension questions.
`;
            break;
    }

    const dateVariation = new Date(timestamp * 1000).toISOString().slice(0, 10);

    // 2. Prompt Engineering: Create a detailed, structured prompt for the AI
    const prompt = `
You are an expert English test creator for various exams like ${examType}. Your tone should be academic, objective, and suitable for a standardized test.
Your task is to generate a completely UNIQUE and ORIGINAL reading comprehension test based on these parameters:
- Exam Type: ${examType}
- Difficulty Level: ${difficulty}
- Topic Focus: ${selectedTopic}
- Request ID: ${requestId}
- Generation Date: ${dateVariation}

${examSpecificInstructions}

**Critically Important Passage Writing Rules:**
1.  **NO CLICHÉ OPENINGS:** You are strictly forbidden from starting the passage with common, overused phrases such as "Do you know...", "Have you ever wondered...", "Imagine...", "In a world...", "Picture this...", or any similar cliché. The opening must be direct, academic, and engaging.
2.  **DIVERSE OPENING STYLES:** Start the passage using one of these specific, academic techniques:
    *   A surprising statistic or a compelling piece of data.
    *   A direct, declarative statement that authoritatively introduces the topic's core thesis.
    *   A relevant historical context that sets the stage for the main subject.
    *   An impactful, and attributed, quote from a known expert in the field (if relevant).
    *   Present a common misconception and then state that the passage will clarify it.
3.  **ORIGINALITY IS KEY:** This must be a COMPLETELY NEW and ORIGINAL passage. Do not reuse any content from previous generations. Focus specifically on the topic: "${selectedTopic}" and make it relevant to ${examType} exam standards.

Please generate the reading passage following the rules above.
Each paragraph MUST start with two spaces for indentation.
Paragraphs MUST be separated by a single blank line.

After the passage, create exactly 5 multiple-choice questions related to the passage.
Each question must have 4 options.

For each question, you MUST provide a detailed analysis in **繁體中文 (Traditional Chinese)** for EVERY option, explaining why it is correct or incorrect.

**Also, for each question, you MUST include an 'evidenceText' field. The value of this field must be the EXACT sentence or phrase from the passage that contains the answer to the question.**

The entire response MUST be a single, minified, valid JSON object.
Do not include any markdown fences like \`\`\`json or any other explanatory text.
The JSON object must strictly follow this structure:
{
  "passage": "The full reading passage text here.",
  "questions": [
    { 
      "id": 1, 
      "questionText": "Question 1...", 
      "options": ["A", "B", "C", "D"], 
      "correctAnswer": "A",
      "evidenceText": "The exact sentence from the passage that proves A is the correct answer.",
      "optionAnalyses": {
        "A": "對選項A的繁體中文詳細分析，說明為何正確。",
        "B": "對選項B的繁體中文詳細分析，說明為何錯誤。",
        "C": "對選項C的繁體中文詳細分析，說明為何錯誤。",
        "D": "對選項D的繁體中文詳細分析，說明為何錯誤。"
      }
    },
    { "id": 2, "questionText": "Question 2...", "options": ["A", "B", "C", "D"], "correctAnswer": "B", "evidenceText": "The relevant phrase from the passage.", "optionAnalyses": {"A": "分析...", "B": "分析...", "C": "分析...", "D": "分析..."} },
    { "id": 3, "questionText": "Question 3...", "options": ["A", "B", "C", "D"], "correctAnswer": "C", "evidenceText": "The relevant phrase from the passage.", "optionAnalyses": {"A": "分析...", "B": "分析...", "C": "分析...", "D": "分析..."} },
    { "id": 4, "questionText": "Question 4...", "options": ["A", "B", "C", "D"], "correctAnswer": "D", "evidenceText": "The relevant phrase from the passage.", "optionAnalyses": {"A": "分析...", "B": "分析...", "C": "分析...", "D": "分析..."} },
    { "id": 5, "questionText": "Question 5...", "options": ["A", "B", "C", "D"], "correctAnswer": "A", "evidenceText": "The relevant phrase from the passage.", "optionAnalyses": {"A": "分析...", "B": "分析...", "C": "分析...", "D": "分析..."} }
  ]
}

Remember: Each generation must be completely unique. Use the topic "${selectedTopic}" creatively and follow all exam-specific rules and opening style rules strictly to ensure originality and quality.
`;
    
    // 3. Call Gemini API - using the user-specified model
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' }); 
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    // 4. Parse and respond
    // Clean potential markdown fences just in case the AI doesn't follow instructions perfectly
    text = text.replace(/^```json\n/, '').replace(/\n```$/, '');

    try {
        const jsonResponse = JSON.parse(text);
        console.log(`[EXAM GENERATION] Successfully generated unique exam for topic: ${selectedTopic}`);
        // Send the parsed JSON directly to the iOS app
        res.json(jsonResponse); 
    } catch (parseError) {
        console.error('JSON parsing error:', parseError);
        console.error('Raw text from Gemini:', text);
        return res.status(500).json({ 
            error: 'Failed to parse response from AI',
            message: 'The AI did not return valid JSON.',
            rawResponse: text // Sending raw response for debugging can be helpful
        });
    }

  } catch (error) {
    console.error('Gemini API Error:', error);
    res.status(500).json({ 
      error: 'Failed to generate content',
      message: error.message 
    });
  }
});


// 錯誤處理中間件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('伺服器發生錯誤');
});

// 404 Not Found 處理
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: '找不到請求的資源',
    availableEndpoints: [
      'GET /health',
      'GET /api/gemini-key',
      'POST /api/generate-exam'
    ]
  });
});

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`伺服器正在監聽 port ${PORT}`);
}); 
