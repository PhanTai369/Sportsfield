const axios = require('axios');
const fs = require('fs');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// Sử dụng model Gemini 2.5 Flash (free tier, mới nhất)
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent';

async function moderateContent(text) {
  if (!GEMINI_API_KEY) throw new Error('Missing Gemini API key');
  const prompt = `Bạn là bộ lọc kiểm duyệt tiếng Việt. Nếu nội dung sau có bất kỳ từ ngữ tục tĩu, chửi bậy, xúc phạm, bạo lực, phân biệt, hãy trả về đúng một từ duy nhất là BAD. Nếu hoàn toàn sạch, trả về đúng một từ duy nhất là OK. Không giải thích, không thêm gì khác. Nội dung: \n"${text}"`;
  try {
    const response = await axios.post(
      `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
      {
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt }
            ]
          }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    const result = response.data.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toUpperCase();
    fs.appendFileSync('logs/gemini_moderation.log', `\n[${new Date().toISOString()}] INPUT: ${text}\nRESULT: ${result}\n`);
    if (result === 'OK') return true;
    if (result === 'BAD') return false;
    return false;
  } catch (error) {
    fs.appendFileSync('logs/gemini_moderation.log', `\n[${new Date().toISOString()}] ERROR: ${error.message}\nRESPONSE: ${JSON.stringify(error.response?.data)}\n`);
    return false;
  }
}

module.exports = { moderateContent };