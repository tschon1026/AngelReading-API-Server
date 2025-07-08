const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { v4: uuidv4 } = require('uuid');

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
**Exam-Specific Rules for Taiwan Junior High School Comprehensive Assessment Test (會考):**
Please design an English reading test for Taiwan Junior High School Comprehensive Assessment Test (會考) level, suitable for 9th-grade students (approximately CEFR A2+ to low B1). The test should align with Taiwan's 108 Curriculum Guidelines and include the following:

1. **Reading Passage:**
   - Write a reading passage (150-200 words) on a topic familiar to Taiwanese junior high students, 例如：學校生活（課堂、社團、考試）,家庭與朋友（家人介紹、朋友聚會）,休閒活動（運動、電影、音樂）,節日與文化（台灣節日如中秋節、春節，或國際節日如聖誕節）,旅行與交通（國內外旅遊、問路）,健康與飲食（運動、飲食習慣）,環境保護（回收、節能）,確保內容文化中立或融入台灣文化元素（如台灣美食、節日），但避免過於複雜的文化背景知識。內容應具吸引力，可加入簡單的敘事或情境（如學生的一天、旅遊經歷）。
   - Use vocabulary limited to Taiwan's junior high school word list (approximately 2000-2500 words, high-frequency words similar to CEFR A2-B1, e.g., Oxford 3000 or Taiwan's Ministry of Education word list).
   - Include grammar structures common in junior high, such as present simple, past simple, present continuous, future (will/going to), present perfect, basic conjunctions (and, but, because), comparative/superlative adjectives, modal verbs (can, should, must), simple passive voice, and first conditional.
   - Use simple and compound sentences (5-20 words per sentence) with affirmative, negative, interrogative, and imperative sentences.
   - Incorporate common phrases (e.g., "get up," "how much," "take a bus," "study hard," "have a good time").
   - Ensure the content is engaging, possibly with a simple narrative or scenario, and culturally relevant (e.g., mention Taiwanese festivals or school activities).

2. **Questions:**
   - Create 5 questions to test comprehension, vocabulary, and grammar, following Taiwan's 会考 format:
     - 2 multiple-choice questions (4 options each) for main idea or detail recall.
     - 1 true/false question for comprehension.
     - 1 vocabulary question (guess meaning from context or choose the correct word).
     - 1 grammar question.
   - Ensure questions progress from easy (direct recall) to slightly challenging (simple inference or vocabulary guessing).
   - Provide correct answers and brief explanations for each question.

3. **Additional Requirements:**
   - Include a short vocabulary list of 5-8 key words used in the passage.
   - Ensure the content is culturally neutral or includes Taiwanese elements (e.g., Mid-Autumn Festival, Taiwanese food) but remains accessible to all students.
   - Avoid complex vocabulary, advanced grammar (e.g., second/third conditional), or culturally specific knowledge not taught in junior high.
   - Format the output clearly, with the passage, vocabulary list, questions, answers, and explanations labeled separately.
`;
            break;
        case '大學學測':
            examSpecificInstructions = `
**Exam-Specific Rules for Taiwan's General Scholastic Ability Test (學測):**
Please design an English reading test for Taiwan's General Scholastic Ability Test (學測) level, suitable for 12th-grade students (approximately CEFR B1 to B2). The test should align with Taiwan's 108 Curriculum Guidelines and include the following:

1. **Reading Passage:**
   - Write a reading passage (200-300 words) on a topic relevant to 教育與學習（學校生活、考試壓力、未來規劃),科技與創新（手機、人工智慧、網路影響）,環境與永續（氣候變遷、回收、綠能）,文化與節日（台灣或國際節日、多元文化）,旅遊與冒險（國內外旅遊、文化體驗）,健康與生活（飲食、運動、心理健康）,社會議題（青少年問題、全球化、平等）。內容可融入台灣文化元素（如夜市、台灣地標、節日）或國際視野，確保文化中立且高中生能理解。文章應具吸引力，可加入敘事、描述性或論述性內容，模擬學測的多元題材。
   - Use vocabulary limited to Taiwan's high school English word list (approximately 3500-4000 words, similar to CEFR B1-B2, e.g., Oxford 3000 or 5000).
   - Include grammar structures common in 學測, such as present/past/future tenses, present/past perfect, passive voice, first/second conditionals, relative clauses (who, which, that), comparative/superlative adjectives, modal verbs (can, could, should, must, might), and simple participial phrases.
   - Use a mix of simple, compound, and complex sentences (10-25 words per sentence) with affirmative, negative, interrogative, and emphatic sentences.
   - Incorporate common phrases (e.g., "take care of," "pay attention to," "look forward to," "in order to," "keep in touch").
   - Ensure the content is engaging, possibly with a narrative, descriptive, or expository style, and culturally relevant (e.g., mention Taiwanese culture like night markets or international topics like climate change).

2. **Questions:**
   - Create 5 questions to test comprehension, vocabulary, and grammar, following 學測 format:
     - 2 multiple-choice questions (4 options each) for main idea or detail recall.
     - 1 inference question (e.g., Why does the author mention…?).
     - 1 vocabulary question (e.g., The word "X" in the passage is closest in meaning to…).
     - 1 grammar or sentence structure question (e.g., Choose the best paraphrase for the sentence).
   - Ensure questions progress from easy (direct recall) to challenging (inference and complex sentence structures).
   - Provide correct answers and detailed explanations for each question.

3. **Additional Requirements:**
   - Include a short vocabulary list of 5-8 key words used in the passage.
   - Ensure the content is culturally neutral or includes Taiwanese elements (e.g., Dragon Boat Festival, night markets) but remains accessible to all students.
   - Format the output clearly, with the passage, vocabulary list, questions, answers, and explanations labeled separately.
`;
            break;
        case 'TOEIC':
            examSpecificInstructions = `
**Exam-Specific Rules for TOEIC (Test of English for International Communication):**
Please design an English reading test for the TOEIC (Test of English for International Communication) reading section, suitable for test-takers at CEFR B1 to B2 levels. The test should align with TOEIC's focus on workplace and business communication and include the following:

1. **Reading Passage:**
   - Write one or two reading passages (total 200-300 words; e.g., one 200-word passage or two passages of 100-150 words each) on a workplace or business-related topic 如：職場（會議、電子郵件、報告、招聘）,商務活動（銷售、行銷、客戶服務、訂單）,旅行與出差（訂票、飯店預訂、行程安排）,公司運作（產品介紹、公司政策、財務）,日常辦公（設備使用、辦公室通知）。
   - Use vocabulary limited to TOEIC's common word list (approximately 3500-4500 words, similar to CEFR B1-B2, with business-related terms like "deadline," "schedule," "invoice").
   - Include grammar structures common in TOEIC, such as present/past/future tenses, present/past perfect, passive voice, first/second conditionals, relative clauses (who, which, that), comparative/superlative adjectives, modal verbs (can, could, should, must, might), and simple participial phrases.
   - Use a mix of simple, compound, and complex sentences (10-25 words per sentence) with affirmative, negative, and interrogative sentences in a formal or semi-formal tone.
   - Incorporate common TOEIC phrases (e.g., "set up a meeting," "place an order," "look forward to," "in charge of," "as soon as possible").
   - Ensure the content is engaging and realistic, possibly in the format of an email, memo, advertisement, or itinerary, reflecting international workplace scenarios.

2. **Questions:**
   - Create 5 questions to test comprehension, vocabulary, and grammar, following TOEIC Part 7 format:
     - 1 multiple-choice question (4 options) for the main idea or purpose (e.g., What is the purpose of the email?).
     - 2 multiple-choice questions (4 options each) for details (e.g., Who/What/Where/When/Why).
     - 1 inference question (e.g., What can be inferred about…?).
     - 1 vocabulary question (e.g., What does the word "X" mean in this context?).
   - Ensure questions progress from easy (direct recall) to slightly challenging (inference or vocabulary guessing).
   - Provide correct answers and detailed explanations for each question, including why incorrect options are wrong.

3. **Additional Requirements:**
   - Include a short vocabulary list of 5-8 key words used in the passage.
   - Ensure the content is culturally neutral and reflects international business scenarios (e.g., global companies, international travel).
   - Avoid complex grammar (e.g., third conditional) or culturally specific knowledge not relevant to TOEIC.
   - Format the output clearly, with the passage, vocabulary list, questions, answers, and explanations labeled separately.
`;
            break;
        case 'TOEFL':
            examSpecificInstructions = `
**Exam-Specific Rules for TOEFL iBT Reading Section:**
Please design an English reading test for the TOEFL iBT reading section, suitable for test-takers at CEFR B2 to C1 levels. The test should align with TOEFL's focus on academic English and include the following:

1. **Reading Passage:**
   - Write a reading passage (250-350 words),涵蓋TOEFL常見的學術主題，如：自然科學（生物、環境、氣候變遷、天文）,社會科學（心理學、社會學、經濟學）,人文學科（歷史、文學、藝術）,科技與工程（技術發展、創新）,教育與學習（學習方法、大學生活）,包含學術性詞彙（如analyze, significant, contribute, evidence），並提供上下文線索以推測詞義。
   - Use vocabulary limited to TOEFL's common word list (approximately 4000-6000 words, including academic terms like "analyze," "significant," "contribute," similar to the Academic Word List).
   - Include grammar structures common in TOEFL, such as present/past/future tenses, present/past perfect, passive voice, first/second/third conditionals, relative clauses (who, which, that, whose), participial phrases, and logical connectors (therefore, however, in contrast).
   - Use a mix of simple, compound, and complex sentences (15-30 words per sentence) with an academic tone.
   - Incorporate common TOEFL academic phrases (e.g., "carry out," "in terms of," "as a result," "play a role").
   - Ensure the content is engaging, academic, and accessible, possibly describing a study, historical event, or scientific phenomenon, with clear logical structure.

2. **Questions:**
   - Create 6 questions to test comprehension, vocabulary, and structure, following TOEFL reading section format:
     - 1 multiple-choice question (4 options) for the main idea (e.g., What is the passage mainly about?).
     - 2 multiple-choice questions (4 options each) for details (e.g., According to the passage, what…?).
     - 1 inference question (e.g., What can be inferred about…?).
     - 1 vocabulary question (e.g., The word "X" in the passage is closest in meaning to…).
     - 1 purpose or sentence insertion question (e.g., Why does the author mention…? or Where would the sentence best fit?).
   - Ensure questions progress from easy (direct recall) to challenging (inference or vocabulary guessing).
   - Provide correct answers and detailed explanations for each question, including why incorrect options are wrong.

3. **Additional Requirements:**
   - Include a short vocabulary list of 5-8 key words used in the passage.
   - Ensure the content is culturally neutral and reflects academic topics suitable for international test-takers.
   - Avoid overly technical terms or culturally specific knowledge not relevant to TOEFL.
   - Format the output clearly, with the passage, vocabulary list, questions, answers, and explanations labeled separately.
`;
            break;
        case 'IELTS':
            examSpecificInstructions = `
**Exam-Specific Rules for IELTS Academic Reading Section:**
Please design an English reading test for the IELTS Academic reading section, suitable for test-takers at CEFR B2 to C1 levels. The test should align with IELTS's focus on academic English and include the following:

1. **Reading Passage:**
   - Write a reading passage (250-350 words) on an academic topic (e.g., natural sciences like climate change or biodiversity, social sciences like education or globalization, humanities like historical events, or technology like renewable energy).
   - Use vocabulary limited to IELTS Academic's common word list (approximately 4000-6000 words, including academic terms like "analyze," "significant," "contribute," similar to the Academic Word List).
   - Include grammar structures common in IELTS, such as present/past/future tenses, present/past perfect, passive voice, first/second/third conditionals, relative clauses (who, which, that, whose), participial phrases, and logical connectors (therefore, however, in contrast).
   - Use a mix of simple, compound, and complex sentences (15-30 words per sentence) with an academic tone.
   - Incorporate common IELTS academic phrases (e.g., "carry out," "in terms of," "as a result," "play a role").
   - Ensure the content is engaging, academic, and accessible, possibly describing a study, historical event, or scientific phenomenon, with clear logical structure.

2. **Questions:**
   - Create 6 questions to test comprehension, vocabulary, and structure, following IELTS Academic reading section format:
     - 1 multiple-choice question (4 options) for the main idea (e.g., What is the main idea of the passage?).
     - 2 True/False/Not Given questions for details.
     - 1 matching question (e.g., Match headings to paragraphs or information to sections).
     - 1 vocabulary question (e.g., The word "X" in the passage is closest in meaning to…).
     - 1 sentence completion question (e.g., Complete the sentence with words from the passage).
   - Ensure questions progress from easy (direct recall) to challenging (inference or matching).
   - Provide correct answers and detailed explanations for each question, including why incorrect options are wrong.

3. **Additional Requirements:**
   - Include a short vocabulary list of 5-8 key words used in the passage.
   - Ensure the content is culturally neutral and reflects academic topics suitable for international test-takers.
   - Avoid overly technical terms or culturally specific knowledge not relevant to IELTS.
   - Format the output clearly, with the passage, vocabulary list, questions, answers, and explanations labeled separately.
`;
            break;
        case 'GEPT':
            examSpecificInstructions = `
**Exam-Specific Rules for GEPT Intermediate Level:**
Please design an English reading test for the GEPT Intermediate level, suitable for test-takers at GEPT初級、中級、高級等級，閱讀部分的難度對應CEFR不同水平（初級約A1-A2，中級約B1-B2，高級約B2-C1） (e.g., high school students or working professionals in Taiwan). The test should align with GEPT's focus on practical and semi-academic English and include the following:

1. **Reading Passage:**
   - Write a reading passage (200-300 words) on a topic relevant to Taiwanese test-takers 如：日常生活（家庭、朋友、休閒活動、購物）,職場（工作通知、電子郵件、簡歷,旅行與交通（旅遊資訊、行程安排、問路）,教育與學習（學校活動、學習經驗）,文化與節日（台灣節日如中秋節、國際文化）,健康與環境（飲食、運動、環境保護）。
   - Use vocabulary limited to GEPT Intermediate word list (初級約A1-A2，中級約B1-B2，高級約B2-C1), including daily and workplace terms like "schedule," "apply," "prepare").
   - Include grammar structures common in GEPT Intermediate, such as present/past/future tenses, present/past perfect, passive voice, first/second conditionals, relative clauses (who, which, that), comparative/superlative adjectives, modal verbs (can, could, should, must, might), and simple participial phrases.
   - Use a mix of simple, compound, and complex sentences (10-25 words per sentence) with a semi-formal or practical tone.
   - Incorporate common GEPT phrases (e.g., "take care of," "look forward to," "set up," "in charge of," "on time").
   - Ensure the content is engaging and practical, possibly in the format of an email, announcement, or short article, reflecting Taiwanese culture (e.g., Mid-Autumn Festival, night markets) or international scenarios.

2. **Questions:**
   - Create 5 questions to test comprehension, vocabulary, and grammar, following GEPT Intermediate reading section format:
     - 1 multiple-choice question (4 options) for the main idea (e.g., What is the passage mainly about?).
     - 2 multiple-choice questions (4 options each) for details (e.g., Who/What/Where/When/Why).
     - 1 True/False question for comprehension.
     - 1 vocabulary question (e.g., What does the word "X" mean in this context?).
   - Ensure questions progress from easy (direct recall) to slightly challenging (simple inference or vocabulary guessing).
   - Provide correct answers and detailed explanations for each question, including why incorrect options are wrong.

3. **Additional Requirements:**
   - Include a short vocabulary list of 5-8 key words used in the passage.
   - Ensure the content is culturally relevant to Taiwanese test-takers (e.g., include references to Taiwanese festivals or daily life) but accessible to all.
   - Avoid complex grammar (e.g., third conditional) or culturally specific knowledge not relevant to GEPT Intermediate.
   - Format the output clearly, with the passage, vocabulary list, questions, answers, and explanations labeled separately.
`;
            break;
        case 'SAT':
            examSpecificInstructions = `
**Exam-Specific Rules for SAT Reading Section:**
Please design an English reading test for the SAT reading section, suitable for test-takers at CEFR B2 to C1 levels (e.g., high school seniors preparing for U.S. college admissions). The test should align with SAT's focus on critical reading and evidence-based analysis and include the following:

1. **Reading Passage:**
   - Write a reading passage (300-400 words) on an academic or historical topic.如：自然科學（生物學、環境科學、物理學),社會科學（心理學、經濟學、社會學）,人文學科（歷史文獻、文學、哲學）,歷史/社論（美國建國文件、全球視野社論）,包含學術性詞彙（如analyze, interpret, significant, evidence），並提供上下文線索以推測詞義。).
   - Use vocabulary limited to SAT's common word list (approximately 4000-6000 words, including academic terms like "analyze," "significant," "evidence," similar to the Academic Word List).
   - Include grammar structures common in SAT, such as present/past/future tenses, present/past perfect, passive voice, first/second/third conditionals, relative clauses (who, which, that, whose), participial phrases, and logical connectors (therefore, however, in contrast).
   - Use a mix of simple, compound, and complex sentences (15-30 words per sentence) with an academic or formal tone.
   - Incorporate common SAT academic phrases (e.g., "draw a conclusion," "in light of," "play a critical role," "be consistent with").
   - Ensure the content is engaging, academic, and accessible, possibly describing a study, historical event, or societal issue, with clear logical structure.

2. **Questions:**
   - Create 6 questions to test comprehension, vocabulary, and critical analysis, following SAT reading section format:
     - 1 multiple-choice question (4 options) for the main idea (e.g., What is the main idea of the passage?).
     - 1 multiple-choice question (4 options) for details (e.g., According to the passage, what…?).
     - 1 evidence question (e.g., Which choice provides the best evidence for the answer to the previous question?).
     - 1 vocabulary question (e.g., The word "X" in the passage is closest in meaning to…).
     - 1 purpose question (e.g., Why does the author include…?).
     - 1 perspective or inference question (e.g., What is the author's perspective on…?).
   - Ensure questions progress from easy (direct recall) to challenging (evidence-based analysis or inference).
   - Provide correct answers and detailed explanations for each question, including why incorrect options are wrong.

3. **Additional Requirements:**
   - Include a short vocabulary list of 5-8 key words used in the passage.
   - Ensure the content is culturally neutral or includes U.S. historical context (e.g., references to U.S. founding documents) but remains accessible to international test-takers.
   - Avoid overly technical terms or culturally specific knowledge not relevant to SAT.
   - Format the output clearly, with the passage, vocabulary list, questions, answers, and explanations labeled separately.
`;
            break;
        case 'GRE':
            examSpecificInstructions = `
**Exam-Specific Rules for GRE Reading Section:**
Please design an English reading test for the GRE reading section, suitable for test-takers at CEFR B2+ to C1 levels (e.g., students preparing for graduate school admission). The test should align with GRE's focus on advanced academic reading and critical reasoning and include the following:

1. **Reading Passage:**
   - Write a reading passage (300-450 words) on an academic topic. 如：自然科學（生物學、天文學、環境科學）,社會科學（心理學、社會學、經濟學）,人文學科（文學批評、歷史、哲學）,跨學科議題（文化研究、科學史、技術倫理）,包含高階學術詞彙（如ameliorate, obfuscate, paradigm, ubiquitous），並提供上下文線索以推測詞義。
   - Use vocabulary limited to GRE's common word list (approximately 5000-8000 words, including advanced academic terms like "ameliorate," "paradigm," "ubiquitous," similar to the Academic Word List or Barron's GRE list).
   - Include grammar structures common in GRE, such as present/past perfect, passive voice, first/second/third conditionals, relative clauses (who, which, that, whose), participial phrases, and logical connectors (notwithstanding, conversely, insofar as).
   - Use a mix of compound and complex sentences (20-35 words per sentence) with an advanced academic tone.
   - Incorporate common GRE academic phrases (e.g., "call into question," "bear out," "give rise to," "in lieu of").
   - Ensure the content is engaging, academic, and thought-provoking, possibly presenting contrasting viewpoints, a study, or a historical argument, with a rigorous logical structure.

2. **Questions:**
   - Create 6 questions to test comprehension, vocabulary, and critical reasoning, following GRE reading section format:
     - 1 multiple-choice question (4 options) for the primary purpose (e.g., What is the primary purpose of the passage?).
     - 1 multiple-choice question (4 options) for details (e.g., According to the passage, what…?).
     - 1 evidence question (e.g., Which choice provides the best evidence for the answer to the previous question?).
     - 1 vocabulary question (e.g., The word "X" in the passage is closest in meaning to…).
     - 1 purpose question (e.g., Why does the author discuss…?).
     - 1 logic or inference question (e.g., How does the second paragraph function in relation to the passage?).
   - Ensure questions progress from direct comprehension to advanced inference and logical analysis.
   - Provide correct answers and detailed explanations for each question, including why incorrect options are wrong.

3. **Additional Requirements:**
   - Include a short vocabulary list of 5-8 key words used in the passage.
   - Ensure the content is culturally neutral and reflects academic topics suitable for international test-takers.
   - Avoid overly technical jargon or culturally specific knowledge not relevant to GRE.
   - Format the output clearly, with the passage, vocabulary list, questions, answers, and explanations labeled separately.
`;
            break;
        case 'GMAT':
            examSpecificInstructions = `
**Exam-Specific Rules for GMAT Reading Comprehension Section:**
Please design an English reading test for the GMAT reading comprehension section, suitable for test-takers at CEFR B2+ to C1 levels (e.g., candidates preparing for business school admission). The test should align with GMAT's focus on critical reading and logical reasoning in academic and business contexts and include the following:

1. **Reading Passage:**
   - Write a reading passage (300-450 words) on an academic or business-related topic. 如：商務與管理（公司策略、市場分析、組織行為）,經濟學（市場趨勢、經濟政策、供需理論）,社會科學（心理學、社會學、行為研究）,自然科學（技術創新、環境影響、科學研究）,歷史或文化（商業歷史、管理哲學）,包含高階學術和商務詞彙（如mitigate, paradigm, correlate, efficacy），並提供上下文線索以推測詞義。
   - Use vocabulary limited to GMAT's common word list (approximately 5000-8000 words, including academic and business terms like "mitigate," "paradigm," "efficacy," similar to the Academic Word List or Barron's GMAT list).
   - Include grammar structures common in GMAT, such as present/past perfect, passive voice, first/second/third conditionals, relative clauses (who, which, that, whose), participial phrases, and logical connectors (nonetheless, conversely, insofar as).
   - Use a mix of compound and complex sentences (20-35 words per sentence) with an advanced academic or business tone.
   - Incorporate common GMAT academic and business phrases (e.g., "capitalize on," "call into question," "give rise to," "competitive advantage").
   - Ensure the content is engaging, academic, and thought-provoking, possibly presenting contrasting viewpoints, a business case, or a research-based argument, with a rigorous logical structure.

2. **Questions:**
   - Create 6 questions to test comprehension, critical reasoning, and logical analysis, following GMAT reading comprehension format:
     - 1 multiple-choice question (4 options) for the primary purpose (e.g., What is the primary purpose of the passage?).
     - 1 multiple-choice question (4 options) for details (e.g., According to the passage, what…?).
     - 1 evidence question (e.g., Which choice supports the author's claim in…?).
     - 1 inference question (e.g., What can be inferred about…?).
     - 1 purpose question (e.g., Why does the author mention…?).
     - 1 logical structure question (e.g., The second paragraph serves to…?).
   - Ensure questions progress from direct comprehension to advanced inference and logical analysis.
   - Provide correct answers and detailed explanations for each question, including why incorrect options are wrong.

3. **Additional Requirements:**
   - Include a short vocabulary list of 5-8 key words used in the passage.
   - Ensure the content is culturally neutral and reflects academic or business topics suitable for international test-takers.
   - Avoid overly technical jargon or culturally specific knowledge not relevant to GMAT.
   - Format the output clearly, with the passage, vocabulary list, questions, answers, and explanations labeled separately.
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

For each question, you MUST provide a detailed analysis in **繁體中文 (Traditional Chinese)** for EVERY option. Each analysis MUST:
1. Specifically cite which paragraph(s) and line(s) in the passage support or contradict the option
2. Explain why the option is correct or incorrect based on the cited text
3. Use the format: "根據第X段第Y行「原文引用」，..." 來開始每個選項的分析

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
      "optionAnalyses": {
        "A": "根據第X段第Y行「原文引用」，...",
        "B": "根據第X段第Y行「原文引用」，...",
        "C": "根據第X段第Y行「原文引用」，...",
        "D": "根據第X段第Y行「原文引用」，..."
      }
    },
    { "id": 2, "questionText": "Question 2...", "options": ["A", "B", "C", "D"], "correctAnswer": "B", "optionAnalyses": {"A": "根據第X段第Y行「原文引用」，...", "B": "根據第X段第Y行「原文引用」，...", "C": "根據第X段第Y行「原文引用」，...", "D": "根據第X段第Y行「原文引用」，..."} },
    { "id": 3, "questionText": "Question 3...", "options": ["A", "B", "C", "D"], "correctAnswer": "C", "optionAnalyses": {"A": "根據第X段第Y行「原文引用」，...", "B": "根據第X段第Y行「原文引用」，...", "C": "根據第X段第Y行「原文引用」，...", "D": "根據第X段第Y行「原文引用」，..."} },
    { "id": 4, "questionText": "Question 4...", "options": ["A", "B", "C", "D"], "correctAnswer": "D", "optionAnalyses": {"A": "根據第X段第Y行「原文引用」，...", "B": "根據第X段第Y行「原文引用」，...", "C": "根據第X段第Y行「原文引用」，...", "D": "根據第X段第Y行「原文引用」，..."} },
    { "id": 5, "questionText": "Question 5...", "options": ["A", "B", "C", "D"], "correctAnswer": "A", "optionAnalyses": {"A": "根據第X段第Y行「原文引用」，...", "B": "根據第X段第Y行「原文引用」，...", "C": "根據第X段第Y行「原文引用」，...", "D": "根據第X段第Y行「原文引用」，..."} }
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
        // 將 id 改為 Int 型別，使用 Date.now() 產生唯一整數
        jsonResponse.id = Date.now();
        jsonResponse.difficulty = difficulty;
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

// 弱點分析 AI 端點
app.post('/api/weakness-analysis', authenticateGeminiKey, async (req, res) => {
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const geminiApiKeyFromRequest = req.headers['x-api-key'];
    const genAI = new GoogleGenerativeAI(geminiApiKeyFromRequest);
    const examResult = req.body;
    const prompt = `
你是一位專業英文閱讀測驗分析師。請根據以下考生的作答結果，分析其閱讀弱點、邏輯盲點、常見錯誤類型，並給出具體改進建議。請用繁體中文回答。

【考生作答結果】
- 題目內容（可省略或簡述）
- 答案陣列（每題是否正確、選項、題型等）

請輸出一個 JSON 物件，格式如下：
{
  "summary": "總結考生的主要弱點",
  "logicGaps": ["邏輯盲點1", "邏輯盲點2"],
  "improvementSuggestions": ["建議1", "建議2"],
  "category": "常見弱點分類"
}
`;
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
    const result = await model.generateContent(prompt + '\n' + JSON.stringify(examResult));
    const response = await result.response;
    let text = response.text();
    text = text.replace(/^```json\n/, '').replace(/\n```$/, '');
    // 只取第一個合法 JSON 物件
    const firstJsonMatch = text.match(/\{[\s\S]*\}/);
    if (!firstJsonMatch) throw new Error('AI 回傳內容找不到合法 JSON');
    try {
      const ai = JSON.parse(firstJsonMatch[0]);
      const weaknessAnalysis = {
        id: uuidv4(),
        weaknesses: ai.logicGaps || [],
        suggestions: Array.isArray(ai.improvementSuggestions) ? ai.improvementSuggestions.join('\n') : (ai.improvementSuggestions || ''),
        generatedAt: Date.now() / 1000 // 以秒為單位的 timestamp
      };
      res.json(weaknessAnalysis);
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      res.status(500).json({ error: 'Failed to parse response from AI', rawResponse: text });
    }
  } catch (error) {
    console.error('Gemini API Error:', error);
    res.status(500).json({ error: 'Failed to generate weakness analysis', message: error.message });
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
