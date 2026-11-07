import { createContext, memo, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import { Icon } from '../components/ui';
import { useCorso } from '../lib/data';
import { cronologiaSegni, originaliMateria, paginaValida, type DocumentoOriginale, type RettangoloSegno, type SegnoOriginale } from '../lib/originali';
import { aggiungiSegnoOriginale, annullaSegnoOriginale, ripristinaSegnoOriginale, rimuoviSegnoOriginale, salvaPaginaOriginale, useProgresso } from '../lib/store';
import { href } from '../lib/router';
import { aggiornaPianoRender, avviaPagina, ordinePagine, paginaPronta, pixelRatioPagina, type PianoRender } from '../lib/originali-render';
import './Originali.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
const PDF_OPTIONS = {
  cMapUrl: `${import.meta.env.BASE_URL}pdfjs/cmaps/`, cMapPacked: true,
  standardFontDataUrl: `${import.meta.env.BASE_URL}pdfjs/standard_fonts/`,
  wasmUrl: `${import.meta.env.BASE_URL}pdfjs/wasm/`, disableRange: true,
};
const NESSUN_SEGNO: SegnoOriginale[] = [];
const COLORI = ['giallo', 'verde', 'rosa'] as const;
type Selezione = Pick<SegnoOriginale, 'pagina' | 'testo' | 'rettangoli'>;
type Ancora = { pagina: number; frazione: number };

/** Unisce i rettangoli degli span sulla stessa riga, evitando segni duplicati. */
function rettangoliSelezione(range: Range, bounds: DOMRect): RettangoloSegno[] {
  const rettangoli = Array.from(range.getClientRects()).map((r) => {
    const left = Math.max(bounds.left, r.left), top = Math.max(bounds.top, r.top);
    const right = Math.min(bounds.right, r.right), bottom = Math.min(bounds.bottom, r.bottom);
    return { x: (left - bounds.left) / bounds.width, y: (top - bounds.top) / bounds.height, w: (right - left) / bounds.width, h: (bottom - top) / bounds.height };
  }).filter((r) => r.w * bounds.width > .5 && r.h * bounds.height > 1)
    .sort((a, b) => Math.abs(a.y - b.y) < Math.min(a.h, b.h) * .35 ? a.x - b.x : a.y - b.y);
  const unite: RettangoloSegno[] = [];
  for (const r of rettangoli) {
    const ultimo = unite[unite.length - 1];
    if (ultimo && Math.abs(ultimo.y - r.y) < Math.min(ultimo.h, r.h) * .35 && r.x <= ultimo.x + ultimo.w + .004) {
      const right = Math.max(ultimo.x + ultimo.w, r.x + r.w), bottom = Math.max(ultimo.y + ultimo.h, r.y + r.h);
      ultimo.x = Math.min(ultimo.x, r.x); ultimo.y = Math.min(ultimo.y, r.y);
      ultimo.w = right - ultimo.x; ultimo.h = bottom - ultimo.y;
    } else unite.push({ ...r });
  }
  return unite;
}
function elementoDi(nodo: Node): Element | null { return nodo.nodeType === Node.ELEMENT_NODE ? nodo as Element : nodo.parentElement; }

type AnnotazioniPagina = {
  perPagina: Map<number, SegnoOriginale[]>; bozza: Selezione | null;
  tipo: SegnoOriginale['tipo']; colore: SegnoOriginale['colore'];
};
const AnnotazioniContext = createContext<AnnotazioniPagina | null>(null);

// Solo questo strato riceve gli aggiornamenti della selezione e dei segni.
function SegniPagina({ numero }: { numero: number }) {
  const dati = useContext(AnnotazioniContext)!;
  const { tipo, colore } = dati, segni = dati.perPagina.get(numero) ?? NESSUN_SEGNO;
  const bozza = dati.bozza?.pagina === numero ? dati.bozza : null;
  const rettangolo = (r: RettangoloSegno, key: string, cls: string) => <span key={key} className={`originali-segno ${cls}`}
    style={{ left: `${r.x * 100}%`, top: `${r.y * 100}%`, width: `${r.w * 100}%`, height: `${r.h * 100}%` }} />;
  return <div className="originali-segni-pagina" aria-hidden="true">
    {segni.map((s) => s.rettangoli.map((r, k) => rettangolo(r, `${s.id}-${k}`, `${s.tipo} ${s.colore}`)))}
    {bozza?.rettangoli.map((r, k) => rettangolo(r, `bozza-${k}`, `originali-bozza ${tipo} ${colore}`))}
  </div>;
}

type PropsPagina = {
  numero: number; larghezza: number; rapporto: number; attiva: boolean; file: string;
  registra: (numero: number, elemento: HTMLDivElement | null) => void;
  misura: (numero: number, rapporto: number) => void;
  pronta: (numero: number, larghezza: number) => void;
};
const ContenutoPagina = memo(function ContenutoPagina({ numero, larghezza, rapporto, file, misura, pronta }: Omit<PropsPagina, 'attiva' | 'registra'>) {
  const montata = useRef(true);
  const versione = useRef({ larghezza, token: 0 });
  if (versione.current.larghezza !== larghezza) versione.current = { larghezza, token: versione.current.token + 1 };
  const token = versione.current.token;
  const stato = useRef({ token, canvas: false, testo: false, notificata: false });
  if (stato.current.token !== token) stato.current = { token, canvas: false, testo: false, notificata: false };
  useLayoutEffect(() => { montata.current = true; return () => { montata.current = false; }; }, []);
  const completa = useCallback((strato: 'canvas' | 'testo') => {
    const corrente = stato.current;
    if (!montata.current || corrente.token !== token) return;
    corrente[strato] = true;
    if (corrente.canvas && corrente.testo && !corrente.notificata) {
      corrente.notificata = true; pronta(numero, larghezza);
    }
  }, [numero, larghezza, pronta, token]);
  const canvasPronto = useCallback(() => completa('canvas'), [completa]);
  const testoPronto = useCallback(() => completa('testo'), [completa]);
  const errore = useCallback(() => {
    if (montata.current && stato.current.token === token) pronta(numero, larghezza);
  }, [numero, larghezza, pronta, token]);
  const caricata = useCallback((page: PDFPageProxy) => {
    const v = page.getViewport({ scale: 1 }); misura(numero, v.height / v.width);
  }, [numero, misura]);
  return <Page pageNumber={numero} width={larghezza} renderTextLayer renderAnnotationLayer
    devicePixelRatio={pixelRatioPagina(larghezza, rapporto, window.devicePixelRatio || 1)}
    onLoadSuccess={caricata} onLoadError={errore} onRenderSuccess={canvasPronto} onRenderError={errore}
    onRenderTextLayerSuccess={testoPronto} onRenderTextLayerError={testoPronto} onGetTextError={testoPronto}
    loading={<div className="originali-stato-pagina" role="status">Caricamento pagina {numero}…</div>}
    error={<div className="originali-stato-pagina">Questa pagina non si è caricata. <a href={`${file}#page=${numero}`} target="_blank" rel="noopener noreferrer">Aprila nel PDF</a></div>} />;
});
const PaginaOriginale = memo(function PaginaOriginale({ numero, larghezza, rapporto, attiva, file, registra, misura, pronta }: PropsPagina) {
  const ref = useCallback((el: HTMLDivElement | null) => registra(numero, el), [numero, registra]);
  return <div className="originali-foglio" style={{ width: larghezza }}>
    <div ref={ref} className="originali-pagina" data-original-page={numero} style={{ width: larghezza, height: larghezza * rapporto }}>
      {attiva && <><ContenutoPagina numero={numero} larghezza={larghezza} rapporto={rapporto} file={file} misura={misura} pronta={pronta} /><SegniPagina numero={numero} /></>}
    </div><span className="originali-numero-pagina">Pagina {numero}</span>
  </div>;
});

type PropsDocumento = Omit<PropsPagina, 'numero' | 'attiva' | 'rapporto'> & {
  rapporto: number; rapporti: Record<number, number>; residenti: ReadonlySet<number>;
  pagine: number; caricato: boolean; errore: boolean;
  carica: (pdf: PDFDocumentProxy) => void; fallita: () => void; vai: (numero: number) => void;
};
// Le modifiche ai segni non cambiano nessuna prop di questo componente.
const DocumentoPagine = memo(function DocumentoPagine({ file, larghezza, rapporto, rapporti, residenti, pagine, caricato, errore, registra, misura, pronta, carica, fallita, vai }: PropsDocumento) {
  const collegamento = useCallback(({ pageNumber }: { pageNumber?: number }) => { if (pageNumber) vai(pageNumber); }, [vai]);
  return <Document file={file} options={PDF_OPTIONS} externalLinkTarget="_blank" externalLinkRel="noopener noreferrer"
    onLoadSuccess={carica} onLoadError={fallita} onItemClick={collegamento}
    loading={<div className="originali-stato-documento" role="status">Apertura degli appunti…</div>}
    error={<div className="originali-stato-documento"><Icon n="avviso" size={26} /><h2 className="title-m">Il documento non si è aperto</h2><p>Puoi riprovare ricaricando la pagina o consultare il PDF originale.</p><a className="btn" href={file} target="_blank" rel="noopener noreferrer">Apri PDF</a></div>}>
    {caricato && !errore && <div className="originali-pagine">{Array.from({ length: pagine }, (_, k) => k + 1).map((n) => <PaginaOriginale key={n} numero={n} larghezza={larghezza}
      rapporto={rapporti[n] ?? rapporto} attiva={residenti.has(n)} file={file} registra={registra} misura={misura} pronta={pronta} />)}</div>}
  </Document>;
});

function LettoreOriginale({ slug, doc, documenti, scegli }: {
  slug: string; doc: DocumentoOriginale; documenti: DocumentoOriginale[]; scegli: (id: string) => void;
}) {
  const p = useProgresso(slug), lettura = p.originali?.[doc.id];
  const segni = lettura?.segni ?? NESSUN_SEGNO;
  const iniziale = useRef(paginaValida(lettura?.pagina ?? 1, doc.pagine));
  const [pagina, setPagina] = useState(iniziale.current), paginaRef = useRef(iniziale.current);
  const [campoPagina, setCampoPagina] = useState(String(iniziale.current));
  const [pagine, setPagine] = useState(doc.pagine), [caricato, setCaricato] = useState(false);
  const [errorePdf, setErrorePdf] = useState(false);
  const [larghezzaFit, setLarghezzaFit] = useState(700);
  const [adattamento, setAdattamento] = useState<'pagina' | 'larghezza'>('larghezza');
  const [pannello, setPannello] = useState<'segni' | 'documento' | null>(null);
  const chiudiPannello = useRef<HTMLButtonElement>(null);
  const [rapporto, setRapporto] = useState(Math.SQRT2), [rapporti, setRapporti] = useState<Record<number, number>>({});
  const [bozza, setBozza] = useState<Selezione | null>(null), bozzaRef = useRef<Selezione | null>(null);
  const [selezionando, setSelezionando] = useState(false), gesto = useRef(false), paginaGesto = useRef<number | null>(null);
  const impostaBozza = useCallback((nuova: Selezione | null) => {
    const prima = bozzaRef.current;
    if (prima === nuova || (prima && nuova && prima.pagina === nuova.pagina && prima.testo === nuova.testo && JSON.stringify(prima.rettangoli) === JSON.stringify(nuova.rettangoli))) return;
    bozzaRef.current = nuova; setBozza(nuova);
  }, []);
  const [tipo, setTipo] = useState<SegnoOriginale['tipo']>('evidenziato');
  const [colore, setColore] = useState<SegnoOriginale['colore']>('giallo');
  const [messaggio, setMessaggio] = useState(''), [erroreSalvataggio, setErroreSalvataggio] = useState(false);
  const spazio = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null), campo = useRef<HTMLInputElement>(null);
  const elementi = useRef(new Map<number, HTMLDivElement>()), osservatore = useRef<IntersectionObserver | null>(null);
  const vicineRef = useRef(new Set([iniziale.current - 1, iniziale.current, iniziale.current + 1])), ripristino = useRef(true), ancora = useRef<Ancora | null>(null);
  const ultimaSalvata = useRef(iniziale.current), prontoRef = useRef(false), scrollFrame = useRef(0);
  const selezioneTimer = useRef<ReturnType<typeof setTimeout>>();
  const file = `${import.meta.env.BASE_URL}${doc.file}`, larghezza = Math.round(larghezzaFit);
  const [piano, setPiano] = useState<PianoRender>(() => ({ larghezza, pronte: new Set(), inCorso: iniziale.current }));
  const paginaPrioritaria = selezionando ? paginaGesto.current ?? pagina : pagina;
  const ordine = useMemo(() => ordinePagine(paginaPrioritaria, pagine), [paginaPrioritaria, pagine]);
  useLayoutEffect(() => {
    if (caricato) setPiano((prima) => aggiornaPianoRender(prima, ordine, paginaPrioritaria, larghezza));
  }, [caricato, ordine, paginaPrioritaria, larghezza]);
  useEffect(() => {
    if (!caricato || errorePdf || selezionando || bozza || piano.larghezza !== larghezza || piano.inCorso !== null) return;
    const prossima = ordine.find((n) => !piano.pronte.has(n));
    if (prossima === undefined) return;
    let idle: number | undefined, annullato = false;
    const avvia = () => { if (!annullato) setPiano((prima) => annullato ? prima : avviaPagina(prima, prossima, larghezza)); };
    const timer = window.setTimeout(() => {
      if ('requestIdleCallback' in window) idle = window.requestIdleCallback(avvia, { timeout: 700 });
      else avvia();
    }, 150);
    return () => { annullato = true; window.clearTimeout(timer); if (idle !== undefined) window.cancelIdleCallback(idle); };
  }, [caricato, errorePdf, selezionando, bozza, piano, larghezza, ordine]);
  const firmaResidenti = piano.larghezza === larghezza
    ? [...piano.pronte, ...(piano.inCorso === null ? [] : [piano.inCorso])].sort((a, b) => a - b).join(',')
    : String(paginaPrioritaria);
  const residenti = useMemo(() => new Set(firmaResidenti ? firmaResidenti.split(',').map(Number) : []), [firmaResidenti]);
  const pronta = useCallback((numero: number, dimensione: number) => setPiano((prima) => paginaPronta(prima, numero, dimensione)), []);
  const caricaDocumento = useCallback(async (pdf: PDFDocumentProxy) => {
    setPagine(pdf.numPages); setErrorePdf(false);
    try { const first = await pdf.getPage(1), v = first.getViewport({ scale: 1 }); setRapporto(v.height / v.width); } catch { /* Rapporto A4 come ripiego. */ }
    setCaricato(true);
  }, []);
  const documentoFallito = useCallback(() => setErrorePdf(true), []);
  const salvaEsito = useCallback((ok: boolean) => setErroreSalvataggio(!ok), []);
  const aggiornaPagina = useCallback((numero: number) => {
    paginaRef.current = numero; setPagina(numero);
    if (document.activeElement !== campo.current) setCampoPagina(String(numero));
  }, []);
  const salta = useCallback((numero: number, frazione = 0) => {
    const n = paginaValida(numero, pagine), root = viewport.current, el = elementi.current.get(n);
    if (!root || !el) return;
    const top = el.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop;
    root.scrollTo({ top: top - 16 + el.offsetHeight * frazione, behavior: 'auto' });
    aggiornaPagina(n); setCampoPagina(String(n));
  }, [pagine, aggiornaPagina]);
  const conservaAncora = useCallback(() => {
    const root = viewport.current, el = elementi.current.get(paginaRef.current);
    if (!root || !el || ripristino.current) return;
    const top = el.getBoundingClientRect().top - root.getBoundingClientRect().top;
    ancora.current = { pagina: paginaRef.current, frazione: Math.max(0, Math.min(1, (16 - top) / el.offsetHeight)) };
  }, []);
  const misura = useCallback((numero: number, valore: number) => {
    if (!Number.isFinite(valore) || valore <= 0) return;
    setRapporti((prev) => {
      if (Math.abs((prev[numero] ?? rapporto) - valore) < .001) return prev;
      conservaAncora(); return { ...prev, [numero]: valore };
    });
  }, [rapporto, conservaAncora]);
  const registra = useCallback((numero: number, el: HTMLDivElement | null) => {
    const precedente = elementi.current.get(numero);
    if (precedente) osservatore.current?.unobserve(precedente);
    if (el) { elementi.current.set(numero, el); osservatore.current?.observe(el); } else elementi.current.delete(numero);
  }, []);
  const rilevaPagina = useCallback(() => {
    if (ripristino.current || !viewport.current) return;
    const root = viewport.current.getBoundingClientRect(), mira = root.top + Math.min(root.height * .28, 160);
    let migliore = paginaRef.current, distanza = Infinity;
    for (const numero of vicineRef.current) {
      const el = elementi.current.get(numero); if (!el) continue;
      const r = el.getBoundingClientRect();
      const d = r.top <= mira && r.bottom >= mira ? 0 : Math.min(Math.abs(r.top - mira), Math.abs(r.bottom - mira));
      if (d < distanza) { distanza = d; migliore = numero; }
    }
    if (migliore !== paginaRef.current) aggiornaPagina(migliore);
  }, [aggiornaPagina]);
  const scorri = useCallback(() => {
    cancelAnimationFrame(scrollFrame.current); scrollFrame.current = requestAnimationFrame(rilevaPagina);
  }, [rilevaPagina]);
  useEffect(() => {
    const root = viewport.current; if (!root) return;
    const resize = new ResizeObserver(() => {
      const next = Math.max(120, Math.min(1100, root.clientWidth - 32,
        adattamento === 'pagina' ? (root.clientHeight - 52) / rapporto : Infinity));
      setLarghezzaFit((prev) => { if (Math.abs(next - prev) < 1) return prev; conservaAncora(); impostaBozza(null); return next; });
    });
    resize.observe(root); return () => resize.disconnect();
  }, [conservaAncora, adattamento, rapporto, impostaBozza]);
  useEffect(() => {
    if (!pannello) return;
    const prima = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    chiudiPannello.current?.focus({ preventScroll: true });
    const tastiera = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); setPannello(null); } };
    document.addEventListener('keydown', tastiera);
    return () => { document.removeEventListener('keydown', tastiera); if (prima?.isConnected) prima.focus({ preventScroll: true }); };
  }, [pannello]);
  useLayoutEffect(() => {
    if (ancora.current && caricato) { const a = ancora.current; ancora.current = null; salta(a.pagina, a.frazione); }
  }, [larghezza, rapporti, caricato, salta]);
  useEffect(() => {
    const root = viewport.current; if (!root || !caricato) return;
    const io = new IntersectionObserver((entries) => {
      const next = new Set(vicineRef.current);
      for (const entry of entries) {
        const numero = Number((entry.target as HTMLElement).dataset.originalPage);
        if (entry.isIntersecting) next.add(numero); else next.delete(numero);
      }
      vicineRef.current = next; scorri();
    }, { root, rootMargin: '1000px 0px' });
    osservatore.current = io; elementi.current.forEach((el) => io.observe(el));
    const frame = requestAnimationFrame(() => { salta(iniziale.current); ripristino.current = false; prontoRef.current = true; });
    return () => { io.disconnect(); osservatore.current = null; cancelAnimationFrame(frame); };
  }, [caricato, scorri, salta]);
  useEffect(() => {
    if (!caricato || ripristino.current || pagina === ultimaSalvata.current) return;
    const timer = setTimeout(() => { salvaEsito(salvaPaginaOriginale(slug, doc, pagina)); ultimaSalvata.current = pagina; }, 600);
    return () => clearTimeout(timer);
  }, [pagina, caricato, slug, doc, salvaEsito]);
  useEffect(() => {
    const salvaUltimaPagina = () => {
      if (!prontoRef.current || paginaRef.current === ultimaSalvata.current) return;
      salvaEsito(salvaPaginaOriginale(slug, doc, paginaRef.current));
      ultimaSalvata.current = paginaRef.current;
    };
    const nascondi = () => { if (document.visibilityState === 'hidden') salvaUltimaPagina(); };
    window.addEventListener('pagehide', salvaUltimaPagina);
    document.addEventListener('visibilitychange', nascondi);
    return () => {
      cancelAnimationFrame(scrollFrame.current); clearTimeout(selezioneTimer.current);
      window.removeEventListener('pagehide', salvaUltimaPagina);
      document.removeEventListener('visibilitychange', nascondi);
      salvaUltimaPagina();
    };
  }, [slug, doc, salvaEsito]);
  const catturaSelezione = useCallback((): Selezione | null => {
    const selection = window.getSelection();
    // L'anteprima già catturata sopravvive al passaggio sui pulsanti.
    if (!selection || selection.isCollapsed || !selection.rangeCount) return null;
    const range = selection.getRangeAt(0), inizio = elementoDi(range.startContainer), fine = elementoDi(range.endContainer);
    const prima = inizio?.closest<HTMLDivElement>('[data-original-page]'), ultima = fine?.closest<HTMLDivElement>('[data-original-page]');
    if (!prima || !ultima || !viewport.current?.contains(prima) || !viewport.current.contains(ultima)) return null;
    if (prima !== ultima) { impostaBozza(null); setMessaggio('Seleziona un passaggio su una sola pagina per volta.'); return null; }
    if (!inizio?.closest('.react-pdf__Page__textContent') || !fine?.closest('.react-pdf__Page__textContent')) return null;
    const testo = selection.toString().trim(), rettangoli = rettangoliSelezione(range, prima.getBoundingClientRect());
    if (!testo || !rettangoli.length) return null;
    if (testo.length > 10000 || rettangoli.length > 1000) { impostaBozza(null); setMessaggio('Il passaggio è molto lungo: seleziona una porzione più breve.'); return null; }
    const nuova = { pagina: Number(prima.dataset.originalPage), testo, rettangoli };
    impostaBozza(nuova); setMessaggio(''); return nuova;
  }, [impostaBozza]);
  const programmaSelezione = useCallback(() => {
    if (gesto.current) return;
    clearTimeout(selezioneTimer.current); selezioneTimer.current = setTimeout(catturaSelezione, 60);
  }, [catturaSelezione]);
  useEffect(() => {
    const termina = () => {
      if (!gesto.current) return;
      gesto.current = false; setSelezionando(false); paginaGesto.current = null;
      clearTimeout(selezioneTimer.current); selezioneTimer.current = setTimeout(catturaSelezione, 0);
    };
    document.addEventListener('selectionchange', programmaSelezione);
    document.addEventListener('pointerup', termina);
    document.addEventListener('pointercancel', termina);
    window.addEventListener('blur', termina);
    return () => {
      document.removeEventListener('selectionchange', programmaSelezione);
      document.removeEventListener('pointerup', termina);
      document.removeEventListener('pointercancel', termina);
      window.removeEventListener('blur', termina);
    };
  }, [programmaSelezione, catturaSelezione]);
  const annullaSelezione = useCallback(() => {
    clearTimeout(selezioneTimer.current); impostaBozza(null); setMessaggio(''); window.getSelection()?.removeAllRanges();
  }, [impostaBozza]);
  const salvaSegno = useCallback(() => {
    const scelta = catturaSelezione() ?? bozzaRef.current;
    if (!scelta) return false;
    try {
      const esito = aggiungiSegnoOriginale(slug, doc, { ...scelta, tipo, colore });
      salvaEsito(esito.salvato); annullaSelezione(); setMessaggio(esito.salvato ? 'Segno salvato.' : 'Segno aggiunto solo per questa sessione.');
      return true;
    } catch { setMessaggio('Non è stato possibile creare il segno. Seleziona di nuovo il passaggio.'); return false; }
  }, [slug, doc, tipo, colore, catturaSelezione, annullaSelezione, salvaEsito]);
  const annullaModifica = useCallback(() => {
    annullaSelezione();
    const esito = annullaSegnoOriginale(slug, doc); salvaEsito(esito.salvato);
    if (esito.eseguito) setMessaggio('Modifica ai segni annullata.');
  }, [slug, doc, annullaSelezione, salvaEsito]);
  const ripristinaModifica = useCallback(() => {
    annullaSelezione();
    const esito = ripristinaSegnoOriginale(slug, doc); salvaEsito(esito.salvato);
    if (esito.eseguito) setMessaggio('Modifica ai segni ripristinata.');
  }, [slug, doc, annullaSelezione, salvaEsito]);
  useEffect(() => {
    const tastiera = (e: KeyboardEvent) => {
      const target = e.target instanceof Element ? e.target : null;
      if (!target || (!spazio.current?.contains(target) && target !== document.body)) return;
      if (target.closest('input, select, textarea, [contenteditable="true"]')) return;
      if ((e.metaKey || e.ctrlKey) && !e.altKey) {
        const key = e.key.toLowerCase();
        if (key === 'z') { e.preventDefault(); if (e.shiftKey) ripristinaModifica(); else annullaModifica(); }
        else if (key === 'y') { e.preventDefault(); ripristinaModifica(); }
        return;
      }
      if (e.repeat || e.altKey || e.shiftKey || target.closest('#originali-pannello')) return;
      if (e.key === 'Escape' || e.key === 'Delete' || e.key === 'Backspace') {
        if (bozzaRef.current || window.getSelection()?.toString()) { e.preventDefault(); annullaSelezione(); }
        return;
      }
      const key = e.key.toLowerCase();
      if (key === 'h' || key === 'u') { e.preventDefault(); setTipo(key === 'h' ? 'evidenziato' : 'sottolineato'); return; }
      if (key === '1' || key === '2' || key === '3') { e.preventDefault(); setColore(COLORI[Number(key) - 1]); return; }
      if (target.closest('button, a')) return;
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
        if (salvaSegno()) e.preventDefault();
      }
    };
    document.addEventListener('keydown', tastiera);
    return () => document.removeEventListener('keydown', tastiera);
  }, [salvaSegno, annullaModifica, ripristinaModifica, annullaSelezione]);
  const perPagina = useMemo(() => {
    const m = new Map<number, SegnoOriginale[]>(); for (const s of segni) m.set(s.pagina, [...(m.get(s.pagina) ?? []), s]); return m;
  }, [segni]);
  const ordinati = useMemo(() => [...segni].sort((a, b) => a.pagina - b.pagina || a.creata.localeCompare(b.creata)), [segni]);
  const vaiPagina = useCallback((numero: number) => { annullaSelezione(); salta(numero); }, [annullaSelezione, salta]);
  function adatta(valore: 'pagina' | 'larghezza') { conservaAncora(); annullaSelezione(); setAdattamento(valore); }
  const annotazioni = useMemo(() => ({ perPagina, bozza, tipo, colore }), [perPagina, bozza, tipo, colore]);
  const cronologia = useMemo(() => cronologiaSegni(lettura), [lettura]);
  return <div className="originali" ref={spazio}>
    <header className="originali-header">
      <h1>Originali</h1>
      <select className="select originali-documento-select" value={doc.id} onChange={(e) => scegli(e.target.value)} aria-label="Scegli il documento originale">
        {documenti.map((d) => <option key={d.id} value={d.id}>{d.titolo}</option>)}
      </select>
      <button className={`btn btn-sm ${pannello === 'segni' ? 'originali-scelto' : 'btn-ghost'}`} aria-expanded={pannello === 'segni'} aria-controls="originali-pannello"
        aria-label={`Segni salvati (${segni.length})`} title="Segni salvati" onClick={() => setPannello(pannello === 'segni' ? null : 'segni')}><Icon n="glossario" size={15} /><span className="originali-conteggio">{segni.length}</span></button>
      <button className={`btn btn-sm originali-quadrato ${pannello === 'documento' ? 'originali-scelto' : 'btn-ghost'}`}
        aria-label="Documento e scorciatoie" title="Documento e scorciatoie" aria-expanded={pannello === 'documento'} aria-controls="originali-pannello"
        onClick={() => setPannello(pannello === 'documento' ? null : 'documento')}><Icon n="altro" size={19} /></button>
    </header>
    <div className="originali-layout">
      <section className="originali-lettore" aria-label={`Lettore di ${doc.titolo}`}>
        <div className="originali-barra">
          <form className="originali-navigazione" onSubmit={(e) => { e.preventDefault(); vaiPagina(Number(campoPagina)); }}>
            <button type="button" className="btn btn-sm btn-ghost originali-quadrato" disabled={!caricato || pagina <= 1} onClick={() => vaiPagina(pagina - 1)} aria-label="Pagina precedente"><Icon n="indietro" size={15} /></button>
            <label className="originali-sr" htmlFor="originali-numero">Pagina</label>
            <input ref={campo} id="originali-numero" className="input" inputMode="numeric" type="number" min={1} max={pagine} value={campoPagina}
              onChange={(e) => setCampoPagina(e.target.value)} disabled={!caricato} />
            <span className="faint">/ {pagine}</span><button type="submit" className="btn btn-sm btn-ghost originali-quadrato" aria-label="Vai alla pagina" title="Vai alla pagina (Invio)"><Icon n="invio" size={16} /></button>
            <button type="button" className="btn btn-sm btn-ghost originali-quadrato" disabled={!caricato || pagina >= pagine} onClick={() => vaiPagina(pagina + 1)} aria-label="Pagina successiva"><Icon n="freccia" size={15} /></button>
          </form>
          <div className="originali-cronologia" aria-label="Annulla e ripristina segni">
            <button type="button" className="btn btn-sm btn-ghost originali-quadrato" disabled={!cronologia.indietro.length} onClick={annullaModifica}
              aria-label="Annulla ultima modifica ai segni" title="Annulla (⌘Z / Ctrl+Z)"><Icon n="annulla" size={17} /></button>
            <button type="button" className="btn btn-sm btn-ghost originali-quadrato" disabled={!cronologia.avanti.length} onClick={ripristinaModifica}
              aria-label="Ripristina modifica ai segni" title="Ripristina (⌘⇧Z / Ctrl+Y)"><Icon n="ripristina" size={17} /></button>
          </div>
          <div className="originali-adatta">
            <select className="select originali-adattamento" aria-label="Adatta il foglio" value={adattamento} onChange={(e) => adatta(e.target.value as 'pagina' | 'larghezza')}>
              <option value="pagina">Pagina intera</option><option value="larghezza">Riempi lo spazio</option>
            </select>
          </div>
          <div className="originali-strumenti">
            <button className={`btn btn-sm originali-quadrato ${tipo === 'evidenziato' ? 'originali-scelto' : 'btn-ghost'}`} aria-label="Evidenzia" title="Evidenzia (H)" aria-pressed={tipo === 'evidenziato'} onClick={() => setTipo('evidenziato')}><Icon n="evidenzia" size={18} /></button>
            <button className={`btn btn-sm originali-quadrato ${tipo === 'sottolineato' ? 'originali-scelto' : 'btn-ghost'}`} aria-label="Sottolinea" title="Sottolinea (U)" aria-pressed={tipo === 'sottolineato'} onClick={() => setTipo('sottolineato')}><Icon n="sottolinea" size={18} /></button>
            <div className="originali-colori" aria-label="Colore del segno">{COLORI.map((c) => <button key={c} className={`originali-colore ${c}`} aria-label={c[0].toUpperCase() + c.slice(1)} title={c}
              aria-pressed={colore === c} onClick={() => setColore(c)} />)}</div>
            <button className="btn btn-sm originali-quadrato" aria-label="Salva segno" disabled={!bozza} title={bozza ? `Salva il passaggio di pagina ${bozza.pagina} (Invio o Spazio)` : 'Salva segno: seleziona un passaggio del PDF'} onClick={salvaSegno}><Icon n="salva" size={18} /></button>
          </div>
        </div>
        <div ref={viewport} className="originali-viewport" data-selezionando={selezionando} data-colore={colore} tabIndex={0} aria-label="Pagine del documento, scorri per leggere" onScroll={scorri}
          onPointerDown={(e) => {
            if (!(e.target as Element).closest('.react-pdf__Page__textContent')) return;
            gesto.current = true; paginaGesto.current = Number((e.target as Element).closest<HTMLElement>('[data-original-page]')?.dataset.originalPage) || paginaRef.current;
            setSelezionando(true); clearTimeout(selezioneTimer.current); impostaBozza(null); setMessaggio('');
            e.currentTarget.focus({ preventScroll: true });
          }}>
          <AnnotazioniContext.Provider value={annotazioni}>
            <DocumentoPagine file={file} larghezza={larghezza} rapporto={rapporto} rapporti={rapporti} residenti={residenti}
              pagine={pagine} caricato={caricato} errore={errorePdf} registra={registra} misura={misura} pronta={pronta}
              carica={caricaDocumento} fallita={documentoFallito} vai={vaiPagina} />
          </AnnotazioniContext.Provider>
        </div>
        <div className="originali-feedback" role="status" aria-live="polite">{messaggio || (bozza ? `Passaggio selezionato · pagina ${bozza.pagina}` : '')}</div>
        {erroreSalvataggio && <div className="originali-avviso" role="alert">Non è stato possibile salvare sul dispositivo. Le ultime modifiche restano in questa sessione: salva una copia dalla sezione <a href={href('/backup')}>Backup</a>.</div>}
      </section>
      {pannello && <aside id="originali-pannello" className="originali-pannello" aria-label={pannello === 'segni' ? 'Segni salvati' : 'Informazioni e dati del documento'}>
        <header className="originali-pannello-heading"><h2 className="title-m">{pannello === 'segni' ? `I tuoi segni (${segni.length})` : 'Documento e dati'}</h2>
          <button ref={chiudiPannello} className="btn btn-sm btn-ghost originali-quadrato" aria-label="Chiudi pannello" onClick={() => setPannello(null)}><Icon n="x" size={18} /></button>
        </header>
        <div className="originali-pannello-body">
          {pannello === 'documento' ? <>
            <h3 className="title-s">{doc.titolo}</h3><p className="small muted">{doc.descrizione}</p>
            <h3 className="title-s">Scorciatoie</h3>
            <dl className="originali-scorciatoie"><dt>Invio / Spazio</dt><dd>Salva il segno selezionato</dd><dt>Esc / Canc / ⌫</dt><dd>Annulla la selezione</dd><dt>⌘Z / Ctrl+Z</dt><dd>Annulla l’ultima modifica</dd><dt>⌘⇧Z / Ctrl+Y</dt><dd>Ripristina la modifica</dd><dt>H / U</dt><dd>Evidenzia / sottolinea</dd><dt>1 / 2 / 3</dt><dd>Giallo / verde / rosa</dd></dl>
            <p className="tiny faint">Pagina e segni restano in questo browser. Puoi conservarli insieme a tutte le materie nella sezione Backup.</p>
            <hr className="sep" />
            <a className="btn btn-sm" href={file} download><Icon n="scarica" size={15} />Scarica PDF originale</a>
            <p className="tiny faint">Il PDF scaricato conserva il testo originale; i segni personali sono nel backup completo.</p>
          </> : <>
            {!ordinati.length ? <p className="muted small">I passaggi che evidenzi o sottolinei compariranno qui, con il collegamento alla loro pagina.</p>
              : <ol className="originali-lista">{ordinati.map((s) => <li key={s.id}>
                <div className="row-between"><button className="btn btn-sm btn-ghost originali-vai-segno" onClick={() => { vaiPagina(s.pagina); setPannello(null); }}>Pagina {s.pagina}<Icon n="freccia" size={13} /></button>
                  <button className="btn btn-sm btn-ghost originali-quadrato" aria-label={`Rimuovi il segno a pagina ${s.pagina}: ${s.testo.slice(0, 50)}`} onClick={() => {
                    annullaSelezione(); salvaEsito(rimuoviSegnoOriginale(slug, doc, s.id)); setMessaggio('Segno rimosso. Puoi annullare dalla barra.');
                  }}><Icon n="x" size={14} /></button></div>
                <p className={`originali-estratto ${s.colore}`}>{s.testo}</p><span className="tiny faint">{s.tipo === 'evidenziato' ? 'Evidenziato' : 'Sottolineato'} · {s.colore}</span>
              </li>)}</ol>}
          </>}
        </div>
      </aside>}
    </div>
  </div>;
}

export default function Originali() {
  const idx = useCorso(), slug = idx.corso.materia.slug;
  const documenti = useMemo(() => originaliMateria(slug), [slug]);
  const [scelto, setScelto] = useState(documenti[0]?.id ?? '');
  const doc = documenti.find((d) => d.id === scelto) ?? documenti[0];
  return doc ? <LettoreOriginale key={`${slug}-${doc.id}`} slug={slug} doc={doc} documenti={documenti} scegli={setScelto} />
    : <div className="empty"><h1 className="title-m">Originali</h1><p>Non ci sono ancora documenti per questa materia.</p></div>;
}
