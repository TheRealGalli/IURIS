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

// ── Significato sopra la geometria: i concetti del glossario nominati dai nodi e i loro legami ──
export interface ConcettoGeo { id: string; nome: string; etichette: string[] }
export interface RelazioneGeo {
  da: string; a: string; tipo: string; etichetta?: string;
  /** Confermata da una domanda che unisce i due concetti o, se specifica, dai concetti della lezione. Assente = sì. */
  affidabile?: boolean;
}
export interface ArcoConcetto {
  da: string; a: string;
  /** Stesso concetto in due punti lontani dell'albero, oppure una relazione del glossario fra due concetti. */
  tipo: 'stesso' | 'relazione';
  concetto: string; altro?: string; etichetta?: string;
}
export interface SemanticaGeo {
  perNodo: Map<string, string[]>; archi: ArcoConcetto[]; concetti: string[]; nomi: Record<string, string>;
  /** Legami possibili scartati perché dubbi: relazioni non confermate, ripetizioni di concetti troppo generici. */
  scartati: { relazioni: number; ripetizioni: number };
}

/** Etichette usabili come le usa la pubblicazione: nome, latino, alias; senza parentesi, almeno 4 lettere. */
export function etichetteConcetto(c: { nome: string; latino?: string; alias?: string[] }): string[] {
  const tutte = [c.nome, c.latino, ...(c.alias ?? [])].filter((x): x is string => typeof x === 'string');
  return [...new Set(tutte.map((x) => x.replace(/\s*\([^)]*\)\s*/g, ' ').trim()).filter((x) => x.length >= 4 && !/[«»"*[\]|]/.test(x)))];
}
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const PRIORITA: Record<string, number> = { 'parte-di': 0, 'esempio-di': 1, contrasta: 2, supera: 3, 'evolve-in': 3, crea: 4, interpreta: 4, causa: 4, influenza: 5, testimonia: 5, collegato: 7 };
export const MAX_ARCHI = 9;

/**
 * Collega i nodi che nominano lo stesso concetto (se l'albero non li unisce già) e quelli i cui concetti
 * sono legati nel glossario («Fonti primarie» → è una categoria delle → «Fonti di cognizione»).
 * Pochi archi per lezione: prima le relazioni gerarchiche, poi le ripetizioni, poi i semplici collegamenti.
 */
export function semanticaGeometrica(radici: NodoGeo[], concetti: ConcettoGeo[], relazioni: RelazioneGeo[], max = MAX_ARCHI): SemanticaGeo {
  const nodi: { n: NodoGeo; antenati: Set<string> }[] = [];
  const visita = (n: NodoGeo, antenati: string[]) => { nodi.push({ n, antenati: new Set(antenati) }); n.figli.forEach((f) => visita(f, [...antenati, n.id])); };
  radici.forEach((r) => visita(r, []));
  const parentela = (a: string, b: string) => nodi.find((x) => x.n.id === a)!.antenati.has(b) || nodi.find((x) => x.n.id === b)!.antenati.has(a);
  // Concetti nominati da ogni nodo, con la posizione: chi comincia col concetto lo «definisce».
  const nomina = new Map<string, Map<string, number>>(), lunghezza = new Map<string, number>();
  const regole = concetti.map((c) => ({ c, re: new RegExp(`(?<![\\p{L}\\p{N}])(?:${c.etichette.map(esc).sort((x, y) => y.length - x.length).join('|')})(?![\\p{L}\\p{N}])`, 'iu') })).filter((r) => r.c.etichette.length);
  for (const { n } of nodi) {
    const m = new Map<string, number>();
    for (const { c, re } of regole) { const x = re.exec(n.unita.testo); if (x) { m.set(c.id, x.index); lunghezza.set(`${n.id}|${c.id}`, x[0].length); } }
    nomina.set(n.id, m);
  }
  const conConcetto = (id: string) => nodi.filter(({ n }) => nomina.get(n.id)!.has(id)).map(({ n }) => n);
  // Il nodo di riferimento di un concetto: un titolo o una voce che comincia col concetto, altrimenti la prima occorrenza.
  const riferimento = (id: string, escludi: string) => {
    const tutti = conConcetto(id).filter((n) => n.id !== escludi && !parentela(n.id, escludi));
    return tutti.find((n) => nomina.get(n.id)!.get(id)! <= 3) ?? tutti[0];
  };
  const candidati: (ArcoConcetto & { p: number; ordine: number })[] = [];
  const ordine = new Map(nodi.map(({ n }, i) => [n.id, i]));
  const coppia = (a: string, b: string) => ordine.get(a)! < ordine.get(b)! ? [a, b] : [b, a];
  const scartati = { relazioni: 0, ripetizioni: 0 };
  // Ripetizioni affidabili: concetto specifico (non in mezza lezione) e nominato per esteso, non con una sigla corta.
  const tetto = Math.min(6, Math.max(2, Math.ceil(nodi.length * 0.35)));
  for (const c of concetti) {
    const lista = conConcetto(c.id).filter((n) => (lunghezza.get(`${n.id}|${c.id}`) ?? 0) >= 6);
    if (lista.length > tetto) { scartati.ripetizioni += lista.length - 1; continue; }
    for (let i = 1; i < lista.length; i++) {
      const prec = lista.slice(0, i).reverse().find((p) => !parentela(p.id, lista[i].id));
      if (prec) { const [da, a] = coppia(prec.id, lista[i].id); candidati.push({ da, a, tipo: 'stesso', concetto: c.id, p: 6, ordine: ordine.get(lista[i].id)! }); }
    }
  }
  const presenti = new Set(concetti.map((c) => c.id));
  // Una relazione, un arco: dal punto in cui il concetto è definito (o nominato per primo) a quello dell'altro.
  for (const r of relazioni) {
    if (!presenti.has(r.da) || !presenti.has(r.a) || r.da === r.a) continue;
    const lista = conConcetto(r.da);
    if (r.affidabile === false) { if (lista.length && conConcetto(r.a).length) scartati.relazioni++; continue; }
    const da = lista.find((n) => nomina.get(n.id)!.get(r.da)! <= 3 && riferimento(r.a, n.id)) ?? lista.find((n) => riferimento(r.a, n.id));
    const verso = da && riferimento(r.a, da.id);
    if (!da || !verso || verso.id === da.id) continue;
    candidati.push({ da: da.id, a: verso.id, tipo: 'relazione', concetto: r.da, altro: r.a, etichetta: r.etichetta, p: PRIORITA[r.tipo] ?? 6, ordine: ordine.get(da.id)! });
  }
  candidati.sort((x, y) => x.p - y.p || x.ordine - y.ordine);
  const archi: ArcoConcetto[] = [], viste = new Set<string>();
  const perConcetto = new Map<string, number>();
  for (const { p: _p, ordine: _o, ...a } of candidati) {
    const k = coppia(a.da, a.a).join('|');
    if (viste.has(k)) continue;
    // Non più di due ripetizioni dello stesso concetto: il resto lo dicono le etichette.
    if (a.tipo === 'stesso') { const q = perConcetto.get(a.concetto) ?? 0; if (q >= 2) continue; perConcetto.set(a.concetto, q + 1); }
    viste.add(k); archi.push(a);
    if (archi.length >= max) break;
  }
  const perNodo = new Map<string, string[]>();
  const aggiungi = (nodo: string, c: string) => { const l = perNodo.get(nodo) ?? []; if (!l.includes(c)) l.push(c); perNodo.set(nodo, l); };
  for (const a of archi) {
    if (a.tipo === 'stesso') { aggiungi(a.da, a.concetto); aggiungi(a.a, a.concetto); }
    else { aggiungi(a.da, a.concetto); aggiungi(a.a, a.altro!); }
  }
  const usati = [...new Set(archi.flatMap((a) => [a.concetto, ...(a.altro ? [a.altro] : [])]))];
  const nomi = Object.fromEntries(concetti.filter((c) => usati.includes(c.id)).map((c) => [c.id, c.nome]));
  return { perNodo, archi, concetti: usati, nomi, scartati };
}

// ── Instradamento: una porta per arco sul bordo del nodo, una corsia per arco nel margine ──
export interface PercorsoArco { corsia: number; portaDa: [number, number]; portaA: [number, number] }
/**
 * Corsie: un arco che ne contiene un altro corre più fuori; archi che si sovrappongono non condividono la corsia.
 * Porte: sul bordo destro di ogni nodo, gli archi che salgono in alto (corsie interne prima), quelli che scendono
 * in basso (corsie esterne prima): così le linee orizzontali non tagliano quelle verticali vicine.
 */
export function corsieArchi(archi: { da: string; a: string }[], ordine: Map<string, number>): { percorsi: PercorsoArco[]; corsie: number } {
  const iv = archi.map((x, i) => { const p = ordine.get(x.da) ?? 0, q = ordine.get(x.a) ?? 0; return { i, lo: Math.min(p, q), hi: Math.max(p, q) }; });
  const corsia = new Array<number>(archi.length).fill(0), posti: typeof iv = [];
  for (const x of [...iv].sort((a, b) => (a.hi - a.lo) - (b.hi - b.lo) || a.lo - b.lo)) {
    const sotto = posti.filter((y) => y.lo <= x.hi && x.lo <= y.hi);
    corsia[x.i] = sotto.length ? Math.max(...sotto.map((y) => corsia[y.i])) + 1 : 0;
    posti.push(x);
  }
  const porte = new Map<string, { i: number; lato: 'da' | 'a'; altro: number; corsia: number }[]>();
  archi.forEach((x, i) => {
    for (const lato of ['da', 'a'] as const) {
      const qui = lato === 'da' ? x.da : x.a, la = lato === 'da' ? x.a : x.da;
      const l = porte.get(qui) ?? []; l.push({ i, lato, altro: ordine.get(la) ?? 0, corsia: corsia[i] }); porte.set(qui, l);
    }
  });
  const percorsi: PercorsoArco[] = archi.map(() => ({ corsia: 0, portaDa: [0, 1], portaA: [0, 1] }));
  for (const [nodo, l] of porte) {
    const mio = ordine.get(nodo) ?? 0;
    const su = l.filter((p) => p.altro < mio).sort((a, b) => a.corsia - b.corsia || a.altro - b.altro);
    const giu = l.filter((p) => p.altro >= mio).sort((a, b) => b.corsia - a.corsia || a.altro - b.altro);
    [...su, ...giu].forEach((p, k, tutti) => { percorsi[p.i][p.lato === 'da' ? 'portaDa' : 'portaA'] = [k, tutti.length]; });
  }
  archi.forEach((_, i) => { percorsi[i].corsia = corsia[i]; });
  return { percorsi, corsie: archi.length ? Math.max(...corsia) + 1 : 0 };
}

/** Cosa si accende passando sopra un arco, un nodo o un concetto: il resto si attenua. */
export type FuocoGeo = { arco: number } | { nodo: string } | { nodo: string; concetto: string } | null;
export function accensione(archi: ArcoConcetto[], f: FuocoGeo): { archi: Set<number>; centro?: string; collegati: Set<string>; concetti: Set<string> } | null {
  if (!f) return null;
  const tocca = (a: ArcoConcetto, c: string) => a.concetto === c || a.altro === c;
  const accesi = new Set(archi.flatMap((a, i) => ('arco' in f ? i === f.arco : 'concetto' in f ? tocca(a, f.concetto) : a.da === f.nodo || a.a === f.nodo) ? [i] : []));
  const centro = 'arco' in f ? archi[f.arco]?.da : f.nodo;
  const collegati = new Set([...accesi].flatMap((i) => [archi[i].da, archi[i].a]).filter((x) => x !== centro));
  const concetti = new Set([...accesi].flatMap((i) => [archi[i].concetto, ...(archi[i].altro ? [archi[i].altro!] : [])]));
  return { archi: accesi, centro, collegati, concetti };
}

/* ───────── vista con zoom: inquadrature e coordinate ───────── */

export interface Inquadratura { k: number; x: number; y: number }
/**
 * `tutto`: la mappa intera entra nella finestra (mai oltre il 100%).
 * `larghezza`: entra la larghezza, si parte dall'alto; il resto si raggiunge trascinando o con la rotella.
 */
export function inquadra(c: { w: number; h: number }, f: { w: number; h: number }, modo: 'tutto' | 'larghezza', pad = 12, minK = 0.2): Inquadratura {
  // il disegno ha già i suoi margini: se entra in larghezza resta al 100%, senza rimpicciolire il testo
  const kw = c.w <= f.w ? 1 : (f.w - pad * 2) / Math.max(1, c.w), kh = (f.h - pad * 2) / Math.max(1, c.h);
  const k = Math.max(minK, Math.min(1, kw, modo === 'tutto' ? kh : Infinity));
  const y = modo === 'tutto' ? Math.max(0, (f.h - c.h * k) / 2) : (k === 1 ? 0 : pad);
  return { k, x: (f.w - c.w * k) / 2, y };
}
/** Altezza della finestra: quanto serve alla mappa adattata in larghezza, fra un minimo e un massimo. */
export const altezzaVista = (c: { w: number; h: number }, larghezza: number, massimo: number, minimo = 160, pad = 12): number => {
  const k = c.w <= larghezza ? 1 : (larghezza - pad * 2) / Math.max(1, c.w);
  return Math.round(Math.max(minimo, Math.min(massimo, c.h * k + pad * 2)));
};
/** Da coordinate dello schermo a coordinate del disegno, anche quando è ingrandito o rimpicciolito. */
export const inLocale = (r: { left: number; top: number; right: number; bottom: number }, base: { left: number; top: number }, k: number) =>
  ({ l: (r.left - base.left) / k, t: (r.top - base.top) / k, r: (r.right - base.left) / k, b: (r.bottom - base.top) / k });
/** Righe di un arco: orizzontale dalla porta, curva, verticale nella corsia, curva, orizzontale fino alla porta d'arrivo. */
export function tracciaArco(x1: number, y1: number, x2: number, y2: number, xl: number): string {
  const su = y2 < y1 ? -1 : 1, rr = Math.min(12, Math.abs(y2 - y1) / 2);
  return `M${x1},${y1} H${xl - rr} Q${xl},${y1} ${xl},${y1 + su * rr} V${y2 - su * rr} Q${xl},${y2} ${xl - rr},${y2} H${x2 + 1}`;
}
