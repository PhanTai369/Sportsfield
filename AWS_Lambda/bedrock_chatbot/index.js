// AWS Lambda Function to call Bedrock Knowledge Base
// Nộp file này làm bằng chứng W3 cho phần "Lambda + Bedrock Evidence"

const { BedrockAgentRuntimeClient, RetrieveAndGenerateCommand } = require("@aws-sdk/client-bedrock-agent-runtime");

exports.handler = async (event) => {
    console.log("Event:", JSON.stringify(event));

    // Get the user question from the API Gateway event body
    let userQuestion = "Xin chào";
    try {
        if (event.body) {
            const body = JSON.parse(event.body);
            userQuestion = body.question || userQuestion;
        }
    } catch (e) {
        console.error("Error parsing event body", e);
    }

    // Khởi tạo client gọi AWS Bedrock
    const client = new BedrockAgentRuntimeClient({ region: process.env.AWS_REGION || "us-west-2" });

    // ID của Knowledge Base (Thay bằng ID thực tế trên Bedrock Console của bạn)
    const knowledgeBaseId = process.env.BEDROCK_KNOWLEDGE_BASE_ID || "YOUR_KB_ID";
    // Model dùng để sinh câu trả lời dựa trên Knowledge Base (Claude 3 Haiku)
    const modelArn = process.env.BEDROCK_MODEL_ARN || "arn:aws:bedrock:us-west-2::foundation-model/anthropic.claude-3-haiku-20240307-v1:0";

    const input = {
        input: {
            text: userQuestion,
        },
        retrieveAndGenerateConfiguration: {
            type: "KNOWLEDGE_BASE",
            knowledgeBaseConfiguration: {
                knowledgeBaseId: knowledgeBaseId,
                modelArn: modelArn,
            },
        },
    };

    try {
        const command = new RetrieveAndGenerateCommand(input);
        const response = await client.send(command);
        
        console.log("Bedrock Response:", response);

        // Trả về dữ liệu cho Frontend thông qua API Gateway
        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
            },
            body: JSON.stringify({
                success: true,
                answer: response.output.text,
                sessionId: response.sessionId,
            }),
        };
    } catch (error) {
        console.error("Error calling Bedrock:", error);
        return {
            statusCode: 500,
            headers: {
                "Access-Control-Allow-Origin": "*",
            },
            body: JSON.stringify({
                success: false,
                message: "Lỗi kết nối với AWS Bedrock",
                error: error.message
            }),
        };
    }
};
