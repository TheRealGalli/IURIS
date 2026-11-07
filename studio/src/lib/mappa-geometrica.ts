// Mappa personale costruita sulla geometria del testo: titoli, paragrafi, elenchi.
// La forma è sempre quella del documento; compaiono solo le parti segnate (e i loro antenati).
import type { ColoreSegno } from './originali';

export type TipoUnita = 'titolo' | 'paragrafo' | 'voce';
/** Un'unità strutturale del testo reso: offset nel textContent del blocco, come le ancore dei segni. */
export interface UnitaTesto {
  id: string; blocco: string; pagina: number; tipo: TipoUnita;
  /** Livello del titolo (1–6) o profondità della voce d'elenco (1, 2, …). */
  livello: number; inizio: number; fine: number; testo: string;
  /** «1.», «2.» per gli elenchi numerati. */
  numero?: string;
  /** Lunghezza dell'attacco in grassetto («Diritto romano come diritto storico:»), usato come contesto. */
  guida?: number;
}
export interface SegnoGeo {
  id: string; colore: ColoreSegno; tipo: 'evidenziato' | 'sottolineato'; creata?: string;
  ancore: { blocco: string; inizio: number; fine: number }[];
}
export type PezzoGeo =
  | { testo: string; segnato: true; colore?: ColoreSegno; linea?: ColoreSegno; enfasi: boolean }
  | { testo: string; segnato: false };
export interface NodoGeo {
  id: string; unita: UnitaTesto; segnato: boolean; enfasi: boolean;
  /** Il testo segnato, con il contesto minimo (attacco in grassetto, parole vicine) non segnato. */
  pezzi: PezzoGeo[];
  /** Segni che toccano il nodo, nell'ordine del testo. */
  segni: string[];
  figli: NodoGeo[];
}

/** Legge la struttura dal blocco già reso (lo stesso HTML del lettore). Solo nel browser. */
export function strutturaBlocco(b: { id: string; pagina: number; html: string }, doc: Document = document): UnitaTesto[] {
  const root = doc.createElement('div'); root.innerHTML = b.html;
  const inizi = new Map<Node, number>(); let off = 0;
  const walk = doc.createTreeWalker(root, 4 /* SHOW_TEXT */); let t: Node | null;
  while ((t = walk.nextNode())) { inizi.set(t, off); off += t.textContent?.length ?? 0; }
  const tutto = root.textContent ?? '';
  const intervallo = (el: Node, escludi?: (n: Node) => boolean): [number, number] | null => {
    if (el.nodeType === 3) { const a = inizi.get(el)!; return [a, a + (el.textContent?.length ?? 0)]; }
    const w = doc.createTreeWalker(el, 4); let a = -1, z = -1, n: Node | null;
    while ((n = w.nextNode())) { if (escludi?.(n)) continue; const s = inizi.get(n)!; if (a < 0) a = s; z = s + (n.textContent?.length ?? 0); }
    return a < 0 ? null : [a, z];
  };
  const out: UnitaTesto[] = [];
  const aggiungi = (tipo: TipoUnita, livello: number, el: Node, escludi?: (n: Node) => boolean, numero?: string) => {
    const r = intervallo(el, escludi); if (!r) return;
    let [a, z] = r; const grezzo = tutto.slice(a, z);
    a += grezzo.length - grezzo.trimStart().length; z -= grezzo.length - grezzo.trimEnd().length;
    if (z <= a) return;
    let guida: number | undefined;
    const primo = el.nodeType === 1 ? (el as Element).firstElementChild : null;
    const testoPrimo = primo && /^(STRONG|B)$/.test(primo.tagName) ? (primo.textContent ?? '').trim() : '';
    if (testoPrimo && tutto.slice(a, z).startsWith(testoPrimo) && testoPrimo.length < z - a) guida = testoPrimo.length;
    out.push({ id: `${b.id}#${out.length}`, blocco: b.id, pagina: b.pagina, tipo, livello, inizio: a, fine: z, testo: tutto.slice(a, z),
      ...(numero ? { numero } : {}), ...(guida ? { guida } : {}) });
  };
  const lista = (l: Element, profondita: number) => {
    let i = Number(l.getAttribute('start') ?? 1) || 1;
    for (const li of Array.from(l.children)) {
      if (li.tagName !== 'LI') continue;
      const annidate = Array.from(li.children).filter((c) => c.tagName === 'OL' || c.tagName === 'UL');
      aggiungi('voce', profondita, li, annidate.length ? (n: Node) => annidate.some((x) => x.contains(n)) : undefined, l.tagName === 'OL' ? `${i}.` : undefined);
      i++;
      for (const sub of annidate) lista(sub, profondita + 1);
    }
  };
  for (const el of Array.from(root.childNodes)) {
    if (el.nodeType === 3) { if (el.textContent?.trim()) aggiungi('paragrafo', 0, el); continue; }
    if (el.nodeType !== 1) continue;
    const tag = (el as Element).tagName;
    if (/^H[1-6]$/.test(tag)) aggiungi('titolo', Number(tag[1]), el);
    else if (tag === 'OL' || tag === 'UL') lista(el as Element, 1);
    else if (tag !== 'HR') aggiungi('paragrafo', 0, el);
  }
  if (!out.length && tutto.trim()) out.push({ id: `${b.id}#0`, blocco: b.id, pagina: b.pagina, tipo: 'paragrafo', livello: 0, inizio: 0, fine: tutto.length, testo: tutto });
  return out;
}

// Titoli per livello; i paragrafi sotto il titolo; le voci d'elenco sotto il paragrafo che le introduce.
const rango = (u: UnitaTesto) => u.tipo === 'titolo' ? u.livello : u.tipo === 'paragrafo' ? 10 : 20 + u.livello;
const PAROLE_CONTESTO = 4, SPAZIO_BREVE = 24;

function pezzi(u: UnitaTesto, coperture: { da: number; a: number; segno: SegnoGeo }[]): { pezzi: PezzoGeo[]; enfasi: boolean } {
  const testo = u.testo, base = u.inizio;
  const limiti = [...new Set([0, testo.length, ...coperture.flatMap((c) => [c.da - base, c.a - base])])].sort((x, y) => x - y);
  const segmenti: PezzoGeo[] = [];
  let enfasi = false;
  for (let k = 0; k < limiti.length - 1; k++) {
    const x = limiti[k], y = limiti[k + 1]; if (x === y) continue;
    const attivi = coperture.filter((c) => c.da - base < y && c.a - base > x);
    const pezzo = testo.slice(x, y);
    if (!attivi.length) { segmenti.push({ testo: pezzo, segnato: false }); continue; }
    const ev = attivi.filter((c) => c.segno.tipo === 'evidenziato'), so = attivi.filter((c) => c.segno.tipo === 'sottolineato');
    const e = ev.length > 0 && so.length > 0; enfasi ||= e;
    segmenti.push({ testo: pezzo, segnato: true, enfasi: e, ...(ev.length ? { colore: ev[ev.length - 1].segno.colore } : {}), ...(so.length ? { linea: so[so.length - 1].segno.colore } : {}) });
  }
  // Contesto minimo: attacco in grassetto o poche parole prima; i tratti lunghi non segnati diventano «…».
  const primo = segmenti.findIndex((s) => s.segnato), ultimo = segmenti.length - 1 - [...segmenti].reverse().findIndex((s) => s.segnato);
  const out: PezzoGeo[] = [];
  const inizioSegnato = segmenti.slice(0, primo).reduce((n, s) => n + s.testo.length, 0);
  if (inizioSegnato > 0) {
    const prima = testo.slice(0, inizioSegnato);
    if (u.guida && inizioSegnato >= u.guida) out.push({ testo: testo.slice(0, u.guida) + (inizioSegnato - u.guida > SPAZIO_BREVE ? ' … ' : testo.slice(u.guida, inizioSegnato)), segnato: false });
    else if (prima.length <= SPAZIO_BREVE) out.push({ testo: prima, segnato: false });
    else { const parole = prima.trimEnd().split(/\s+/).slice(-PAROLE_CONTESTO).join(' '); out.push({ testo: `… ${parole}${/\s$/.test(prima) ? ' ' : ''}`, segnato: false }); }
  }
  for (let k = primo; k <= ultimo; k++) {
    const s = segmenti[k];
    out.push(!s.segnato && s.testo.length > SPAZIO_BREVE ? { testo: ' … ', segnato: false } : s);
  }
  const dopo = segmenti.slice(ultimo + 1).map((s) => s.testo).join('');
  if (dopo) out.push({ testo: dopo.length <= SPAZIO_BREVE ? dopo : ' …', segnato: false });
  return { pezzi: out, enfasi };
}

/**
 * Albero di una sezione: `unita` nell'ordine del testo, `segni` già proiettati sui blocchi della sezione.
 * Restano solo i nodi segnati e i loro antenati; stesso input, stesso albero.
 */
export function alberoGeometrico(unita: UnitaTesto[], segni: SegnoGeo[]): { radici: NodoGeo[]; segnati: number; segni: number } {
  const perBlocco = new Map<string, UnitaTesto[]>();
  for (const u of unita) { const l = perBlocco.get(u.blocco) ?? []; l.push(u); perBlocco.set(u.blocco, l); }
  const ordinati = [...segni].sort((a, b) => (a.creata ?? '').localeCompare(b.creata ?? ''));
  const coperture = new Map<string, { da: number; a: number; segno: SegnoGeo }[]>();
  const toccati = new Set<string>();
  for (const s of ordinati) for (const a of s.ancore) for (const u of perBlocco.get(a.blocco) ?? []) {
    const da = Math.max(a.inizio, u.inizio), z = Math.min(a.fine, u.fine);
    if (z <= da) continue;
    const l = coperture.get(u.id) ?? []; l.push({ da, a: z, segno: s }); coperture.set(u.id, l); toccati.add(s.id);
  }
  const radici: NodoGeo[] = [], pila: { nodo: NodoGeo; r: number }[] = [];
  for (const u of unita) {
    const r = rango(u);
    while (pila.length && pila[pila.length - 1].r >= r) pila.pop();
    const cop = coperture.get(u.id);
    const { pezzi: p, enfasi } = cop ? pezzi(u, cop) : { pezzi: [] as PezzoGeo[], enfasi: false };
    const segniNodo = cop ? [...new Map([...cop].sort((x, y) => x.da - y.da).map((c) => [c.segno.id, c.segno.id])).keys()] : [];
    const nodo: NodoGeo = { id: u.id, unita: u, segnato: !!cop, enfasi, pezzi: p, segni: segniNodo, figli: [] };
    (pila.length ? pila[pila.length - 1].nodo.figli : radici).push(nodo);
    pila.push({ nodo, r });
  }
  let segnati = 0;
  const pota = (n: NodoGeo): NodoGeo | null => {
    n.figli = n.figli.map(pota).filter((x): x is NodoGeo => !!x);
    if (n.segnato) segnati++;
    return n.segnato || n.figli.length ? n : null;
  };
  return { radici: radici.map(pota).filter((x): x is NodoGeo => !!x), segnati, segni: toccati.size };
}

/** Primo segno del nodo o, per un antenato non segnato, del primo discendente segnato: per tornare al testo. */
export function primoSegno(n: NodoGeo): string | undefined {
  return n.segni[0] ?? n.figli.map(primoSegno).find(Boolean);
}
