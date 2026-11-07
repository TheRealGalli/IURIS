import catalogo from './letture-catalogo.json';
import { renderMd } from './md';
import type { Concetto } from './types';
import type { AncoraTesto, SegnoOriginale } from './originali';
import type { DocumentoLettura, IndiceSezioneLettura, SezioneLettura, BloccoLettura, BloccoTesto } from './letture';

export const DOCUMENTI_LETTURA = catalogo as DocumentoLettura[];
export const sezioniInCache = new Map<string, Promise<SezioneLettura>>();
export function caricaSezioneLettura(meta: IndiceSezioneLettura): Promise<SezioneLettura> {
  if (!sezioniInCache.has(meta.file)) {
    const richiesta = fetch(`${import.meta.env.BASE_URL}${meta.file}`, { cache: 'no-store' }).then(async (r) => {
      if (!r.ok) throw new Error('Il testo non è disponibile. Riprova con la connessione attiva.');
      return r.json() as Promise<SezioneLettura>;
    }).catch((e) => { sezioniInCache.delete(meta.file); throw e; });
    sezioniInCache.set(meta.file, richiesta);
  }
  return sezioniInCache.get(meta.file)!;
}

const CONSENTITI = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'LI', 'STRONG', 'EM', 'B', 'I', 'BLOCKQUOTE', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD', 'A', 'CODE', 'PRE', 'BR', 'HR', 'SUP', 'SUB', 'SPAN', 'DEL']);
/** I PDF diventano testo: eventuali frammenti HTML estratti non diventano codice eseguibile. */
function htmlSicuro(html: string): HTMLDivElement {
  const root = document.createElement('div');
  root.innerHTML = html;
  root.querySelectorAll('script,style,iframe,object,embed,form,input,button,svg,math').forEach((el) => el.remove());
  for (const el of Array.from(root.querySelectorAll('*')).reverse()) {
    if (!CONSENTITI.has(el.tagName)) { el.replaceWith(document.createTextNode(el.textContent ?? '')); continue; }
    for (const attr of Array.from(el.attributes)) {
      const nome = attr.name;
      const valido = el.tagName === 'A' && ((nome === 'class' && attr.value === 'cx')
        || (nome === 'data-c' && /^[a-z0-9-]+$/.test(attr.value))
        || (nome === 'href' && /^(?:#\/|https?:\/\/)/i.test(attr.value)));
      if (!valido) el.removeAttribute(nome);
    }
    if (el.tagName === 'A' && !el.classList.contains('cx')) { el.setAttribute('target', '_blank'); el.setAttribute('rel', 'noopener noreferrer'); }
  }
  return root;
}

export interface BloccoPronto extends BloccoTesto { html: string; markdown: string; notaRevisione?: string }
export function preparaBlocchi(sezione: SezioneLettura, concetti: Map<string, Concetto>): BloccoPronto[] {
  return sezione.blocchi.map((b: BloccoLettura) => {
    const html = htmlSicuro(renderMd(b.markdown, concetti));
    return { id: b.id, pagina: b.pagina, testo: html.textContent ?? '', html: html.innerHTML,
      markdown: b.markdown, concetti: b.concetti ?? [], notaRevisione: b.notaRevisione };
  });
}

export type SegnoBlocco = { segno: SegnoOriginale; ancora: AncoraTesto };
const COLORI = { giallo: ['#f7d84b70', '#b29512'], verde: ['#62ce9570', '#23865a'], rosa: ['#f285af70', '#b63264'] };
/** La marcatura cambia solo dopo un salvataggio, mai durante il trascinamento della selezione. */
export function htmlConSegni(html: string, segni: SegnoBlocco[]): string {
  if (!segni.length) return html;
  const root = document.createElement('div'); root.innerHTML = html;
  const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), nodi: { nodo: Text; offset: number }[] = [];
  let nodo: Node | null, offset = 0;
  while ((nodo = walk.nextNode())) { nodi.push({ nodo: nodo as Text, offset }); offset += nodo.textContent?.length ?? 0; }
  for (const { nodo: text, offset: da } of nodi) {
    const raw = text.data, a = da + raw.length;
    const presenti = segni.filter(({ ancora }) => ancora.inizio < a && ancora.fine > da);
    if (!presenti.length) continue;
    const limiti = [...new Set([0, raw.length, ...presenti.flatMap(({ ancora }) => [Math.max(0, ancora.inizio - da), Math.min(raw.length, ancora.fine - da)])])].sort((a, b) => a - b);
    const frammento = document.createDocumentFragment();
    for (let k = 0; k < limiti.length - 1; k++) {
      const start = limiti[k], end = limiti[k + 1]; if (start === end) continue;
      const attivi = presenti.filter(({ ancora }) => ancora.inizio < da + end && ancora.fine > da + start);
      const contenuto = document.createTextNode(raw.slice(start, end));
      if (!attivi.length) { frammento.append(contenuto); continue; }
      const span = document.createElement('span'); span.className = 'lettura-segno';
      span.dataset.segni = attivi.map(({ segno }) => segno.id).join(' ');
      const evidenziati = attivi.filter(({ segno }) => segno.tipo === 'evidenziato'), sottolineati = attivi.filter(({ segno }) => segno.tipo === 'sottolineato');
      if (evidenziati.length) { span.classList.add('evidenziato'); span.style.setProperty('--lettura-colore', COLORI[evidenziati[evidenziati.length - 1].segno.colore][0]); }
      if (sottolineati.length) { span.classList.add('sottolineato'); span.style.setProperty('--lettura-linea', COLORI[sottolineati[sottolineati.length - 1].segno.colore][1]); }
      span.append(contenuto); frammento.append(span);
    }
    text.replaceWith(frammento);
  }
  return root.innerHTML;
}

/** Range e textContent usano entrambi offset UTF-16, anche attraversando link e grassetti. */
export function catturaAncoreTesto(articolo: HTMLElement, edizione: number): { ancore: AncoraTesto[]; testo: string; pagina: number; rects: { x: number; y: number; w: number; h: number }[] } | null {
  const selezione = window.getSelection();
  if (!selezione || selezione.isCollapsed || !selezione.rangeCount) return null;
  const range = selezione.getRangeAt(0);
  if (!articolo.contains(range.startContainer) || !articolo.contains(range.endContainer)) return null;
  const ancore: AncoraTesto[] = []; let pagina = 1;
  for (const el of articolo.querySelectorAll<HTMLElement>('[data-lettura-block]')) {
    if (!range.intersectsNode(el)) continue;
    const raw = el.textContent ?? ''; let inizio = 0, fine = raw.length;
    const misura = (n: Node, offset: number) => { const r = document.createRange(); r.selectNodeContents(el); r.setEnd(n, offset); return r.toString().length; };
    if (el.contains(range.startContainer)) inizio = misura(range.startContainer, range.startOffset);
    if (el.contains(range.endContainer)) fine = misura(range.endContainer, range.endOffset);
    while (inizio < fine && /\s/.test(raw[inizio])) inizio++;
    while (fine > inizio && /\s/.test(raw[fine - 1])) fine--;
    if (fine <= inizio) continue;
    if (!ancore.length) pagina = Number(el.dataset.pagina) || 1;
    ancore.push({ edizione, blocco: el.dataset.letturaBlock!, inizio, fine, citazione: raw.slice(inizio, fine),
      prefisso: raw.slice(Math.max(0, inizio - 60), inizio), suffisso: raw.slice(fine, fine + 60) });
  }
  const testo = ancore.map((a) => a.citazione).join('\n');
  if (!ancore.length || testo.length > 10000) return null;
  const bounds = articolo.getBoundingClientRect();
  const rects = Array.from(range.getClientRects()).filter((r) => r.width > .5 && r.height > 1).map((r) => ({ x: r.left - bounds.left, y: r.top - bounds.top, w: r.width, h: r.height }));
  return { ancore, testo, pagina, rects };
}

export function linkTesto(documento: string, sezione?: string, blocco?: string, segno?: string): string {
  const params = new URLSearchParams({ doc: documento, modo: 'testo' });
  if (sezione) params.set('sezione', sezione);
  if (blocco) params.set('blocco', blocco);
  if (segno) params.set('segno', segno);
  return `#/originali?${params}`;
}
export function sezionePerPagina(doc: DocumentoLettura, pagina: number) { return doc.sezioni.find((s) => s.da <= pagina && s.a >= pagina); }
export function paginaBlocco(id: string): number | null { const match = /^p(\d+)-/.exec(id); return match ? Number(match[1]) : null; }
