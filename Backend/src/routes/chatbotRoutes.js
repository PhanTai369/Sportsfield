const express = require('express');
const router = express.Router();
const chatbotController = require('../controllers/chatbotController');
const { apiLimiter } = require('../middlewares/rateLimiter');

// Route: POST /api/chatbot/ask
// We add a rate limiter to prevent spamming the AWS Bedrock API
router.post('/ask', apiLimiter, chatbotController.askChatbot);

module.exports = router;
