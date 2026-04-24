const { BedrockRuntimeClient, ConverseCommand } = require("@aws-sdk/client-bedrock-runtime");
const { Field, Location } = require('../models');
const { Op } = require('sequelize');
const responseFormatter = require('../utils/responseFormatter');
const logger = require('../utils/logger');

// Store session IDs for conversation history
// In a real production app, this should be in Redis or DB
const sessionMap = new Map();

// Initialize Bedrock Client
const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION || "us-west-2" });

/**
 * Tool: Search Football Fields in Database
 */
const searchFootballFields = async (args) => {
  try {
    let whereClause = {};
    let includeClause = [{ model: Location, as: 'location' }];
    
    if (args.location_query) {
      includeClause[0].where = {
        [Op.or]: [
          { city: { [Op.iLike]: `%${args.location_query}%` } },
          { district: { [Op.iLike]: `%${args.location_query}%` } },
          { address: { [Op.iLike]: `%${args.location_query}%` } }
        ]
      };
    }
    
    if (args.max_price) {
      whereClause.price_per_hour = { [Op.lte]: args.max_price };
    }

    const fields = await Field.findAll({
      where: whereClause,
      include: includeClause,
      limit: 5 // Return top 5 matches
    });

    if (fields.length === 0) {
      return "Không tìm thấy sân bóng nào phù hợp với yêu cầu trong Database hiện tại.";
    }

    const result = fields.map(f => {
      const loc = f.location ? `${f.location.address}, ${f.location.district}, ${f.location.city}` : 'Chưa cập nhật địa chỉ';
      return `- Sân: ${f.name} | Giá: ${f.price_per_hour} VND/giờ | Địa chỉ: ${loc}`;
    }).join('\n');

    return `Đây là thông tin trực tiếp từ Database:\n${result}`;
  } catch (error) {
    logger.error('Database search error:', error);
    return "Đã xảy ra lỗi khi truy vấn Database.";
  }
};

/**
 * Handle incoming chatbot questions
 * POST /api/chatbot/ask
 */
const askChatbot = async (req, res) => {
  try {
    const { question, sessionId: clientSessionId } = req.body;

    if (!question) {
      return res.status(400).json(responseFormatter.error('Câu hỏi không được để trống.', 400));
    }

    const sessionId = clientSessionId || `session_${Date.now()}`;

    // Initialize conversation history if it doesn't exist
    if (!sessionMap.has(sessionId)) {
      sessionMap.set(sessionId, [
        {
          role: "user",
          content: [{ text: "Hãy đóng vai một nhân viên tư vấn siêu nhiệt tình của hệ thống đặt sân bóng SportFields. Khách hàng sẽ hỏi bạn thông tin về sân. Bạn MẶC ĐỊNH SẼ SỬ DỤNG CÔNG CỤ 'search_football_fields' để lấy thông tin ĐỘNG TỪ DATABASE để trả lời khách. Không được tự bịa ra dữ liệu." }]
        },
        {
          role: "assistant",
          content: [{ text: "Dạ em chào anh/chị ạ! Em là nhân viên tư vấn của hệ thống SportFields. Em có thể giúp anh/chị tìm sân bóng ở khu vực nào hoặc mức giá bao nhiêu ạ?" }]
        }
      ]);
    }

    const messages = sessionMap.get(sessionId);
    // Add user's new question
    messages.push({ role: "user", content: [{ text: question }] });

    // Define the tool for Bedrock
    const toolConfig = {
      tools: [{
        toolSpec: {
          name: "search_football_fields",
          description: "Tra cứu thông tin sân bóng TRỰC TIẾP TỪ DATABASE hệ thống SportFields dựa trên địa điểm hoặc giá.",
          inputSchema: {
            json: {
              type: "object",
              properties: {
                location_query: { type: "string", description: "Tên quận, thành phố hoặc đường (ví dụ: Thủ Đức, Quận 1)." },
                max_price: { type: "number", description: "Mức giá tối đa mà khách hàng mong muốn (VND)." }
              }
            }
          }
        }
      }]
    };

    const modelId = process.env.BEDROCK_MODEL_ARN || "anthropic.claude-3-haiku-20240307-v1:0";

    let command = new ConverseCommand({
      modelId: modelId,
      messages: messages,
      toolConfig: toolConfig
    });

    let response = await client.send(command);
    let outputMessage = response.output.message;
    
    // Handle Tool Use (If AI decides it needs to query the database)
    if (response.stopReason === "tool_use") {
      const toolUseBlock = outputMessage.content.find(c => c.toolUse);
      if (toolUseBlock) {
        const { toolUseId, name, input } = toolUseBlock.toolUse;
        
        // Add AI's tool request to history
        messages.push(outputMessage); 
        
        // Execute the actual Database function
        let toolResultText = "";
        if (name === "search_football_fields") {
          toolResultText = await searchFootballFields(input);
        } else {
          toolResultText = "Công cụ không tồn tại.";
        }

        // Send DB result back to AI
        messages.push({
          role: "user",
          content: [{
            toolResult: {
              toolUseId: toolUseId,
              content: [{ text: toolResultText }]
            }
          }]
        });

        // Trigger AI again to generate final natural response
        command = new ConverseCommand({
          modelId: modelId,
          messages: messages,
          toolConfig: toolConfig
        });

        response = await client.send(command);
        outputMessage = response.output.message;
      }
    }

    // Save final response to history
    messages.push(outputMessage);
    const finalAnswer = outputMessage.content.find(c => c.text)?.text || "Xin lỗi, tôi không thể trả lời lúc này.";

    return res.status(200).json(responseFormatter.success({
      answer: finalAnswer,
      sessionId: sessionId
    }, 'Chatbot trả lời thành công'));

  } catch (error) {
    logger.error('Chatbot API error:', error);
    return res.status(500).json(responseFormatter.error('Đã có lỗi xảy ra khi kết nối với hệ thống AI.', 500, error.message));
  }
};

module.exports = {
  askChatbot
};
