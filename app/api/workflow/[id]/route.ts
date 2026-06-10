import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    // Next 15 requires awaiting params
    const { id } = await params;
    const workflow = await prisma.workflow.findUnique({
      where: { id }
    });
    
    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }
    
    return NextResponse.json(workflow);
  } catch (error: any) {
    console.error('Fetch Workflow Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
