import { NextRequest, NextResponse } from 'next/server';
import { listTemplates, writeTemplate } from '@/lib/fileStorage';
import type { Template } from '@/types/template';

export async function GET() {
  try {
    return NextResponse.json(listTemplates());
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const template: Template = await req.json();
    template.updatedAt = new Date().toISOString();
    writeTemplate(template);
    return NextResponse.json(template, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to save template' }, { status: 500 });
  }
}
