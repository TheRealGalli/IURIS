import { useCompact, useMobileNavigation } from '../components/MobileSheet';
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../components/ui';
import { useConceptPop } from '../components/ConceptPop';
import { useCorso } from '../lib/data';
import { href, vai } from '../lib/router';
import { COLORI_SEGNO, cronologiaSegni, type DocumentoOriginale, type SegnoOriginale } from '../lib/originali';
import { aggiungiSegnoTestoOriginale, annullaSegnoOriginale, ripristinaSegnoOriginale, rimuoviSegniOriginali, salvaSezioneTestoOriginale, segnaStudiata, useProgresso } from '../lib/store';
import { idsSegniNellaSelezioneTesto, proiettaSegniTesto, statoStudioSezione, type DocumentoLettura, type SezioneLettura, type IndiceSezioneLettura } from '../lib/letture';
import { caricaSezioneLettura, catturaAncoreTesto, creaAnteprimaTestoNativa, htmlConSegni, linkTesto, preparaBlocchi, rettangoliRangeTesto, sezionePerPagina, type BloccoPronto, type SegnoBlocco } from '../lib/letture-client';
import { useMappaGeometrica } from '../lib/letture-hooks';
import MappaGeometrica from '../components/MappaGeometrica';
import { ordinaSegniNelTesto } from '../lib/ordine-segni';
import './LettoreTesto.css';

type Strumento = SegnoOriginale['tipo'] | 'gomma';
type Bozza = NonNullable<ReturnType<typeof catturaAncoreTesto>>;
const VUOTI: SegnoOriginale[] = [], NESSUN_SEGNO: SegnoBlocco[] = [];
const COLORI = COLORI_SEGNO;
/** Dito o Apple Pencil: i messaggi parlano di «tocca Salva» invece che di Invio e Spazio. */
const touch = () => typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
type PuntoTesto = { node: Node; offset: number };
/** Punto del testo sotto le coordinate (WebKit/Blink e Firefox hanno due API diverse). */
function puntoTesto(x: number, y: number): PuntoTesto | null {
  const d = document as Document & { caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null };
  if (d.caretPositionFromPoint) { const p = d.caretPositionFromPoint(x, y); return p ? { node: p.offsetNode, offset: p.offset } : null; }
  const r = document.caretRangeFromPoint?.(x, y); return r ? { node: r.startContainer, offset: r.startOffset } : null;
}

const Paragrafo = memo(function Paragrafo({ blocco, segni }: { blocco: BloccoPronto; segni: SegnoBlocco[] }) {
  const html = useMemo(() => htmlConSegni(blocco.html, segni), [blocco, segni]);
  return <section className="lettura-paragrafo" data-pagina={blocco.pagina}>
    <div id={`lettura-${blocco.id}`} data-lettura-block={blocco.id} data-pagina={blocco.pagina} dangerouslySetInnerHTML={{ __html: html }} />
    {blocco.notaRevisione && <details className="lettura-nota"><summary>Nota sul testo</summary><p>{blocco.notaRevisione}</p></details>}
  </section>;
});

export default function LettoreTesto({ doc, documento, documenti, scegli, sezioneId, bloccoFocus, segnoFocus, paginaFocus }: {
  doc: DocumentoOriginale; documento: DocumentoLettura; documenti: DocumentoOriginale[];
  scegli: (id: string) => void; sezioneId?: string; bloccoFocus?: string; segnoFocus?: string; paginaFocus?: number;
}) {
  const idx = useCorso(), slug = idx.corso.materia.slug, p = useProgresso(slug), lettura = p.originali?.[doc.id];
  const segni = lettura?.segni ?? VUOTI;
  const meta = documento.sezioni.find((s) => s.id === sezioneId) ?? documento.sezioni.find((s) => s.id === lettura?.sezioneTesto) ?? documento.sezioni[0];
  return <SezioneTesto key={`${doc.id}:${meta.id}`} {...{ doc, documento, documenti, scegli, bloccoFocus, segnoFocus, paginaFocus }} meta={meta} segni={segni} />;
}

function SezioneTesto({ doc, documento, documenti, scegli, meta, segni, bloccoFocus, segnoFocus, paginaFocus }: {
  doc: DocumentoOriginale; documento: DocumentoLettura; documenti: DocumentoOriginale[]; scegli: (id: string) => void;
  meta: IndiceSezioneLettura; segni: SegnoOriginale[]; bloccoFocus?: string; segnoFocus?: string; paginaFocus?: number;
}) {
  const mobile = useMobileNavigation(), compact = useCompact();
  const idx = useCorso(), slug = idx.corso.materia.slug, p = useProgresso(slug), lettura = p.originali?.[doc.id];
  const [sezione, setSezione] = useState<SezioneLettura | null>(null), [errore, setErrore] = useState('');
  const [tentativo, setTentativo] = useState(0);
  const [tipo, setTipo] = useState<Strumento>('evidenziato'), [colore, setColore] = useState<SegnoOriginale['colore']>('giallo');
  const [pannello, setPannello] = useState<'segni' | 'mappa' | 'fonti' | null>(null);
  const [haBozza, setHaBozza] = useState(false), bozzaRef = useRef<Bozza | null>(null);
  const [messaggio, setMessaggio] = useState(''), [erroreSalvataggio, setErroreSalvataggio] = useState(false);
  const [selezionando, setSelezionando] = useState(false), gesto = useRef(false);
  const [coloriAperti, setColoriAperti] = useState(false), applicaRef = useRef<() => boolean>(() => false);
  const spazio = useRef<HTMLDivElement>(null), viewport = useRef<HTMLDivElement>(null), articolo = useRef<HTMLElement>(null);
  const anteprima = useRef<HTMLDivElement>(null), selezioneFrame = useRef(0);
  const nativa = useMemo(creaAnteprimaTestoNativa, []);
  const segniResi = useRef(segni), strumento = useRef(tipo);
  strumento.current = tipo;
  // I nodi selezionati restano stabili anche se il segnalibro aggiorna i progressi.
  if (!gesto.current && !bozzaRef.current) segniResi.current = segni;
  const segniVisibili = segniResi.current;
  const chiudiPannello = useRef<HTMLButtonElement>(null);
  const fineGesto = useRef<ReturnType<typeof setTimeout>>(), posizioneTimer = useRef<ReturnType<typeof setTimeout>>();
  const ultimoBlocco = useRef(lettura?.sezioneTesto === meta.id ? lettura.bloccoTesto : undefined);
  const scrollFrame = useRef(0), pronto = useRef(false), primaPosizione = useRef(ultimoBlocco.current);
  const geo = useMappaGeometrica();
  const pop = useConceptPop(articolo, { hover: false, rispettaSelezione: true });

  useEffect(() => {
    let annullato = false; setErrore(''); setSezione(null);
    caricaSezioneLettura(meta).then((s) => { if (!annullato) setSezione(s); }).catch((e) => { if (!annullato) setErrore((e as Error).message); });
    return () => { annullato = true; };
  }, [meta, tentativo]);
  const blocchi = useMemo(() => sezione ? preparaBlocchi(sezione, idx.concettoById) : [], [sezione, idx]);
  const proiezioni = useMemo(() => proiettaSegniTesto(segniVisibili, blocchi, documento.edizione, meta), [segniVisibili, blocchi, documento.edizione, meta]);
  const perBlocco = useMemo(() => {
    const m = new Map<string, SegnoBlocco[]>();
    for (const pr of proiezioni) if (pr.stato === 'proiettato') for (const a of pr.ancore) {
      const list = m.get(a.blocco) ?? []; list.push({ segno: pr.segno, ancora: a }); m.set(a.blocco, list);
    }
    return m;
  }, [proiezioni]);
  const cronologia = useMemo(() => cronologiaSegni(lettura), [lettura]);
  const pdfQui = proiezioni.filter((pr) => pr.origine === 'pdf' && pr.stato === 'proiettato').length;
  const daVerificare = proiezioni.filter((pr) => pr.stato === 'da-verificare');
  const indice = documento.sezioni.findIndex((s) => s.id === meta.id);
  const studio = statoStudioSezione(meta, p.lezioni);
  const lezioniQui = studio.ids.map((id) => idx.lezioneById.get(id)).filter((l) => !!l);
  const lezione = lezioniQui[0];
  // Un solo stato: il comando segna (o toglie) «Studiata» su tutte le lezioni della sezione, come nel Percorso.
  const segnaSezione = () => { for (const l of lezioniQui) segnaStudiata(slug, l.id, !studio.studiata, (idx.domandePerLezione.get(l.id) ?? []).map((q) => q.id)); };
  const indiceBlocchi = useMemo(() => new Map(blocchi.map((b, i) => [b.id, i])), [blocchi]);
  const ordinati = useMemo(() => ordinaSegniNelTesto(segni, (id) => indiceBlocchi.get(id)), [segni, indiceBlocchi]);
  const esito = useCallback((salvato: boolean) => setErroreSalvataggio(!salvato), []);
  const disegnaBozza = useCallback((nuova: Bozza | null) => {
    const el = articolo.current, overlay = anteprima.current;
    if (!el || !overlay) return;
    if (!nuova) { nativa.cancella(); overlay.replaceChildren(); el.dataset.bozza = 'false'; return; }
    if (nativa.mostra(nuova.ranges)) { overlay.replaceChildren(); el.dataset.bozza = 'true'; return; }
    nativa.cancella();
    const rects = rettangoliRangeTesto(nuova.ranges, el), frammento = document.createDocumentFragment();
    for (const r of rects) {
      const span = document.createElement('span');
      span.style.left = `${r.x}px`; span.style.top = `${r.y}px`; span.style.width = `${r.w}px`; span.style.height = `${r.h}px`;
      frammento.append(span);
    }
    overlay.replaceChildren(frammento); el.dataset.bozza = rects.length ? 'true' : 'false';
  }, [nativa]);
  const impostaBozza = useCallback((nuova: Bozza | null, pubblica = true) => {
    bozzaRef.current = nuova; disegnaBozza(nuova);
    if (pubblica) setHaBozza(!!nuova);
  }, [disegnaBozza]);
  const annullaSelezione = useCallback(() => {
    cancelAnimationFrame(selezioneFrame.current); selezioneFrame.current = 0; clearTimeout(fineGesto.current);
    gesto.current = false; setSelezionando(false);
    impostaBozza(null); window.getSelection()?.removeAllRanges(); setMessaggio('');
  }, [impostaBozza]);
  const cattura = useCallback((pubblica = true) => {
    if (!articolo.current) return null;
    const nuova = catturaAncoreTesto(articolo.current, documento.edizione, { geometria: false });
    if (nuova) { impostaBozza(nuova, pubblica); if (pubblica) setMessaggio(''); }
    return nuova;
  }, [documento.edizione, impostaBozza]);
  const cancella = useCallback((scelta: Bozza) => {
    const ids = idsSegniNellaSelezioneTesto(proiezioni, scelta.ancore);
    annullaSelezione();
    const r = rimuoviSegniOriginali(slug, doc, ids); esito(r.salvato);
    setMessaggio(r.rimossi ? `${r.rimossi === 1 ? 'Segno rimosso' : `${r.rimossi} segni rimossi`}. La mappa è aggiornata.` : 'Nessun segno in questo passaggio.');
    return true;
  }, [proiezioni, annullaSelezione, slug, doc, esito]);
  const applica = useCallback(() => {
    const scelta = cattura() ?? bozzaRef.current;
    if (!scelta) return false;
    if (tipo === 'gomma') return cancella(scelta);
    annullaSelezione();
    try {
      const r = aggiungiSegnoTestoOriginale(slug, doc, { pagina: scelta.pagina, testo: scelta.testo, tipo, colore, ancoreTesto: scelta.ancore });
      esito(r.salvato); setMessaggio(r.salvato ? 'Segno salvato nella lettura e nella mappa personale.' : 'Segno conservato per questa sessione.'); return true;
    } catch { setMessaggio('Il segno non è stato creato. Seleziona di nuovo il passaggio.'); return false; }
  }, [cattura, tipo, cancella, annullaSelezione, slug, doc, colore, esito]);
  applicaRef.current = applica;
  const attivaGomma = useCallback(() => {
    setTipo('gomma'); const scelta = cattura() ?? bozzaRef.current;
    if (scelta) cancella(scelta); else setMessaggio('Gomma attiva: seleziona il passaggio da cancellare.');
  }, [cattura, cancella]);
  const storia = useCallback((direzione: 'indietro' | 'avanti') => {
    annullaSelezione(); const r = direzione === 'indietro' ? annullaSegnoOriginale(slug, doc) : ripristinaSegnoOriginale(slug, doc);
    esito(r.salvato); if (r.eseguito) setMessaggio(direzione === 'indietro' ? 'Modifica annullata. Mappa aggiornata.' : 'Modifica ripristinata. Mappa aggiornata.');
  }, [annullaSelezione, slug, doc, esito]);
  useEffect(() => {
    const termina = (e: Event) => {
      if (!gesto.current) return;
      clearTimeout(fineGesto.current); cancelAnimationFrame(selezioneFrame.current); selezioneFrame.current = 0;
      fineGesto.current = setTimeout(() => {
        const s = cattura(false);
        gesto.current = false; setSelezionando(false); setHaBozza(!!bozzaRef.current);
        if (e.type === 'pointerup' && strumento.current === 'gomma' && s) cancella(s);
      }, 0);
    };
    const selezione = () => {
      if (selezioneFrame.current) return;
      selezioneFrame.current = requestAnimationFrame(() => {
        selezioneFrame.current = 0;
        // Nessuna riscrittura dei paragrafi o setState a ogni movimento del dito/mouse.
        cattura(!gesto.current);
      });
    };
    document.addEventListener('pointerup', termina); document.addEventListener('pointercancel', termina); window.addEventListener('blur', termina);
    document.addEventListener('selectionchange', selezione);
    return () => { document.removeEventListener('pointerup', termina); document.removeEventListener('pointercancel', termina); window.removeEventListener('blur', termina); document.removeEventListener('selectionchange', selezione); };
  }, [cattura, cancella]);
  // Apple Pencil (e penne in genere): passare sul testo seleziona il passaggio senza scorrere la pagina,
  // e al distacco il segno si salva subito. Il dito resta alla selezione nativa del sistema, poi «Salva».
  useEffect(() => {
    const el = articolo.current; if (!el) return;
    let inizio: PuntoTesto | null = null, id = -1;
    const nelTesto = (t: EventTarget | null) => t instanceof Element && !!t.closest('[data-lettura-block]');
    const stilo = (e: TouchEvent) => {
      const t = e.touches[0] as (Touch & { touchType?: string }) | undefined;
      if (e.touches.length === 1 && t?.touchType === 'stylus' && nelTesto(e.target)) e.preventDefault();
    };
    const giu = (e: PointerEvent) => {
      if (e.pointerType !== 'pen' || !nelTesto(e.target)) return;
      inizio = puntoTesto(e.clientX, e.clientY); id = inizio ? e.pointerId : -1;
      if (inizio) { window.getSelection()?.collapse(inizio.node, inizio.offset); try { el.setPointerCapture(e.pointerId); } catch { /* già catturato */ } }
    };
    const muovi = (e: PointerEvent) => {
      if (e.pointerId !== id || !inizio) return;
      const fine = puntoTesto(e.clientX, e.clientY); if (!fine || !el.contains(fine.node)) return;
      window.getSelection()?.setBaseAndExtent(inizio.node, inizio.offset, fine.node, fine.offset);
    };
    const su = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      id = -1; inizio = null;
      // Dopo la cattura del gesto (vedi «termina»): la gomma cancella da sé, gli altri strumenti salvano qui.
      if (e.type === 'pointerup' && strumento.current !== 'gomma') setTimeout(() => { if (!window.getSelection()?.isCollapsed) applicaRef.current(); }, 20);
    };
    el.addEventListener('touchstart', stilo, { passive: false }); el.addEventListener('touchmove', stilo, { passive: false });
    el.addEventListener('pointerdown', giu); el.addEventListener('pointermove', muovi); el.addEventListener('pointerup', su); el.addEventListener('pointercancel', su);
    return () => {
      el.removeEventListener('touchstart', stilo); el.removeEventListener('touchmove', stilo);
      el.removeEventListener('pointerdown', giu); el.removeEventListener('pointermove', muovi); el.removeEventListener('pointerup', su); el.removeEventListener('pointercancel', su);
    };
  }, [sezione]);
  useEffect(() => {
    const tastiera = (e: KeyboardEvent) => {
      const el = e.target instanceof Element ? e.target : null;
      if (!el || (!spazio.current?.contains(el) && el !== document.body) || el.closest('input,select,textarea,[contenteditable="true"]')) return;
      if ((e.metaKey || e.ctrlKey) && !e.altKey) {
        const key = e.key.toLowerCase();
        if (key === 'z') { e.preventDefault(); storia(e.shiftKey ? 'avanti' : 'indietro'); }
        else if (key === 'y') { e.preventDefault(); storia('avanti'); }
        return;
      }
      if (e.repeat || e.altKey || e.shiftKey || el.closest('.lettura-pannello')) return;
      if (['Escape', 'Delete', 'Backspace'].includes(e.key)) { if (bozzaRef.current || !window.getSelection()?.isCollapsed) { e.preventDefault(); annullaSelezione(); } return; }
      const key = e.key.toLowerCase();
      if (key === 'h' || key === 'u') { e.preventDefault(); setTipo(key === 'h' ? 'evidenziato' : 'sottolineato'); return; }
      if (key === 'e') { e.preventDefault(); attivaGomma(); return; }
      if (/^[1-6]$/.test(key) && !e.altKey) { e.preventDefault(); setColore(COLORI[Number(key) - 1]); return; }
      if (!el.closest('button,a') && (e.key === 'Enter' || e.key === ' ')) { if (applica()) e.preventDefault(); }
    };
    document.addEventListener('keydown', tastiera); return () => document.removeEventListener('keydown', tastiera);
  }, [storia, annullaSelezione, attivaGomma, applica]);
  useEffect(() => {
    if (!pannello) return;
    const prima = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    chiudiPannello.current?.focus({ preventScroll: true });
    const close = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); setPannello(null); } };
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('keydown', close); if (prima?.isConnected) prima.focus({ preventScroll: true }); };
  }, [pannello]);
  const alBlocco = useCallback((id: string | undefined) => {
    const el = id ? Array.from(articolo.current?.querySelectorAll<HTMLElement>('[data-lettura-block]') ?? []).find((n) => n.dataset.letturaBlock === id) : null;
    if (el) { el.scrollIntoView({ block: 'start', behavior: 'auto' }); ultimoBlocco.current = id; }
  }, []);
  useLayoutEffect(() => {
    if (!sezione || !blocchi.length) return;
    const pr = segnoFocus ? proiezioni.find((pr) => pr.segno.id === segnoFocus && pr.stato === 'proiettato') : undefined;
    const allaPagina = paginaFocus ? blocchi.find((b) => b.pagina >= paginaFocus)?.id : undefined;
    const target = bloccoFocus ?? pr?.ancore[0]?.blocco ?? allaPagina ?? primaPosizione.current;
    alBlocco(target); pronto.current = true;
    esito(salvaSezioneTestoOriginale(slug, doc, meta.id, target ?? blocchi[0].id));
  }, [sezione, bloccoFocus, segnoFocus, paginaFocus, alBlocco]);
  const scorri = () => {
    cancelAnimationFrame(scrollFrame.current);
    scrollFrame.current = requestAnimationFrame(() => {
      if (!pronto.current || !viewport.current || !articolo.current) return;
      const mira = viewport.current.getBoundingClientRect().top + 80;
      const visibile = Array.from(articolo.current.querySelectorAll<HTMLElement>('[data-lettura-block]')).find((el) => el.getBoundingClientRect().bottom >= mira);
      const id = visibile?.dataset.letturaBlock;
      if (!id || id === ultimoBlocco.current) return;
      ultimoBlocco.current = id; clearTimeout(posizioneTimer.current);
      posizioneTimer.current = setTimeout(() => esito(salvaSezioneTestoOriginale(slug, doc, meta.id, id)), 900);
    });
  };
  useEffect(() => () => {
    clearTimeout(fineGesto.current); clearTimeout(posizioneTimer.current); cancelAnimationFrame(scrollFrame.current); cancelAnimationFrame(selezioneFrame.current); nativa.cancella();
    if (pronto.current) salvaSezioneTestoOriginale(slug, doc, meta.id, ultimoBlocco.current);
  }, [slug, doc, meta.id, nativa]);
  useEffect(() => {
    if (!articolo.current) return;
    let larghezza = articolo.current.clientWidth;
    const observer = new ResizeObserver(() => {
      const w = articolo.current?.clientWidth ?? 0;
      if (w !== larghezza) { larghezza = w; annullaSelezione(); }
      else if (bozzaRef.current) disegnaBozza(bozzaRef.current);
    });
    observer.observe(articolo.current); return () => observer.disconnect();
  }, [sezione, annullaSelezione, disegnaBozza]);
  const scegliSezione = (id: string) => { annullaSelezione(); vai(linkTesto(doc.id, id)); };
  const apriSegno = (s: SegnoOriginale) => {
    const m = sezionePerPagina(documento, s.pagina);
    if (m) { const a = s.ancoreTesto?.[0]; vai(linkTesto(doc.id, m.id, a?.blocco, s.id)); setPannello(null); }
    else setMessaggio(`La pagina ${s.pagina} non ha testo: il segno resta salvato con la sua citazione.`);
  };

  return <div ref={spazio} className="originali lettura" data-strumento={tipo} data-colore={colore} data-selezionando={selezionando} data-bozza={haBozza} data-pannello={pannello ?? undefined}>
    <header className="originali-header">
      {compact && <button className="reader-mobile-menu mobile-icon" onClick={mobile.openMenu} aria-label="Apri menu"><Icon n="menu" size={21} /></button>}
      <h1>Originali</h1>
      <select className="select originali-documento-select" aria-label="Scegli il documento originale" value={doc.id} onChange={(e) => scegli(e.target.value)}>{documenti.map((d) => <option key={d.id} value={d.id}>{d.titolo}</option>)}</select>
      <button className="btn btn-sm originali-quadrato" aria-label={`Segni salvati (${segni.length})`} title="Segni salvati" onClick={() => setPannello(pannello === 'segni' ? null : 'segni')} aria-expanded={pannello === 'segni'}><Icon n="glossario" size={17} /></button>
      <button className="btn btn-sm originali-quadrato" aria-label="Mappa personale" title="Mappa personale" onClick={() => setPannello(pannello === 'mappa' ? null : 'mappa')} aria-expanded={pannello === 'mappa'}><Icon n="mappa" size={18} /></button>
      <button className="btn btn-sm originali-quadrato" aria-label="Fonti e scorciatoie" title="Fonti e scorciatoie" onClick={() => setPannello(pannello === 'fonti' ? null : 'fonti')} aria-expanded={pannello === 'fonti'}><Icon n="altro" size={19} /></button>
    </header>
    <div className="originali-barra lettura-barra">
      <div className="lettura-nav">
        <button className="btn btn-sm btn-ghost originali-quadrato" aria-label="Sezione precedente" disabled={indice <= 0} onClick={() => scegliSezione(documento.sezioni[indice - 1].id)}><Icon n="indietro" size={16} /></button>
        <select className="select lettura-sezione-select" aria-label="Sezione del testo" value={meta.id} onChange={(e) => scegliSezione(e.target.value)}>{documento.sezioni.map((s) => <option key={s.id} value={s.id}>{statoStudioSezione(s, p.lezioni).studiata ? '✓ ' : ''}{s.titolo}{s.soloTitolo ? ' · solo titolo nella fonte' : s.revisionata ? '' : ' · estratto'}</option>)}</select>
        <button className="btn btn-sm btn-ghost originali-quadrato" aria-label="Sezione successiva" disabled={indice >= documento.sezioni.length - 1} onClick={() => scegliSezione(documento.sezioni[indice + 1].id)}><Icon n="freccia" size={16} /></button>
      </div>
      <div className="lettura-attrezzi" role="toolbar" aria-label="Strumenti per segnare il testo">
      <div className="originali-cronologia"><button className="btn btn-sm btn-ghost originali-quadrato" aria-label="Annulla ultima modifica ai segni" title="Annulla (⌘Z / Ctrl+Z)" disabled={!cronologia.indietro.length} onClick={() => storia('indietro')}><Icon n="annulla" size={17} /></button><button className="btn btn-sm btn-ghost originali-quadrato" aria-label="Ripristina modifica ai segni" title="Ripristina (⌘⇧Z / Ctrl+Y)" disabled={!cronologia.avanti.length} onClick={() => storia('avanti')}><Icon n="ripristina" size={17} /></button></div>
      <div className="originali-strumenti" onMouseDown={(e) => { if ((e.target as Element).closest('button')) e.preventDefault(); }}>
        <button className={`btn btn-sm originali-quadrato ${tipo === 'evidenziato' ? 'originali-scelto' : 'btn-ghost'}`} aria-label="Evidenzia" title="Evidenzia (H)" aria-pressed={tipo === 'evidenziato'} onClick={() => setTipo('evidenziato')}><Icon n="evidenzia" size={18} /></button>
        <button className={`btn btn-sm originali-quadrato ${tipo === 'sottolineato' ? 'originali-scelto' : 'btn-ghost'}`} aria-label="Sottolinea" title="Sottolinea (U)" aria-pressed={tipo === 'sottolineato'} onClick={() => setTipo('sottolineato')}><Icon n="sottolinea" size={18} /></button>
        <button className={`btn btn-sm originali-quadrato ${tipo === 'gomma' ? 'originali-scelto' : 'btn-ghost'}`} aria-label="Gomma" title="Gomma (E)" aria-pressed={tipo === 'gomma'} onClick={attivaGomma}><Icon n="gomma" size={18} /></button>
        <button className={`originali-colore lettura-colore-attivo ${colore}`} aria-label={`Colore: ${colore}. Cambia colore`} aria-expanded={coloriAperti} onClick={() => setColoriAperti((v) => !v)} />
        <div className={`originali-colori${coloriAperti ? ' aperti' : ''}`}>{COLORI.map((c) => <button key={c} className={`originali-colore ${c}`} aria-label={c[0].toUpperCase() + c.slice(1)} title={`${c[0].toUpperCase() + c.slice(1)} (${COLORI.indexOf(c) + 1})`} aria-pressed={c === colore} onClick={() => { setColore(c); setColoriAperti(false); }} />)}</div>
        <button className="btn btn-sm originali-quadrato lettura-salva" aria-label={tipo === 'gomma' ? 'Applica gomma' : 'Salva segno'} title="Applica al passaggio (Invio o Spazio)" disabled={!haBozza} onClick={applica}><Icon n={tipo === 'gomma' ? 'check' : 'salva'} size={18} /><span className="lettura-salva-testo">{tipo === 'gomma' ? 'Cancella' : 'Salva'}</span></button>
      </div>
      </div>
    </div>
    <div className="lettura-layout">
      <div ref={viewport} className="lettura-viewport" tabIndex={0} aria-label="Testo del documento, scorri per leggere" onScroll={scorri}>
        {errore ? <div className="empty"><p role="alert">{errore}</p><button className="btn" onClick={() => setTentativo((v) => v + 1)}>Riprova</button></div> : !sezione ? <div className="empty faint" role="status">Apertura del testo…</div> : <article ref={articolo} className="lettura-articolo prose" onPointerDown={(e) => {
          if (!(e.target as Element).closest('[data-lettura-block]')) return;
          if (e.button !== 0 || e.isPrimary === false) return;
          gesto.current = true; setSelezionando(true); clearTimeout(fineGesto.current); cancelAnimationFrame(selezioneFrame.current); selezioneFrame.current = 0;
          impostaBozza(null); setMessaggio(''); viewport.current?.focus({ preventScroll: true });
        }}>
          <div className="lettura-intestazione" contentEditable={false}>
            <div className="eyebrow">{meta.soloTitolo ? 'Indice della fonte' : doc.tipoFonte === 'manuale-ricostruito' ? 'Ricostruzione dal Percorso' : meta.revisionata ? 'Testo revisionato con IA' : 'Testo estratto · revisione progressiva'} · {meta.manuale ? `manuale pp. ${meta.manuale[0]}–${meta.manuale[1]}` : `pp. ${meta.da}–${meta.a}`}</div>
            <h2 className="title-l">{meta.titolo}</h2>
            {meta.integrazione && <div className="card-flat small"><p>In queste pagine gli appunti riportano soltanto il titolo del capitolo. La lezione completa, ricostruita nel Percorso, è disponibile nel fascicolo integrativo.</p><a className="btn btn-sm" href={linkTesto(meta.integrazione.documento, meta.integrazione.sezione)}>Leggi la lezione completa<Icon n="freccia" size={14} /></a></div>}
            {doc.tipoFonte === 'manuale-ricostruito' && <p className="small muted">Testo e note ripresi dalla ricostruzione del Percorso, con assistenza dell’IA. I riferimenti al manuale permettono di verificarne i contenuti.</p>}
            {lezione && !meta.soloTitolo && <div className="row lettura-rimandi"><a className="btn btn-sm" href={href(`/lezione/${lezione.id}`)}>Nel Percorso<Icon n="freccia" size={14} /></a><a className="btn btn-sm btn-ghost" href={href(`/allena?l=${lezione.id}`)}>Quiz della lezione</a><button className={`btn btn-sm ${studio.studiata ? 'btn-ok' : 'btn-ghost'}`} title={lezioniQui.length > 1 ? `Vale per le ${lezioniQui.length} lezioni di questa sezione, anche nel Percorso` : 'Vale anche nel Percorso'} onClick={segnaSezione}><Icon n="check" size={14} />{studio.studiata ? 'Studiata' : studio.parziale ? `Studiate ${studio.studiate.length} di ${lezioniQui.length}` : 'Segna come studiata'}</button></div>}
            {pdfQui > 0 && <p className="tiny faint lettura-recupero">{pdfQui} {pdfQui === 1 ? 'segno fatto sul vecchio lettore PDF recuperato' : 'segni fatti sul vecchio lettore PDF recuperati'} nel testo.</p>}
            {daVerificare.length > 0 && <div className="lettura-recupero small">{daVerificare.length} {daVerificare.length === 1 ? 'segno del vecchio lettore PDF non ha' : 'segni del vecchio lettore PDF non hanno'} una corrispondenza univoca in questo testo: {daVerificare.length === 1 ? 'resta salvato' : 'restano salvati'} con la citazione tra i segni. <button className="btn btn-sm btn-ghost" onClick={() => setPannello('segni')}>Vedi i segni</button></div>}
          </div>
          {blocchi.map((b, i) => <div key={b.id} className="lettura-gruppo">
            {(i === 0 || blocchi[i - 1].pagina !== b.pagina) && <div className="lettura-fonte-pagina" aria-label={doc.tipoFonte === 'manuale-ricostruito' ? `Sezione ${b.pagina} dell’integrazione` : `Pagina ${b.pagina} della fonte`}>{doc.tipoFonte === 'manuale-ricostruito' ? `Sezione ${b.pagina}` : `p. ${b.pagina}`}</div>}
            <Paragrafo blocco={b} segni={perBlocco.get(b.id) ?? NESSUN_SEGNO} />
          </div>)}
          <div ref={anteprima} className={`lettura-bozza ${tipo} ${colore}`} aria-hidden="true" />
          <div className="lettura-fine"><span className="tiny faint">Fonte e note editoriali dal menu ⋯. Segni e mappa sono inclusi nel backup completo.</span>{indice < documento.sezioni.length - 1 && <button className="btn" onClick={() => scegliSezione(documento.sezioni[indice + 1].id)}>Prosegui<Icon n="freccia" size={16} /></button>}</div>
        </article>}
      </div>
      {pannello && <aside className={`lettura-pannello ${pannello === 'mappa' ? 'lettura-pannello-mappa' : ''}`} aria-label={pannello === 'mappa' ? 'Mappa personale della lettura' : pannello === 'segni' ? 'Segni salvati' : 'Fonti e scorciatoie'}>
        <header><h2 className="title-s">{pannello === 'mappa' ? 'Mappa personale' : pannello === 'segni' ? `Segni salvati (${segni.length})` : 'Fonte e comandi'}</h2><button ref={chiudiPannello} className="btn btn-sm btn-ghost originali-quadrato" aria-label="Chiudi pannello" onClick={() => setPannello(null)}><Icon n="x" size={17} /></button></header>
        <div className="lettura-pannello-body">
          {pannello === 'mappa' ? <><a className="btn btn-sm" href={href('/mappa?personale=1')}>Apri la mappa completa<Icon n="freccia" size={14} /></a><MappaGeometrica compatta sezioni={geo.sezioni} totale={geo.totale} nonCollegati={geo.nonCollegati} sezioneIniziale={`${doc.id}/${meta.id}`} onApri={(h) => { vai(h); setPannello(null); }} /></>
            : pannello === 'fonti' ? <><h3 className="title-s">{doc.titolo}</h3><p className="small muted">{doc.descrizione}</p><p className="small muted">Rielaborazione e revisione assistite dall’IA. La verifica umana integrale dei contenuti è ancora da completare.</p><p className="small muted">{doc.tipoFonte === 'manuale-ricostruito' ? 'Questa raccolta riprende le lezioni ricostruite del Percorso, con i riferimenti al manuale e le relative note. Evidenziazioni e stato Studiata funzionano come negli altri testi.' : 'Il testo è estratto dagli appunti. Le sezioni seguono le lezioni del Percorso, con correzioni puntuali documentate, impaginazione e collegamenti al glossario. Dove la fonte contiene solo un titolo, il rimando apre la lezione ricostruita nel fascicolo integrativo.'}</p>{doc.file && <><a className="btn btn-sm" href={`${import.meta.env.BASE_URL}${doc.file}`} download><Icon n="scarica" size={15} />Consulta la fonte PDF originale</a><p className="tiny faint">Il PDF scaricato non contiene i segni personali: sono nel backup completo.</p></>}<hr className="sep" /><h3 className="title-s">Su iPad e telefono</h3><p className="small muted">Con il dito tieni premuto su una parola, allarga la selezione con le maniglie e tocca Salva. Con Apple Pencil passa sopra il testo: il segno si salva appena sollevi la punta. La gomma funziona allo stesso modo.</p><div className="reader-mobile-history"><button className="btn btn-sm" disabled={!cronologia.indietro.length} onClick={() => storia('indietro')}><Icon n="annulla" size={17} />Annulla</button><button data-mobile-redo className="btn btn-sm" disabled={!cronologia.avanti.length} onClick={() => storia('avanti')}><Icon n="ripristina" size={17} />Ripristina</button></div><h3 className="title-s">Scorciatoie</h3><dl className="originali-scorciatoie"><dt>Invio / Spazio</dt><dd>Salva o applica la gomma</dd><dt>Esc / Canc / ⌫</dt><dd>Annulla la selezione</dd><dt>H / U / E</dt><dd>Evidenzia / sottolinea / gomma</dd><dt>1 – 6</dt><dd>Giallo, verde, rosa, azzurro, viola, arancio</dd><dt>⌘Z / Ctrl+Z</dt><dd>Annulla</dd><dt>⌘⇧Z / Ctrl+Y</dt><dd>Ripristina</dd></dl><p className="tiny faint">Le parole collegate aprono il glossario con un clic. Le annotazioni aggiornano la mappa personale e restano nel backup unico.</p></>
              : <>{!ordinati.length ? <p className="small muted">Seleziona un passaggio e salvalo per ritrovarlo qui e nella mappa.</p> : <ol className="originali-lista">{ordinati.map((s) => <li key={s.id}><div className="row-between"><button className="btn btn-sm btn-ghost" onClick={() => apriSegno(s)}>{doc.tipoFonte === 'manuale-ricostruito' ? 'Sezione' : 'Pagina'} {s.pagina}<Icon n="freccia" size={13} /></button><button className="btn btn-sm btn-ghost originali-quadrato" aria-label={`Rimuovi segno: ${s.testo.slice(0, 45)}`} onClick={() => { annullaSelezione(); const r = rimuoviSegniOriginali(slug, doc, [s.id]); esito(r.salvato); setMessaggio('Segno rimosso. La mappa è aggiornata.'); }}><Icon n="x" size={14} /></button></div><p className={`originali-estratto ${s.colore}`}>{s.testo}</p><span className="tiny faint">{s.tipo === 'evidenziato' ? 'Evidenziato' : 'Sottolineato'} · {s.ancoreTesto?.length ? 'testo' : 'dal PDF'}</span></li>)}</ol>}</>}
        </div>
      </aside>}
    </div>
    {pop}
    <div className="originali-feedback" role="status" aria-live="polite">{messaggio || (haBozza ? (touch() ? `Passaggio selezionato · tocca ${tipo === 'gomma' ? 'Cancella' : 'Salva'}` : 'Passaggio selezionato · Invio o Spazio per salvare') : '')}</div>
    {erroreSalvataggio && <div className="originali-avviso" role="alert">Il browser non ha salvato gli ultimi cambiamenti sul dispositivo. Restano disponibili in questa sessione: conservarli dalla sezione <a href={href('/backup')}>Backup</a>.</div>}
  </div>;
}
