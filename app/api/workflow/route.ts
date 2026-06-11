import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const workflows = await prisma.workflow.findMany({
      orderBy: {
        updatedAt: 'desc'
      }
    });
    
    return NextResponse.json(workflows);
  } catch (error: any) {
    console.error('Fetch Workflows Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, name, nodes, edges } = body;
    
    if (id) {
      // 存在 ID，尝试更新
      const existing = await prisma.workflow.findUnique({ where: { id } });
      if (existing) {
        const workflow = await prisma.workflow.update({
          where: { id },
          data: {
            name: name || existing.name,
            nodes: JSON.stringify(nodes),
            edges: JSON.stringify(edges)
          }
        });
        return NextResponse.json({ success: true, workflow });
      }
    }
    
    // 没有有效 ID 或 ID 不存在，则新建
    const workflow = await prisma.workflow.create({
      data: {
        name: name || '未命名工作流',
        nodes: JSON.stringify(nodes),
        edges: JSON.stringify(edges)
      }
    });
    
    return NextResponse.json({ success: true, workflow });
  } catch (error: any) {
    console.error('Save Workflow Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
