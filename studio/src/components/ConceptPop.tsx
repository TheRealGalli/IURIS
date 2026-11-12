import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { useCorso } from '../lib/data';
import { padronanza } from '../lib/srs';
import { useProgresso } from '../lib/store';
import { href } from '../lib/router';
import { TIPO_SINGOLARE } from '../lib/types';
import { LivelloDot } from './ui';
import { caricaArticolo, testoBreve, type SchedaArticolo } from '../lib/articoli';

/**
 * Popover per i link ai concetti (a.cx) dentro un contenitore: al clic (o al passaggio del mouse su desktop)
 * mostra nome, tipo e definizione breve senza lasciare la pagina.
 * Vale anche per le citazioni di articoli (a.ax, «art. 3 Cost.», «art. 1321 c.c.»): al passaggio del mouse compare la
 * scheda dell'articolo con il testo breve, anche quando l'atto sta in un'altra materia; il clic apre l'articolo
 * (se la materia non fa parte del corso scelto, il clic mostra la scheda con il testo intero).
 */
type Stato = { x: number; y: number; sopra: boolean } & ({ tipo: 'c'; id: string } | { tipo: 'a'; id: string; materia?: string; fuori: boolean });

const posizione = (s: Stato) => (s.sopra ? { left: s.x, bottom: s.y } : { left: s.x, top: s.y });

export function useConceptPop(ref: RefObject<HTMLElement>, opzioni?: { hover?: boolean; rispettaSelezione?: boolean }) {
  const idx = useCorso();
  const p = useProgresso(idx.corso.materia.slug);
  const [stato, setStato] = useState<Stato | null>(null);
  const [articolo, setArticolo] = useState<{ chiave: string; scheda: SchedaArticolo | null } | null>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number>();

  const apri = useCallback((a: HTMLElement) => {
    const r = a.getBoundingClientRect();
    const w = Math.min(340, window.innerWidth - 24);
    const x = Math.max(12, Math.min(r.left, window.innerWidth - w - 12));
    const sotto = r.bottom + 220 < window.innerHeight;
    // sotto la parola se c'è posto, altrimenti sopra (ancorata al bordo inferiore: l'altezza della scheda varia)
    const dove = { x, y: sotto ? r.bottom + 8 : Math.max(12, window.innerHeight - r.top + 8), sopra: !sotto };
    if (a.classList.contains('ax')) setStato({ tipo: 'a', id: a.dataset.art!, materia: a.dataset.materia, fuori: !!a.dataset.fuori, ...dove });
    else setStato({ tipo: 'c', id: a.dataset.c!, ...dove });
  }, []);

  useEffect(() => {
    const hover = opzioni?.hover !== false && window.matchMedia('(hover: hover)').matches;
    // Ascolto sul documento e filtro sul contenitore: funziona anche quando il testo compare dopo il primo render
    // (gli Originali si caricano in modo asincrono e il ref era ancora vuoto quando si agganciavano gli ascoltatori).
    const link = (e: Event) => {
      const a = (e.target as HTMLElement | null)?.closest?.('a.cx, a.ax[data-art]') as HTMLElement | null;
      return a && ref.current?.contains(a) ? a : null;
    };
    const onClick = (e: MouseEvent) => {
      const a = link(e);
      if (!a) return;
      // una citazione di articolo si apre come un collegamento normale; resta qui solo se l'atto è fuori dal corso
      if (a.classList.contains('ax') && !a.dataset.fuori) { clearTimeout(timer.current); setStato(null); return; }
      e.preventDefault();
      if (opzioni?.rispettaSelezione && !window.getSelection()?.isCollapsed) return;
      apri(a);
    };
    // Solo il mouse apre l'anteprima al passaggio: dito e Apple Pencil (che nei testi traccia i segni) restano al clic.
    // Durante una selezione o un trascinamento l'anteprima non si apre, per non coprire il testo che si sta segnando.
    const onOver = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.buttons) return;
      const a = link(e);
      if (!a) return;
      if (opzioni?.rispettaSelezione && !window.getSelection()?.isCollapsed) return;
      clearTimeout(timer.current);
      timer.current = window.setTimeout(() => apri(a), 260);
    };
    const onOut = (e: PointerEvent) => {
      if (link(e)) clearTimeout(timer.current);
    };
    document.addEventListener('click', onClick);
    if (hover) { document.addEventListener('pointerover', onOver); document.addEventListener('pointerout', onOut); }
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('pointerover', onOver);
      document.removeEventListener('pointerout', onOut);
      clearTimeout(timer.current);
    };
  }, [ref, apri, opzioni?.hover, opzioni?.rispettaSelezione]);

  useEffect(() => {
    if (!stato) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent) { if (e.key === 'Escape') setStato(null); return; }
      const t = e.target as HTMLElement;
      if (popRef.current?.contains(t) || t.closest('a.cx, a.ax')) return;
      setStato(null);
    };
    const onScroll = () => setStato(null);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [stato]);

  // il testo dell'articolo arriva dalla materia che ospita l'atto (scaricata alla prima citazione)
  const chiave = stato?.tipo === 'a' ? `${stato.materia ?? ''}/${stato.id}` : null;
  useEffect(() => {
    if (!chiave || stato?.tipo !== 'a') return;
    let vivo = true;
    caricaArticolo(idx, stato.id, stato.materia).then((scheda) => { if (vivo) setArticolo({ chiave, scheda }); })
      .catch(() => { if (vivo) setArticolo({ chiave, scheda: null }); });
    return () => { vivo = false; };
  }, [chiave, idx]);

  if (stato?.tipo === 'a') {
    const pronta = articolo?.chiave === chiave ? articolo : null;
    const scheda = pronta?.scheda;
    // l'atto non si trova (materia non ancora pubblicata, articolo inesistente): nessuna scheda vuota
    if (pronta && !scheda) return null;
    const breve = scheda ? (stato.fuori ? { testo: scheda.commi, tagliato: false } : testoBreve(scheda.commi)) : null;
    return (
      <div ref={popRef} className={`pop pop-articolo fade-in${stato.fuori ? ' pop-articolo-intero' : ''}`} style={posizione(stato)} role="dialog" aria-label={scheda ? `${scheda.etichetta} ${scheda.atto}` : 'Articolo'}>
        {!scheda ? <div className="faint small" role="status">Apertura dell'articolo…</div> : (
          <>
            <div className="row" style={{ gap: 8 }}>
              <span className="eyebrow">{scheda.atto}</span>
              {scheda.abrogato && <span className="chip">abrogato</span>}
            </div>
            <h4>{scheda.etichetta}{scheda.tema ? <span className="pop-tema"> · {scheda.tema}</span> : null}</h4>
            <div className="pop-commi">{breve!.testo.map((t, i) => <p key={i}>{t}</p>)}</div>
            {!stato.fuori && (
              <div className="row" style={{ marginTop: 10 }}>
                <a className="btn btn-sm" href={href(`/norme/${stato.id}`)} data-materia={stato.materia} onClick={() => setStato(null)}>
                  {breve!.tagliato ? 'Leggi tutto l\'articolo' : 'Apri l\'articolo'}
                </a>
              </div>
            )}
          </>
        )}
      </div>
    );
  }
  const c = stato ? idx.concettoById.get(stato.id) : null;
  if (!stato || !c) return null;
  const m = padronanza(p, idx.domandePerConcetto.get(c.id));
  return (
    <div ref={popRef} className="pop fade-in" style={posizione(stato)}>
      <div className="row" style={{ gap: 8 }}>
        <span className="eyebrow">{TIPO_SINGOLARE[c.tipo] ?? c.tipo}</span>
        {m.totali > 0 && <LivelloDot valore={m.media} viste={m.viste} />}
      </div>
      <h4>{c.nome}</h4>
      {c.latino && c.latino !== c.nome && <div className="faint small" style={{ fontStyle: 'italic', marginBottom: 4 }}>{c.latino}</div>}
      <div className="muted">{c.breve}</div>
      <div className="row" style={{ marginTop: 10 }}>
        <a className="btn btn-sm" href={href(`/concetto/${c.id}`)}>Apri la scheda</a>
        <a className="btn btn-sm btn-ghost" href={href(`/mappa?grafo=1&c=${c.id}`)}>Sulla mappa</a>
      </div>
    </div>
  );
}
