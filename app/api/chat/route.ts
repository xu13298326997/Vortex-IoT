import { streamText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

export async function POST(req: Request) {
  try {
    const google = createGoogleGenerativeAI({
      apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || '',
    });

    const { messages, systemPrompt, modelName } = await req.json();

    // 默认回退模型
    let aiModel = 'gemini-2.5-flash';

    // 根据前端传入的模型名称进行智能映射
    if (modelName === 'Gemini 1.5 Flash' || modelName === 'Gemini 2.5 Flash') {
      aiModel = 'gemini-2.5-flash';
    } else if (modelName?.includes('Flash')) {
      aiModel = 'gemini-2.5-flash';
    }

    // 严密的错误处理：未配置 API Key
    if (!process.env.GEMINI_API_KEY) {
      console.warn("⚠️ 警告: 未检测到 GEMINI_API_KEY 环境变量！");
      // 注意：在实际生产环境中应抛出错误，这里为了演示即使没有 Key 也能显示友好报错
    }

    // 核心调用：使用 Vercel AI SDK 提供的标准流式处理
    const result = await streamText({
      model: google(aiModel),
      system: (systemPrompt || "你是一个乐于助人的 AI 助手。") + "\n\n【系统强制指令】：请严格返回纯净的 JSON 格式数据。禁止输出任何 Markdown 格式的包裹符号（如 ```json ），禁止包含任何解释性文本或前后的客套话，确保输出的字符可以直接被 JSON.parse 解析。",
      messages,
      // 可以在这里额外配置温度等大模型参数
      temperature: 0.7,
    });

    // 兼容所有版本的原生纯文本流返回方式
    return result.toTextStreamResponse();

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
