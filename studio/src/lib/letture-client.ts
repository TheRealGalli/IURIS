import catalogo from './letture-catalogo.json';
import { renderMd } from './md';
import type { Concetto, Norme } from './types';
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
        || (nome === 'href' && /^(?:#\/|https?:\/\/)/i.test(attr.value)))
        // Un elenco che prosegue da un blocco precedente («6. …») conserva il suo numero di partenza.
        || (el.tagName === 'OL' && nome === 'start' && /^\d{1,3}$/.test(attr.value));
      if (!valido) el.removeAttribute(nome);
    }
    if (el.tagName === 'A' && !el.classList.contains('cx')) { el.setAttribute('target', '_blank'); el.setAttribute('rel', 'noopener noreferrer'); }
  }
  return root;
}

export interface BloccoPronto extends BloccoTesto { html: string; markdown: string; notaRevisione?: string; notaAggiornamento?: string }
const SUFFISSO = '(?:[- ]?(?:bis|ter|quater|quinquies|sexies|septies|octies|novies|decies))?';
const NUMERO = `\\d{1,4}${SUFFISSO}(?![\\d/])`;
const CITAZIONE = new RegExp(`\\b(artt?\\.?\\s*)(${NUMERO}(?:(?:\\s*[–-]\\s*|\\s*,\\s*|\\s+e\\s+)${NUMERO})*)`, 'gi');
const ALTRO_ATTO = /\b(?:Cost\b|Costituzione|legge\s+(?:n\.\s*)?\d|l\.\s*(?:cost\.\s*|fall|n\.\s*)?\d?|d\.\s?lgs|d\.\s?l\.|d\.P\.R|r\.d\.|TUE|TFUE|TUEL|TUB|TUF|T\.U|CEDU|Convenzione|Trattat|Carta dei diritti|regolament|Statuto|preleggi|disp\.\s*(?:prel|att|trans)|c\.\s?p\.|cod\.\s*(?:pen|proc|nav|cons|strad)|codice\s+(?:penale|di procedura|della navigazione|del consumo|della strada))/i;
const DI_UN_ALTRO = /^\s*(?:,?\s*(?:comma|co\.|n\.)\s*\d+\s*,?)?\s*(?:del(?:la|lo|l['’])?|dei|delle)\s+(?!c\.\s?c|cod\.\s*civ|codice civile)/i;
const CIVILE = /^.{0,30}?(?:c\.\s?c\b|cod\.\s*civ|codice civile)/i;
/**
 * «art. 1321 c.c.», «artt. 1325 e 1418»: i numeri diventano collegamenti alla sezione dell'atto della materia
 * (Codice civile o Costituzione). Il testo non cambia di un carattere: evidenziazioni e ancore restano dove sono.
 */
/** Materie che ospitano la Costituzione e il Codice civile per il corso scelto (le calcola materie-corso.ts);
 *  lette da globalThis per non aggiungere dipendenze a questo modulo. */
interface AttoCorso { slug: string; inCorso: boolean }
const attiCorso = (): { costituzione?: AttoCorso; codice?: AttoCorso } =>
  (globalThis as { __iurisAtti?: { costituzione?: AttoCorso; codice?: AttoCorso } }).__iurisAtti ?? {};
const DOPO_COST = /^\s*(?:,?\s*(?:comma|co\.|c\.)\s*\d+\s*,?)?\s*(?:Cost\b|della\s+Costituzione)/i;

/** Collegamento a un articolo: `materia` solo se l'atto sta in un'altra materia (del corso, o `fuori` dal corso). */
function linkArticolo(testo: string, chiave: string, titolo: string, atto?: AttoCorso): HTMLAnchorElement {
  const link = document.createElement('a');
  link.className = 'ax'; link.href = `#/norme/${chiave}`; link.dataset.art = chiave; link.title = titolo;
  if (atto) { link.dataset.materia = atto.slug; if (!atto.inCorso) link.dataset.fuori = '1'; }
  link.textContent = testo;
  return link;
}

/**
 * Collega le citazioni di articoli. `norme` è l'atto della materia aperta (Codice civile o Costituzione), se ne ha uno:
 * - nella materia del Codice «art. 1321 c.c.» apre il Codice e «art. 3 Cost.» la Costituzione della materia costituzionale del corso;
 * - nella materia costituzionale «art. 77» apre la Costituzione e «art. 2043 c.c.» il Codice di Diritto privato;
 * - nelle altre materie (senza atto) si collegano solo le citazioni con la sigla: «art. 3 Cost.», «art. 1321 c.c.».
 */
function collegaArticoli(root: HTMLElement, norme?: Norme): void {
  const civile = norme?.sigla === 'c.c.';
  const atti = attiCorso();
  // l'atto dell'altra materia: mai quello della materia aperta
  const altraCost = !norme || civile ? atti.costituzione : undefined;
  const altroCodice = !civile ? atti.codice : undefined;
  if (!norme && !altraCost && !altroCodice) return;
  const noti = new Set(!norme ? [] : norme.indice ? norme.indice.filter((r) => !r[5]).map((r) => r[0])
    : (norme.gruppi ?? []).flatMap((g) => g.articoli).filter((a) => !a.disposizione && !a.serie).map((a) => a.n));
  const serie = new Set((norme?.indice ?? []).filter((r) => r[5]).map((r) => r[0]));
  const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), nodi: Text[] = [];
  for (let n = walk.nextNode(); n; n = walk.nextNode()) if (!(n.parentElement?.closest('a,h1,h2,h3,h4,h5,h6'))) nodi.push(n as Text);
  for (const nodo of nodi) {
    const raw = nodo.data; let fine = 0; const pezzi: (string | HTMLAnchorElement)[] = [];
    for (const m of raw.matchAll(CITAZIONE)) {
      const dopo = raw.slice(m.index! + m[0].length, m.index! + m[0].length + 48);
      // l'atto è quello nominato per primo dopo il numero: «art. 15 disp. prel. c.c.» sono le preleggi, non il Codice
      const sigla = CIVILE.exec(dopo);
      const prima = sigla ? dopo.slice(0, sigla[0].length - sigla[0].match(/(?:c\.\s?c\b|cod\.\s*civ|codice civile)$/i)![0].length) : dopo;
      const preleggi = /^.{0,12}?(?:disp\.\s*prel|(?:delle\s+)?preleggi)/i.test(dopo);
      const altro = ALTRO_ATTO.test(civile ? prima : dopo.replace(/\bCost\b\.?|Costituzione/gi, ''));
      // da un'altra materia: «art. 3 Cost.» apre la Costituzione della materia costituzionale del corso
      if (altraCost && DOPO_COST.test(dopo)) {
        let pos = m.index! + m[1].length, primo = true;
        for (const t of m[2].matchAll(/\d{1,3}(?![\d-])/g)) {
          const n = Number(t[0]), da = primo ? m.index! : pos + t.index!, a = pos + t.index! + t[0].length;
          primo = false;
          if (n < 1 || n > 139 || da < fine) continue;
          pezzi.push(raw.slice(fine, da), linkArticolo(raw.slice(da, a), String(n), `Apri l'art. ${n} della Costituzione`, altraCost)); fine = a;
        }
        continue;
      }
      // da un'altra materia: «art. 2043 c.c.» apre il Codice civile di Diritto privato
      if (altroCodice && sigla && !preleggi && !ALTRO_ATTO.test(prima)) {
        let pos = m.index! + m[1].length, primo = true;
        for (const t of m[2].matchAll(new RegExp(NUMERO, 'gi'))) {
          const n = t[0].toLowerCase().replace(/^(\d+)[- ]?([a-z]+)$/, '$1-$2');
          const da = primo ? m.index! : pos + t.index!, a = pos + t.index! + t[0].length;
          primo = false;
          if (parseInt(n, 10) < 1 || parseInt(n, 10) > 2969 || da < fine) continue;
          pezzi.push(raw.slice(fine, da), linkArticolo(raw.slice(da, a), n, `Apri l'art. ${n} c.c.`, altroCodice)); fine = a;
        }
        continue;
      }
      if (!norme) continue;
      if (!(civile && preleggi) && (civile ? altro || (!sigla && DI_UN_ALTRO.test(dopo)) : altro || DI_UN_ALTRO.test(dopo.replace(/Costituzione/gi, 'c.c.')) || /^\s*(?:c\.\s?c|cod\.|codice)/i.test(dopo))) continue;
      const prel = civile && preleggi;
      let pos = m.index! + m[1].length, primo = true;
      for (const t of m[2].matchAll(new RegExp(NUMERO, 'gi'))) {
        const n = t[0].toLowerCase().replace(/^(\d+)[- ]?([a-z]+)$/, '$1-$2');
        const da = primo ? m.index! : pos + t.index!, a = pos + t.index! + t[0].length;
        if (prel ? !serie.has(n) : !noti.has(n)) { primo = false; continue; }
        pezzi.push(raw.slice(fine, da), linkArticolo(raw.slice(da, a), `${prel ? 'p' : ''}${n}`, prel ? `Apri l'art. ${n} delle preleggi` : `Apri l'art. ${n} ${norme.sigla ?? ''}`.trim())); fine = a; primo = false;
      }
    }
    if (!pezzi.length) continue;
    pezzi.push(raw.slice(fine));
    nodo.replaceWith(...pezzi.filter((x) => x !== ''));
  }
}

/** HTML di una sintesi o di una definizione (già reso da renderMd) con le citazioni di articoli collegate. */
export function collegaArticoliHtml(html: string, norme?: Norme): string {
  if (!/\bartt?\./i.test(html)) return html;
  const root = document.createElement('div');
  root.innerHTML = html;
  collegaArticoli(root, norme);
  return root.innerHTML;
}

export function preparaBlocchi(sezione: SezioneLettura, concetti: Map<string, Concetto>, norme?: Norme): BloccoPronto[] {
  return sezione.blocchi.map((b: BloccoLettura) => {
    const html = htmlSicuro(renderMd(b.markdown, concetti));
    collegaArticoli(html, norme);
    return { id: b.id, pagina: b.pagina, testo: html.textContent ?? '', html: html.innerHTML,
      markdown: b.markdown, concetti: b.concetti ?? [], notaRevisione: b.notaRevisione, notaAggiornamento: b.notaAggiornamento };
  });
}

export type SegnoBlocco = { segno: SegnoOriginale; ancora: AncoraTesto };
const COLORI: Record<SegnoOriginale['colore'], [string, string]> = { giallo: ['#f7d84b70', '#b29512'], verde: ['#62ce9570', '#23865a'], rosa: ['#f285af70', '#b63264'],
  azzurro: ['#6cb8f070', '#3d8bd0'], viola: ['#b195f270', '#8a63d8'], arancio: ['#f7a35c70', '#d27427'] };
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

export interface RettangoloTesto { x: number; y: number; w: number; h: number }
export interface FrammentoTesto extends RettangoloTesto { flusso: number }

/** Unisce soltanto frammenti vicini dello stesso paragrafo/cella e della stessa riga. */
export function unisciFrammentiTesto(frammenti: FrammentoTesto[]): RettangoloTesto[] {
  const flussi = new Map<number, FrammentoTesto[]>();
  for (const r of frammenti) {
    if (![r.x, r.y, r.w, r.h].every(Number.isFinite) || r.w <= .5 || r.h <= 1) continue;
    const presenti = flussi.get(r.flusso) ?? []; presenti.push(r); flussi.set(r.flusso, presenti);
  }
  const rettangoli: RettangoloTesto[] = [];
  for (const pezzi of flussi.values()) {
    const righe: { y: number; h: number; pezzi: RettangoloTesto[] }[] = [];
    for (const r of [...pezzi].sort((a, b) => a.y - b.y || a.x - b.x)) {
      const riga = righe.find((l) => Math.min(l.y + l.h, r.y + r.h) - Math.max(l.y, r.y) >= Math.min(l.h, r.h) * .55
        && Math.abs(l.y + l.h - r.y - r.h) <= Math.max(l.h, r.h) * .35);
      if (riga) riga.pezzi.push(r); else righe.push({ y: r.y, h: r.h, pezzi: [r] });
    }
    for (const riga of righe) {
      let ultimo: RettangoloTesto | undefined;
      for (const r of riga.pezzi.sort((a, b) => a.x - b.x)) {
        const tolleranza = ultimo ? Math.min(6, Math.max(1.5, Math.min(ultimo.h, r.h) * .28)) : 0;
        if (ultimo && r.x <= ultimo.x + ultimo.w + tolleranza) {
          const destra = Math.max(ultimo.x + ultimo.w, r.x + r.w), fondo = Math.max(ultimo.y + ultimo.h, r.y + r.h);
          ultimo.y = Math.min(ultimo.y, r.y); ultimo.w = destra - ultimo.x; ultimo.h = fondo - ultimo.y;
        } else { ultimo = { x: r.x, y: r.y, w: r.w, h: r.h }; rettangoli.push(ultimo); }
      }
    }
  }
  return rettangoli;
}

/** I Range in ingresso sono già limitati a singoli nodi di testo: mai box di p/div. */
export function rettangoliRangeTesto(ranges: Range[], articolo: HTMLElement): RettangoloTesto[] {
  const bounds = articolo.getBoundingClientRect(), flussi = new Map<Element, number>(), frammenti: FrammentoTesto[] = [];
  for (const range of ranges) {
    const padre = range.startContainer.parentElement;
    const flusso = padre?.closest('p,li,td,th,h1,h2,h3,h4,h5,h6,blockquote,pre') ?? padre;
    if (!flusso || !articolo.contains(range.startContainer)) continue;
    if (!flussi.has(flusso)) flussi.set(flusso, flussi.size);
    for (const r of Array.from(range.getClientRects())) {
      if (r.width > .5 && r.height > 1) frammenti.push({ x: r.left - bounds.left, y: r.top - bounds.top, w: r.width, h: r.height, flusso: flussi.get(flusso)! });
    }
  }
  return unisciFrammentiTesto(frammenti);
}

export interface SelezioneTesto {
  ancore: AncoraTesto[]; testo: string; pagina: number; rects: RettangoloTesto[]; ranges: Range[];
}

/** Range e textContent usano entrambi offset UTF-16, anche attraversando link e grassetti. */
export function catturaAncoreTesto(articolo: HTMLElement, edizione: number, opzioni: { geometria?: boolean } = {}): SelezioneTesto | null {
  const selezione = window.getSelection();
  if (!selezione || selezione.isCollapsed || !selezione.rangeCount) return null;
  const range = selezione.getRangeAt(0);
  if (!articolo.contains(range.startContainer) || !articolo.contains(range.endContainer)) return null;
  const ancore: AncoraTesto[] = [], ranges: Range[] = []; let pagina = 1;
  for (const el of articolo.querySelectorAll<HTMLElement>('[data-lettura-block]')) {
    if (!range.intersectsNode(el)) continue;
    const raw = el.textContent ?? '', nodi: { nodo: Text; offset: number; inizio: number; fine: number }[] = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let nodo: Node | null, offset = 0;
    while ((nodo = walker.nextNode())) {
      const text = nodo as Text, lunghezza = text.data.length;
      if (lunghezza && range.intersectsNode(text) && range.comparePoint(text, lunghezza) >= 0 && range.comparePoint(text, 0) <= 0) {
        const inizio = range.startContainer === text ? range.startOffset : 0;
        const fine = range.endContainer === text ? range.endOffset : lunghezza;
        if (fine > inizio) nodi.push({ nodo: text, offset, inizio, fine });
      }
      offset += lunghezza;
    }
    if (!nodi.length) continue;
    let inizio = nodi[0].offset + nodi[0].inizio, fine = nodi[nodi.length - 1].offset + nodi[nodi.length - 1].fine;
    while (inizio < fine && /\s/.test(raw[inizio])) inizio++;
    while (fine > inizio && /\s/.test(raw[fine - 1])) fine--;
    if (fine <= inizio) continue;
    if (!ancore.length) pagina = Number(el.dataset.pagina) || 1;
    ancore.push({ edizione, blocco: el.dataset.letturaBlock!, inizio, fine, citazione: raw.slice(inizio, fine),
      prefisso: raw.slice(Math.max(0, inizio - 60), inizio), suffisso: raw.slice(fine, fine + 60) });
    for (const n of nodi) {
      const a = Math.max(n.inizio, inizio - n.offset), b = Math.min(n.fine, fine - n.offset);
      if (b <= a || !n.nodo.data.slice(a, b).trim()) continue;
      const parte = document.createRange(); parte.setStart(n.nodo, a); parte.setEnd(n.nodo, b); ranges.push(parte);
    }
  }
  const testo = ancore.map((a) => a.citazione).join('\n');
  if (!ancore.length || testo.length > 10000) return null;
  const rects = opzioni.geometria === false ? [] : rettangoliRangeTesto(ranges, articolo);
  return { ancore, testo, pagina, rects, ranges };
}

const NOME_ANTEPRIMA = 'iuris-lettura-bozza';
type RegistroHighlight = { set: (nome: string, highlight: unknown) => unknown; get: (nome: string) => unknown; delete: (nome: string) => unknown };
/** Anteprima nativa quando disponibile; il chiamante conserva il fallback geometrico. */
export function creaAnteprimaTestoNativa() {
  const css = window.CSS as typeof CSS & { highlights?: RegistroHighlight };
  const NativeHighlight = (window as unknown as { Highlight?: new (...ranges: Range[]) => unknown }).Highlight;
  const registro = css?.highlights;
  const disponibile = !!registro && typeof NativeHighlight === 'function';
  let attuale: unknown;
  return {
    disponibile,
    mostra(ranges: Range[]): boolean {
      if (!disponibile || !ranges.length) return false;
      try { const nuovo = new NativeHighlight!(...ranges); registro!.set(NOME_ANTEPRIMA, nuovo); attuale = nuovo; return true; }
      catch { if (attuale && registro?.get(NOME_ANTEPRIMA) === attuale) registro.delete(NOME_ANTEPRIMA); attuale = undefined; return false; }
    },
    cancella() { if (attuale && registro?.get(NOME_ANTEPRIMA) === attuale) registro.delete(NOME_ANTEPRIMA); attuale = undefined; },
  };
}

export function linkTesto(documento: string, sezione?: string, blocco?: string, segno?: string): string {
  const params = new URLSearchParams({ doc: documento, modo: 'testo' });
  if (sezione) params.set('sezione', sezione);
  if (blocco) params.set('blocco', blocco);
  if (segno) params.set('segno', segno);
  return `#/originali?${params}`;
}
/** Sezione di una pagina o, se noto, del blocco: una pagina può essere divisa fra due sezioni (vedi «primo»). */
export function sezionePerPagina(doc: DocumentoLettura, pagina: number, blocco?: string) {
  const candidate = sezioniPerPagina(doc, pagina);
  if (candidate.length < 2) return candidate[0];
  const chiave = blocco && /^p\d{3}-b\d{3}$/.test(blocco) ? blocco : `p${String(pagina).padStart(3, '0')}-b999`;
  return candidate.filter((s, i) => i === 0 || (s.primo ?? '') <= chiave).pop();
}
export function sezioniPerPagina(doc: DocumentoLettura, pagina: number) { return doc.sezioni.filter((s) => s.da <= pagina && s.a >= pagina); }
export function paginaBlocco(id: string): number | null { const match = /^(?:manuale-[a-z0-9-]+-)?p(\d+)-/.exec(id); return match ? Number(match[1]) : null; }
