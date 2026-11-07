import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import { Icon } from '../components/ui';
import { useCorso } from '../lib/data';
import { originaliMateria, paginaValida, type DocumentoOriginale, type RettangoloSegno, type SegnoOriginale } from '../lib/originali';
import { aggiungiSegnoOriginale, rimuoviSegnoOriginale, salvaPaginaOriginale, useProgresso } from '../lib/store';
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

function SegniPagina({ segni, bozza, tipo, colore }: {
  segni: SegnoOriginale[]; bozza?: Selezione; tipo: SegnoOriginale['tipo']; colore: SegnoOriginale['colore'];
}) {
  const rettangolo = (r: RettangoloSegno, key: string, cls: string) => <span key={key} className={`originali-segno ${cls}`}
    style={{ left: `${r.x * 100}%`, top: `${r.y * 100}%`, width: `${r.w * 100}%`, height: `${r.h * 100}%` }} />;
  return <div className="originali-segni-pagina" aria-hidden="true">
    {segni.map((s) => s.rettangoli.map((r, k) => rettangolo(r, `${s.id}-${k}`, `${s.tipo} ${s.colore}`)))}
    {bozza?.rettangoli.map((r, k) => rettangolo(r, `bozza-${k}`, `originali-bozza ${tipo} ${colore}`))}
  </div>;
}
const PaginaOriginale = memo(function PaginaOriginale({ numero, larghezza, rapporto, vicina, segni, bozza, tipo, colore, file, registra, misura }: {
  numero: number; larghezza: number; rapporto: number; vicina: boolean; segni: SegnoOriginale[]; bozza?: Selezione;
  tipo: SegnoOriginale['tipo']; colore: SegnoOriginale['colore']; file: string;
  registra: (numero: number, elemento: HTMLDivElement | null) => void;
  misura: (numero: number, rapporto: number) => void;
}) {
  const ref = useCallback((el: HTMLDivElement | null) => registra(numero, el), [numero, registra]);
  return <div className="originali-foglio" style={{ width: larghezza }}>
    <div ref={ref} className="originali-pagina" data-original-page={numero} style={{ width: larghezza, height: larghezza * rapporto }}>
      {vicina && <Page pageNumber={numero} width={larghezza} renderTextLayer renderAnnotationLayer
        devicePixelRatio={Math.min(window.devicePixelRatio || 1, 2)}
        onLoadSuccess={(page) => { const v = page.getViewport({ scale: 1 }); misura(numero, v.height / v.width); }}
        loading={<div className="originali-stato-pagina" role="status">Caricamento pagina {numero}…</div>}
        error={<div className="originali-stato-pagina">Questa pagina non si è caricata. <a href={`${file}#page=${numero}`} target="_blank" rel="noopener noreferrer">Aprila nel PDF</a></div>} />}
      {vicina && <SegniPagina segni={segni} bozza={bozza} tipo={tipo} colore={colore} />}
    </div>
    <span className="originali-numero-pagina">Pagina {numero}</span>
  </div>;
});

function LettoreOriginale({ slug, doc }: { slug: string; doc: DocumentoOriginale }) {
  const p = useProgresso(slug), lettura = p.originali?.[doc.id];
  const segni = lettura?.segni ?? NESSUN_SEGNO;
  const iniziale = useRef(paginaValida(lettura?.pagina ?? 1, doc.pagine));
  const [pagina, setPagina] = useState(iniziale.current), paginaRef = useRef(iniziale.current);
  const [campoPagina, setCampoPagina] = useState(String(iniziale.current));
  const [pagine, setPagine] = useState(doc.pagine), [caricato, setCaricato] = useState(false);
  const [errorePdf, setErrorePdf] = useState(false);
  const [larghezzaFit, setLarghezzaFit] = useState(700), [zoom, setZoom] = useState(1);
  const [rapporto, setRapporto] = useState(Math.SQRT2), [rapporti, setRapporti] = useState<Record<number, number>>({});
  const [vicine, setVicine] = useState<Set<number>>(() => new Set([iniziale.current - 1, iniziale.current, iniziale.current + 1]));
  const [bozza, setBozza] = useState<Selezione | null>(null);
  const [tipo, setTipo] = useState<SegnoOriginale['tipo']>('evidenziato');
  const [colore, setColore] = useState<SegnoOriginale['colore']>('giallo');
  const [messaggio, setMessaggio] = useState(''), [erroreSalvataggio, setErroreSalvataggio] = useState(false);
  const [rimossi, setRimossi] = useState<SegnoOriginale[]>([]);
  const viewport = useRef<HTMLDivElement>(null), campo = useRef<HTMLInputElement>(null);
  const elementi = useRef(new Map<number, HTMLDivElement>()), osservatore = useRef<IntersectionObserver | null>(null);
  const vicineRef = useRef(vicine), ripristino = useRef(true), ancora = useRef<Ancora | null>(null);
  const ultimaSalvata = useRef(iniziale.current), prontoRef = useRef(false), scrollFrame = useRef(0);
  const selezioneTimer = useRef<ReturnType<typeof setTimeout>>();
  const file = `${import.meta.env.BASE_URL}${doc.file}`, larghezza = Math.round(larghezzaFit * zoom);
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
      const next = Math.max(180, Math.min(980, root.clientWidth - 32));
      setLarghezzaFit((prev) => { if (Math.abs(next - prev) < 1) return prev; conservaAncora(); setBozza(null); return next; });
    });
    resize.observe(root); return () => resize.disconnect();
  }, [conservaAncora]);
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
      vicineRef.current = next; setVicine(next); scorri();
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
  const catturaSelezione = useCallback(() => {
    const selection = window.getSelection();
    // Su touch i comandi possono chiudere la selezione nativa: conserviamo l'anteprima.
    if (!selection || selection.isCollapsed || !selection.rangeCount) return;
    const range = selection.getRangeAt(0), inizio = elementoDi(range.startContainer), fine = elementoDi(range.endContainer);
    const prima = inizio?.closest<HTMLDivElement>('[data-original-page]'), ultima = fine?.closest<HTMLDivElement>('[data-original-page]');
    if (!prima || !ultima || !viewport.current?.contains(prima) || !viewport.current.contains(ultima)) return;
    if (prima !== ultima) { setBozza(null); setMessaggio('Seleziona un passaggio su una sola pagina per volta.'); return; }
    if (!inizio?.closest('.react-pdf__Page__textContent') || !fine?.closest('.react-pdf__Page__textContent')) return;
    const testo = selection.toString().trim(), rettangoli = rettangoliSelezione(range, prima.getBoundingClientRect());
    if (!testo || !rettangoli.length) return;
    if (testo.length > 10000 || rettangoli.length > 1000) { setBozza(null); setMessaggio('Il passaggio è molto lungo: seleziona una porzione più breve.'); return; }
    setBozza({ pagina: Number(prima.dataset.originalPage), testo, rettangoli }); setMessaggio('');
  }, []);
  const programmaSelezione = useCallback(() => {
    clearTimeout(selezioneTimer.current); selezioneTimer.current = setTimeout(catturaSelezione, 160);
  }, [catturaSelezione]);
  useEffect(() => {
    document.addEventListener('selectionchange', programmaSelezione);
    return () => document.removeEventListener('selectionchange', programmaSelezione);
  }, [programmaSelezione]);
  function annullaSelezione() {
    clearTimeout(selezioneTimer.current); setBozza(null); setMessaggio(''); window.getSelection()?.removeAllRanges();
  }
  function salvaSegno() {
    if (!bozza) return;
    try {
      const esito = aggiungiSegnoOriginale(slug, doc, { ...bozza, tipo, colore });
      salvaEsito(esito.salvato); annullaSelezione(); setMessaggio(esito.salvato ? 'Segno salvato.' : 'Segno aggiunto solo per questa sessione.');
    } catch { setMessaggio('Non è stato possibile creare il segno. Seleziona di nuovo il passaggio.'); }
  }
  function cambiaZoom(valore: number) { conservaAncora(); annullaSelezione(); setZoom(Math.max(.6, Math.min(2, Math.round(valore * 100) / 100))); }
  const perPagina = useMemo(() => {
    const m = new Map<number, SegnoOriginale[]>(); for (const s of segni) m.set(s.pagina, [...(m.get(s.pagina) ?? []), s]); return m;
  }, [segni]);
  const ordinati = useMemo(() => [...segni].sort((a, b) => a.pagina - b.pagina || a.creata.localeCompare(b.creata)), [segni]);
  return <div className="originali-layout">
    <section className="originali-lettore" aria-label={`Lettore di ${doc.titolo}`}>
      <div className="originali-barra">
      <div className="originali-comandi">
        <form className="originali-navigazione" onSubmit={(e) => { e.preventDefault(); salta(Number(campoPagina)); }}>
          <button type="button" className="btn btn-sm btn-ghost" disabled={!caricato || pagina <= 1} onClick={() => salta(pagina - 1)} aria-label="Pagina precedente"><Icon n="indietro" size={16} /></button>
          <label htmlFor="originali-numero">Pagina</label>
          <input ref={campo} id="originali-numero" className="input" inputMode="numeric" type="number" min={1} max={pagine} value={campoPagina}
            onChange={(e) => setCampoPagina(e.target.value)} disabled={!caricato} />
          <span className="muted">/ {pagine}</span><button type="submit" className="btn btn-sm" disabled={!caricato}>Vai</button>
          <button type="button" className="btn btn-sm btn-ghost" disabled={!caricato || pagina >= pagine} onClick={() => salta(pagina + 1)} aria-label="Pagina successiva"><Icon n="freccia" size={16} /></button>
        </form>
        <div className="originali-zoom" aria-label="Ingrandimento del PDF">
          <button className="btn btn-sm" disabled={zoom <= .6} onClick={() => cambiaZoom(zoom - .15)} aria-label="Riduci zoom">−</button><span>{Math.round(zoom * 100)}%</span>
          <button className="btn btn-sm" disabled={zoom >= 2} onClick={() => cambiaZoom(zoom + .15)} aria-label="Aumenta zoom">+</button>
          <button className="btn btn-sm btn-ghost" onClick={() => cambiaZoom(1)} title="Adatta la pagina alla larghezza">Adatta</button>
        </div>
      </div>
      <div className="originali-strumenti" onMouseDown={(e) => { if ((e.target as Element).closest('button')) e.preventDefault(); }}>
        <div className="originali-tipi" aria-label="Tipo di segno">
          <button className={`btn btn-sm ${tipo === 'evidenziato' ? 'originali-scelto' : 'btn-ghost'}`} aria-pressed={tipo === 'evidenziato'} onClick={() => setTipo('evidenziato')}>Evidenzia</button>
          <button className={`btn btn-sm ${tipo === 'sottolineato' ? 'originali-scelto' : 'btn-ghost'}`} aria-pressed={tipo === 'sottolineato'} onClick={() => setTipo('sottolineato')}>Sottolinea</button>
        </div>
        <div className="originali-colori" aria-label="Colore del segno">{COLORI.map((c) => <button key={c} className={`originali-colore ${c}`} aria-label={c[0].toUpperCase() + c.slice(1)} title={c}
          aria-pressed={colore === c} onClick={() => setColore(c)} />)}</div>
        <button className="btn btn-sm btn-primary" disabled={!bozza} onClick={salvaSegno}>Salva segno</button>
        {bozza && <button className="btn btn-sm btn-ghost" onClick={annullaSelezione}>Annulla selezione</button>}
        <span className="originali-aiuto muted">{bozza ? `Passaggio selezionato · pagina ${bozza.pagina}` : 'Seleziona il testo su una pagina, poi salva il segno.'}</span>
      </div>
      {erroreSalvataggio && <div className="originali-avviso" role="alert"><Icon n="avviso" size={18} /><span>Non è stato possibile salvare sul dispositivo: lo spazio potrebbe essere esaurito o l’archiviazione bloccata. Le ultime modifiche restano solo in questa sessione.</span></div>}
      <div className="originali-messaggio small" role="status" aria-live="polite">{messaggio || '\u00a0'}</div>
      </div>
      <div ref={viewport} className="originali-viewport" tabIndex={0} aria-label="Pagine del documento, scorri per leggere" onScroll={scorri}
        onPointerUp={programmaSelezione} onPointerDown={(e) => { if ((e.target as Element).closest('.react-pdf__Page__textContent')) { setBozza(null); setMessaggio(''); } }}>
        <Document file={file} options={PDF_OPTIONS} externalLinkTarget="_blank" externalLinkRel="noopener noreferrer"
          onLoadSuccess={async (pdf) => {
            setPagine(pdf.numPages); setErrorePdf(false);
            try { const first = await pdf.getPage(1), v = first.getViewport({ scale: 1 }); setRapporto(v.height / v.width); } catch { /* Il rapporto A4 permette comunque di avviare il lettore. */ }
            setCaricato(true);
          }}
          onLoadError={() => setErrorePdf(true)} onItemClick={({ pageNumber }) => { if (pageNumber) salta(pageNumber); }}
          loading={<div className="originali-stato-documento" role="status">Apertura degli appunti…</div>}
          error={<div className="originali-stato-documento"><Icon n="avviso" size={28} /><h2 className="title-m">Il lettore non riesce ad aprire il documento</h2><p>Puoi leggere o scaricare il PDF originale con i collegamenti qui sopra.</p><a className="btn" href={file} target="_blank" rel="noopener noreferrer">Apri PDF</a></div>}>
          {caricato && !errorePdf && <div className="originali-pagine">{Array.from({ length: pagine }, (_, k) => k + 1).map((n) => <PaginaOriginale key={n} numero={n} larghezza={larghezza}
            rapporto={rapporti[n] ?? rapporto} vicina={vicine.has(n)} segni={perPagina.get(n) ?? NESSUN_SEGNO} bozza={bozza?.pagina === n ? bozza : undefined}
            tipo={tipo} colore={colore} file={file} registra={registra} misura={misura} />)}</div>}
        </Document>
      </div>
      <p className="originali-nota small muted">Pagina e segni sono salvati in questo browser e inclusi nel backup dei Progressi. La lettura degli originali è indipendente dal punteggio del Percorso.</p>
    </section>
    <aside className="originali-elenco card" aria-label="Segni salvati">
      <div className="row-between"><h2 className="title-m">I tuoi segni</h2><span className="chip">{segni.length}</span></div>
      {rimossi.length > 0 && <div className="originali-annulla" role="status"><span>{rimossi.length === 1 ? 'Segno rimosso' : `${rimossi.length} segni rimossi`}</span><button className="btn btn-sm" onClick={() => {
        let ok = true; for (const s of rimossi) { const { id: _id, creata: _creata, ...daRipristinare } = s; ok = aggiungiSegnoOriginale(slug, doc, daRipristinare).salvato && ok; }
        salvaEsito(ok); setRimossi([]); setMessaggio('Rimozione annullata.');
      }}>Annulla</button></div>}
      {!ordinati.length ? <p className="muted originali-vuoto">I passaggi che evidenzi o sottolinei compariranno qui. Puoi ritrovarli e tornare alla loro pagina.</p>
        : <ol className="originali-lista">{ordinati.map((s) => <li key={s.id}>
          <div className="row-between"><button className="btn btn-sm btn-ghost originali-vai-segno" onClick={() => { annullaSelezione(); salta(s.pagina); }}>Pagina {s.pagina}<Icon n="freccia" size={13} /></button>
            <button className="btn btn-sm btn-ghost" aria-label={`Rimuovi il segno a pagina ${s.pagina}: ${s.testo.slice(0, 50)}`} onClick={() => {
              salvaEsito(rimuoviSegnoOriginale(slug, doc, s.id)); setRimossi((prev) => [...prev, s]);
            }}><Icon n="x" size={14} /></button></div>
          <p className={`originali-estratto ${s.colore}`}>{s.testo}</p><span className="small faint">{s.tipo === 'evidenziato' ? 'Evidenziato' : 'Sottolineato'} · {s.colore}</span>
        </li>)}</ol>}
    </aside>
  </div>;
}

export default function Originali() {
  const idx = useCorso(), slug = idx.corso.materia.slug;
  const documenti = useMemo(() => originaliMateria(slug), [slug]);
  const [scelto, setScelto] = useState(documenti[0]?.id ?? '');
  const doc = documenti.find((d) => d.id === scelto) ?? documenti[0], file = doc ? `${import.meta.env.BASE_URL}${doc.file}` : '';
  return <div className="page fade-in originali">
    <div className="eyebrow">{idx.corso.materia.nome}</div><h1 className="title-xl" style={{ margin: '6px 0 12px' }}>Originali</h1>
    <p className="muted originali-intro">Gli appunti e i riassunti da cui nasce il Percorso, da leggere e annotare.</p>
    {doc ? <>
      <div className="originali-documento card"><div className="originali-descrizione">
        <label className="eyebrow" htmlFor="originali-documento">Documento</label>
        <select id="originali-documento" className="select" value={doc.id} onChange={(e) => setScelto(e.target.value)} aria-label="Scegli il documento originale">
          {documenti.map((d) => <option key={d.id} value={d.id}>{d.titolo}</option>)}
        </select><p className="small muted">{doc.descrizione}</p>
      </div><div className="originali-file">
        <a className="btn btn-sm" href={file} target="_blank" rel="noopener noreferrer"><Icon n="espandi" size={16} />Apri PDF</a>
        <a className="btn btn-sm" href={file} download><Icon n="scarica" size={16} />Scarica originale</a>
        <span className="small faint">PDF senza evidenziazioni o sottolineature</span>
      </div></div>
      <LettoreOriginale key={`${slug}-${doc.id}`} slug={slug} doc={doc} />
    </> : <div className="card"><p className="muted">Non ci sono ancora documenti originali per questa materia.</p></div>}
  </div>;
}
