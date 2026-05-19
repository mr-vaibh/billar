import type { Template } from '@/types/template';

const BASE = '/api/templates';

export async function fetchTemplates(): Promise<Template[]> {
  const res = await fetch(BASE);
  if (!res.ok) throw new Error('Failed to fetch templates');
  return res.json();
}

export async function fetchTemplate(id: string): Promise<Template> {
  const res = await fetch(`${BASE}/${id}`);
  if (!res.ok) throw new Error('Template not found');
  return res.json();
}

export async function saveTemplate(template: Template): Promise<Template> {
  const method = template.id ? 'PUT' : 'POST';
  const url = template.id ? `${BASE}/${template.id}` : BASE;
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(template),
  });
  if (!res.ok) throw new Error('Failed to save template');
  return res.json();
}

export async function deleteTemplate(id: string): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete template');
}
