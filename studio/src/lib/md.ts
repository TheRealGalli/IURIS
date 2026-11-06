import { marked } from 'marked';
import type { Concetto } from './types';

marked.setOptions({ gfm: true, breaks: false });

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

/**
 * Markdown → HTML, con i link ai concetti [[id]] / [[id|testo]] trasformati in
 * <a class="cx" data-c="id">. I concetti sconosciuti restano testo semplice.
 */
export function renderMd(md: string, concetti?: Map<string, Concetto>): string {
  const withLinks = (md || '').replace(/\[\[([^\]|]+)(?:\|([^\]]*))?\]\]/g, (_, id: string, testo?: string) => {
    const c = concetti?.get(id.trim());
    const label = testo?.trim() || c?.nome || id.replace(/-/g, ' ');
    if (!c) return label;
    return `<a class="cx" href="#/concetto/${encodeURIComponent(c.id)}" data-c="${esc(c.id)}">${esc(label)}</a>`;
  });
  return marked.parse(withLinks) as string;
}

/** Testo semplice (senza markdown né link) per anteprime e ricerca */
export function testoPiano(md: string): string {
  return (md || '')
    .replace(/\[\[([^\]|]+)(?:\|([^\]]*))?\]\]/g, (_, id: string, t?: string) => t || id.replace(/-/g, ' '))
    .replace(/[#*_>`|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
