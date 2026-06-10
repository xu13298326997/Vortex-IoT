import { streamText } from 'ai';
import { google } from '@ai-sdk/google';

// 设置边缘计算超时时间（如果部署到 Vercel 等平台）
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages, systemPrompt, modelName } = await req.json();

    // 默认回退模型
    let aiModel = 'gemini-1.5-pro-latest';
    
    // 根据前端传入的模型名称进行智能映射
    if (modelName === 'Gemini 1.5 Flash') {
      aiModel = 'gemini-1.5-flash-latest';
    } else if (modelName?.includes('Flash')) {
      aiModel = 'gemini-1.5-flash-latest';
    }

    // 严密的错误处理：未配置 API Key
    if (!process.env.GEMINI_API_KEY) {
      console.warn("⚠️ 警告: 未检测到 GEMINI_API_KEY 环境变量！");
      // 注意：在实际生产环境中应抛出错误，这里为了演示即使没有 Key 也能显示友好报错
    }

    // 核心调用：使用 Vercel AI SDK 提供的标准流式处理
    const result = await streamText({
      model: google(aiModel),
      system: systemPrompt || "你是一个乐于助人的 AI 助手。",
      messages,
      // 可以在这里额外配置温度等大模型参数
      temperature: 0.7,
    });

    // 将大模型的流式响应转化为标准 Web Stream 发送给前端
    return result.toDataStreamResponse();
    
  } catch (error: any) {
    console.error('API Chat Error:', error);
    return new Response(
      JSON.stringify({ 
        error: '调用大模型 API 发生异常', 
        details: error?.message || String(error)
      }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
