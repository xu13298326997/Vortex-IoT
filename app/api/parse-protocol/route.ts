import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

export async function POST(req: Request) {
  try {
    const google = createGoogleGenerativeAI({
      apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || '',
    });

    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "No image provided" }), { status: 400 });
    }

    // Extract base64 part if it contains data URI prefix
    const base64Data = imageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

    const result = await generateText({
      model: google('gemini-2.5-flash'),
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: '你是一个工业协议转换专家。请严格识别用户上传的协议表图片，提取出里面的‘字段名、字节位置(Offset)、长度(Bytes)、数据类型等参数’。请忽略任何废话，直接将其转化为标准的 Markdown 表格格式返回，不要包含任何前后的客套话。' },
            { type: 'image', image: base64Data }
          ]
        }
      ]
    });

    return new Response(JSON.stringify({ text: result.text }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Parse Protocol Error:', error);
    return new Response(
      JSON.stringify({
        error: '解析协议图片失败',
        details: error?.message || String(error)
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
