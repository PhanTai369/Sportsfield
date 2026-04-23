const { BedrockAgentRuntimeClient, RetrieveAndGenerateCommand } = require("@aws-sdk/client-bedrock-agent-runtime");
const responseFormatter = require('../utils/responseFormatter');
const logger = require('../utils/logger');

// Store session IDs for conversation history
// In a real production app, this should be in Redis or DB
const sessionMap = new Map();

// Initialize Bedrock Client
// The client automatically uses AWS credentials from ~/.aws/credentials or IAM role (EC2/Lambda)
// If you want to specify region: new BedrockAgentRuntimeClient({ region: process.env.AWS_REGION || "us-west-2" })
const client = new BedrockAgentRuntimeClient({ region: process.env.AWS_REGION || "us-west-2" });

/**
 * Handle incoming chatbot questions
 * POST /api/chatbot/ask
 * Body: { question: string, sessionId?: string }
 */
const askChatbot = async (req, res) => {
  try {
    const { question, sessionId: clientSessionId } = req.body;

    if (!question) {
      return res.status(400).json(responseFormatter.error('Câu hỏi không được để trống.', 400));
    }

    const knowledgeBaseId = process.env.BEDROCK_KNOWLEDGE_BASE_ID || "REPLACE_WITH_YOUR_KB_ID";
    // We use Claude v2 or Haiku by default for retrieveAndGenerate
    const modelArn = process.env.BEDROCK_MODEL_ARN || "arn:aws:bedrock:us-west-2::foundation-model/anthropic.claude-3-haiku-20240307-v1:0";

    // Build the command input
    const input = {
      input: {
        text: question,
      },
      retrieveAndGenerateConfiguration: {
        type: "KNOWLEDGE_BASE",
        knowledgeBaseConfiguration: {
          knowledgeBaseId: knowledgeBaseId,
          modelArn: modelArn,
        },
      },
    };

    // Use existing sessionId if provided by the client and we have it in memory
    if (clientSessionId && sessionMap.has(clientSessionId)) {
      input.sessionId = sessionMap.get(clientSessionId);
    }

    const command = new RetrieveAndGenerateCommand(input);

    let answer = "";
    let bedrockSessionId = null;

    try {
      // Execute the call to AWS Bedrock
      const response = await client.send(command);
      
      // Get the generated text
      answer = response.output.text;
      bedrockSessionId = response.sessionId;

      // Store the mapping if a clientSessionId was provided
      if (clientSessionId) {
        sessionMap.set(clientSessionId, bedrockSessionId);
      }

    } catch (bedrockError) {
      logger.error('Error calling AWS Bedrock API:', bedrockError);
      
      // Fallback response for development/testing if Bedrock is not fully configured
      if (bedrockError.name === 'ValidationException' || bedrockError.message.includes('REPLACE_WITH_YOUR_KB_ID')) {
         answer = `(Hệ thống đang cấu hình Knowledge Base ID) Xin lỗi, tôi là trợ lý ảo của SportFields. Câu hỏi của bạn là: "${question}". Hiện tại tôi chưa được kết nối với dữ liệu Knowledge Base thực tế. Vui lòng cấu hình BEDROCK_KNOWLEDGE_BASE_ID.`;
      } else {
        throw bedrockError;
      }
    }

    return res.status(200).json(responseFormatter.success({
      answer: answer,
      sessionId: clientSessionId || bedrockSessionId || `temp_${Date.now()}`
    }, 'Chatbot trả lời thành công'));

  } catch (error) {
    logger.error('Chatbot API error:', error);
    return res.status(500).json(responseFormatter.error('Đã có lỗi xảy ra khi kết nối với hệ thống AI.', 500, error.message));
  }
};

module.exports = {
  askChatbot
};
