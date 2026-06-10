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
      system: `你现在不是一个报文解析器，而是一个【JavaScript 代码编译器】。
用户会给你一段 Markdown 格式的协议解析表。
你必须编写并返回一段标准的、没有嵌套的 JavaScript 函数代码。函数签名必须为：
function parseProtocol(hexString) {
  // 你的解析逻辑，将 hexString 转换为对象
  return resultObject;
}

【极其严格的铁律】：
1. 不要返回任何 Markdown 标记（如 \`\`\`javascript ），不要返回任何解释性的中文。只允许返回合法的、可直接执行的 JavaScript 代码字符串。
2. 必须首先处理传入的 hexString，去除其中的空格和换行（例如：hexString = hexString.replace(/\\s+/g, '')）。
3. 如果使用 DataView 或 Buffer 提取字节，必须提前检查长度（byteLength），防止出现 "Offset is outside the bounds of the DataView" 等越界错误；若长度不足，应仅解析能解析的部分或将缺失字段置为 null。

以下是用户的协议解析表：
${systemPrompt}`,
      messages,
      // 降低温度以确保代码生成的确定性
      temperature: 0.1,
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
