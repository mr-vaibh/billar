import { NextRequest, NextResponse } from 'next/server';
import { readTemplate, writeTemplate, deleteTemplate } from '@/lib/fileStorage';
import type { Template } from '@/types/template';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = readTemplate(id);
  if (!t) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(t);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const template: Template = await req.json();
  template.id = id;
  template.updatedAt = new Date().toISOString();
  writeTemplate(template);
  return NextResponse.json(template);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deleted = deleteTemplate(id);
  if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
