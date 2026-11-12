import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { livello, type Livello } from '../lib/srs';
import type { Progresso } from '../lib/store';
import { fmtMinuti, intervallo, isoDi } from '../lib/util';

const PATHS: Record<string, ReactNode> = {
  'materia-filosofia': <><path d="M8 21v-4l-3-2 1-3-1-2a7 7 0 1 1 13 3v8M8 21h10M9 8c0-2 6-2 6 1 0 2-3 2-3 4M12 15h.01" /></>,
  'materia-romano': <><path d="m3 8 9-5 9 5H3ZM4 11h16M5 11v7M10 11v7M14 11v7M19 11v7M3 19h18M2 22h20" /></>,
  'materia-costituzionale': <><path d="M6 3h10l3 3v15H5V3h1ZM15 3v4h4M8 11h8M8 14h8M8 17h5" /><path d="m9 5 1 .5 1-.5-.2 1.2.8.8-1.1.2-.5 1-.5-1L8.4 7l.8-.8Z" /></>,
  'materia-privato': <><path d="m3 10 4-4 4 1 3-1 7 5-4 7-3 2-7-4-4-6ZM8 8l-2 3M11 7l-3 4 2 2 4-3 5 4M12 14l4 3M10 17l3 2M3 10l-1 2 3 5 2-1M21 11l1 2-3 5-2-1" /></>,
  'materia-istituzioni': <><path d="M12 4v16M7 20h10M5 7h14M5 7l-3 6a3 3 0 0 0 6 0L5 7ZM19 7l-3 6a3 3 0 0 0 6 0l-3-6Z" /></>,
  'materia-storia': <><path d="M7 3h10M7 21h10M8 3v3.5c0 2 4 3.5 4 5.5s-4 3.5-4 5.5V21M16 3v3.5c0 2-4 3.5-4 5.5s4 3.5 4 5.5V21" /></>,
  'materia-informatica': <><rect x="3.5" y="4.5" width="17" height="11.5" rx="1.5" /><path d="M8 20h8M12 16v4M9 9l-2 1.5L9 12M15 9l2 1.5-2 1.5" /></>,
  'materia-inglese': <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3.2 3 3.2 15 0 18M12 3c-3.2 3-3.2 15 0 18" /></>,
  menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
  filtri: <><path d="M4 7h16M4 17h16" /><circle cx="9" cy="7" r="2" fill="var(--surface)" /><circle cx="15" cy="17" r="2" fill="var(--surface)" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7h.01" /></>,
  demo: <><circle cx="12" cy="12" r="9" /><path d="m10 8 6 4-6 4Z" /></>,
  oggi: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  percorso: <><path d="M4 19.5V5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2Z" /><path d="M8 7h7M8 11h5" /></>,
  mappa: <><circle cx="6" cy="6" r="2.5" /><circle cx="18" cy="7" r="2.5" /><circle cx="12" cy="18" r="2.5" /><path d="M8.2 7.2 15.6 7M7.3 8.3l3.6 7.5M16.8 9.2l-3.6 6.6" /></>,
  cronologia: <><path d="M3 12h18" /><circle cx="7" cy="12" r="2" /><circle cx="14" cy="12" r="2" /><path d="M7 6v4M14 14v4M19 8v8" /></>,
  glossario: <><path d="M4 4h10a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4Z" /><path d="M8 9h6M8 13h4" /></>,
  allena: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" /></>,
  progressi: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
  cerca: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  freccia: <path d="M5 12h14M13 6l6 6-6 6" />,
  indietro: <path d="M19 12H5M11 6l-6 6 6 6" />,
  annulla: <path d="m9 14-5-5 5-5M4 9h10a6 6 0 0 1 0 12h-2" />,
  ripristina: <path d="m15 14 5-5-5-5M20 9H10a6 6 0 0 0 0 12h2" />,
  evidenzia: <><path d="m5 15 9-11 6 5-9 11-6-5ZM5 15l-2 6 6-2M3 21h10M11 7l6 5" /></>,
  sottolinea: <><path d="M6 3v9a6 6 0 0 0 12 0V3M4 21h16" /></>,
  gomma: <><path d="m14 3 7 7-11 11H6l-5-5L14 3ZM8 9l7 7M10 21h12" /></>,
  salva: <><path d="M5 3h12l4 4v14H3V3h2ZM7 3v6h10V3M7 21v-8h10v8" /><path d="M14 5v2" /></>,
  invio: <path d="M20 5v8H5M10 8l-5 5 5 5" />,
  backup: <><path d="M4 7h16v14H4ZM3 3h18v4H3Z" /><path d="M9 12h6M12 11v6M9 14l3 3 3-3" /></>,
  su: <path d="M12 19V5M6 11l6-6 6 6" />,
  giu: <path d="M12 5v14M6 13l6 6 6-6" />,
  whatsapp: <><path d="M4.5 19.5 5.6 16A8 8 0 1 1 8.4 18.6Z" /><path d="M9.2 8.6c.2-.5.6-.6 1-.5l.7 1.6-.6.8c.5 1 1.3 1.8 2.3 2.3l.8-.6 1.6.7c.1.4 0 .8-.5 1-1.6.8-5-1.9-5.6-4.2-.1-.4.1-.8.3-1.1Z" /></>,
  scegli: <path d="m8 9.5 4-4 4 4M8 14.5l4 4 4-4" />,
  mic: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></>,
  voce: <><path d="M4 9v6h4l5 4V5L8 9Z" /><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" /></>,
  fiamma: <path d="M12 3c1 4 5 5.5 5 10a5 5 0 0 1-10 0c0-2.2 1.2-3.6 2.4-4.6.3 1.6 1.1 2.6 2.1 2.9C11 9 11 6 12 3Z" />,
  calendario: <><rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  libro: <><path d="M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5Z" /><path d="M12 6.5v13" /></>,
  espandi: <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />,
  albero: <><rect x="2.5" y="10" width="6" height="4" rx="1" /><rect x="15.5" y="4" width="6" height="4" rx="1" /><rect x="15.5" y="16" width="6" height="4" rx="1" /><path d="M8.5 12H12M12 6v12M12 6h3.5M12 18h3.5" /></>,
  schema: <><path d="M4 5h11M8 10h12M8 15h12M4 20h11M4 5v15" /></>,
  fasce: <><path d="M3.5 4.5h17" /><rect x="3.5" y="8" width="4.5" height="4" rx="1" /><rect x="9.75" y="8" width="4.5" height="4" rx="1" /><rect x="16" y="8" width="4.5" height="4" rx="1" /><path d="M3.5 15.5h17" /><rect x="3.5" y="18.5" width="4.5" height="2.5" rx="1" /><rect x="9.75" y="18.5" width="4.5" height="2.5" rx="1" /></>,
  legami: <><circle cx="6" cy="6" r="2.5" /><circle cx="6" cy="18" r="2.5" /><path d="M8.5 6c9 0 9 12 0 12" /></>,
  rami: <><path d="M4 12h6M10 12l4-6h6M10 12l4 6h6M10 12h10" /></>,
  occhio: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
  altro: <><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></>,
  scarica: <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />,
  carica: <path d="M12 20V9M7 14l5-5 5 5M5 4h14" />,
  esame: <><path d="M12 4 2 9l10 5 10-5-10-5Z" /><path d="M6 11.2V16c2.2 2 9.8 2 12 0v-4.8M22 9v5.5" /></>,
  avviso: <><path d="M10.3 4.2 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z" /><path d="M12 9.5v4M12 17.2h.01" /></>,
};

export function Icon({ n, size = 18, stroke = 1.8 }: { n: keyof typeof PATHS | string; size?: number; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: 'none' }}>
      {PATHS[n]}
    </svg>
  );
}

export function Ring({ value, size = 96, stroke = 9, color = 'var(--accent)', children }: {
  value: number; size?: number; stroke?: number; color?: string; children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - v)} style={{ transition: 'stroke-dashoffset .6s' }} />
      </svg>
      <div className="ring-label">{children}</div>
    </div>
  );
}

export function Bar({ value, tone = '', thin = false }: { value: number; tone?: '' | 'ok' | 'accent'; thin?: boolean }) {
  return <div className={`bar ${tone} ${thin ? 'thin' : ''}`}><span style={{ width: `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%` }} /></div>;
}

export function LivelloDot({ valore, viste }: { valore: number | null; viste?: number }) {
  const lv: Livello = livello(valore, viste);
  const title = lv === 'ignoto' ? 'Mai verificato' : `Sicurezza sulle domande viste: ${Math.round((valore ?? 0) * 100)}%`;
  return <span className={`dot lv-${lv}`} title={title} />;
}

/** Calendario a quadratini: un blocco per mese, da luglio 2026 a luglio 2029 inclusi.
 *  Più verde = più studio quel giorno; oggi è contornato, i giorni futuri sono vuoti, l'esame è il quadratino rosso. */
export function Calendario({ p, sel, onSelect, mesi = 3 }: { p: Progresso; sel?: string; onSelect?: (iso: string) => void; mesi?: number }) {
  const oggi = new Date();
  const oggiIso = isoDi(oggi);
  const primoDisponibile = 2026 * 12 + 6;
  const ultimoDisponibile = 2029 * 12 + 6;
  const nMesi = Math.min(ultimoDisponibile - primoDisponibile + 1, Math.max(1, Number.isFinite(mesi) ? Math.floor(mesi) : 3));
  const ultimoInizio = ultimoDisponibile - nMesi + 1;
  const limita = (mese: number) => Math.max(primoDisponibile, Math.min(ultimoInizio, mese));
  const [mese, setMese] = useState(() => limita(oggi.getFullYear() * 12 + oggi.getMonth()));
  const inizio = limita(mese);
  const dataEsame = p.esame ? new Date(`${p.esame}T12:00:00`) : null;
  const esame = dataEsame && Number.isFinite(dataEsame.getTime()) ? dataEsame : null;
  const meseEsame = esame ? esame.getFullYear() * 12 + esame.getMonth() : null;
  const esameNelCalendario = meseEsame !== null && meseEsame >= primoDisponibile && meseEsame <= ultimoDisponibile;
  const blocchi = Array.from({ length: nMesi }, (_, m) => {
    const primo = new Date(Math.floor((inizio + m) / 12), (inizio + m) % 12, 1);
    const nGiorni = new Date(primo.getFullYear(), primo.getMonth() + 1, 0).getDate();
    const giorni = Array.from({ length: nGiorni }, (_, k) => {
      const d = new Date(primo.getFullYear(), primo.getMonth(), k + 1);
      const iso = isoDi(d);
      const g = p.giorni[iso];
      const att = g ? g.risposte + g.lette * 5 + g.secondi / 60 : 0;
      const l = att === 0 ? 0 : att < 10 ? 1 : att < 30 ? 2 : att < 60 ? 3 : 4;
      const quando = d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
      const lettura = g?.secondi ? `, ${g.secondi < 60 ? `${g.secondi} s` : fmtMinuti(g.secondi)} di lettura` : '';
      const attivita = g ? `${g.risposte} risposte, ${g.lette} lezioni${lettura}` : 'nessuna attività';
      const tip = `${quando}: ${iso === p.esame ? 'esame · ' : ''}${attivita}`;
      return { iso, l, tip, futuro: iso > oggiIso };
    });
    return { chiave: isoDi(primo), nome: primo.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }), vuoti: (primo.getDay() + 6) % 7, giorni };
  });
  return (
    <div className="cal">
      <div className="cal-mesi">
        {blocchi.map((b) => (
          <div key={b.chiave} className="cal-mese">
            <b>{b.nome}</b>
            <div className="cal-griglia">
              {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((g, k) => <span key={k} className="cal-gg">{g}</span>)}
              {Array.from({ length: b.vuoti }, (_, k) => <span key={`v${k}`} />)}
              {b.giorni.map((g) => {
                const cls = `cal-g ${g.futuro ? 'futuro' : ''} ${g.iso === oggiIso ? 'oggi' : ''} ${g.iso === sel ? 'on' : ''} ${g.iso === p.esame ? 'esame' : ''}`;
                return onSelect && !g.futuro
                  ? <button key={g.iso} className={cls} data-date={g.iso} data-l={g.l} title={g.tip} aria-label={g.tip} onClick={() => onSelect(g.iso)} />
                  : <span key={g.iso} className={cls} data-date={g.iso} data-l={g.futuro ? undefined : g.l} title={g.tip} />;
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="cal-piede">
        <span className="row" style={{ gap: 2 }}>
          <button className="btn btn-sm btn-ghost" disabled={inizio === primoDisponibile} onClick={() => setMese(limita(inizio - 1))} aria-label="Mese precedente"><Icon n="indietro" size={14} /></button>
          <button className="btn btn-sm btn-ghost" disabled={inizio === ultimoInizio} onClick={() => setMese(limita(inizio + 1))} aria-label="Mese successivo"><Icon n="freccia" size={14} /></button>
        </span>
        <span className="cal-legenda">
          meno {[0, 1, 2, 3, 4].map((l) => <i key={l} data-l={l} />)} più
          {esame && (
            <button className="cal-leg-esame" disabled={!esameNelCalendario}
              title={esameNelCalendario ? "Vai al mese dell'esame" : "L'esame è fuori dall'intervallo luglio 2026 – luglio 2029"}
              onClick={() => { if (esameNelCalendario) setMese(limita(meseEsame!)); }}>
              <i /> esame · {esame.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}
            </button>
          )}
        </span>
      </div>
    </div>
  );
}

export function Toast({ msg, onDone }: { msg: string | null; onDone: () => void }) {
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [msg]);
  return msg ? <div className="toast fade-in">{msg}</div> : null;
}

export function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  return { msg, show: setMsg, el: <Toast msg={msg} onDone={() => setMsg(null)} /> };
}

export function Pagine({ x }: { x: { pagine?: [number, number]; manuale?: [number, number]; fonteNome?: string } }) {
  return (
    <>
      {x.pagine && <span className="chip" title="Pagine del PDF degli appunti">{x.fonteNome ? `${x.fonteNome} ` : ''}pp. {intervallo(x.pagine)}</span>}
      {x.manuale && <span className="chip" title="Pagine del manuale (Laterza, ed. 1992)">manuale pp. {intervallo(x.manuale)}</span>}
    </>
  );
}

const isoLocale = (iso: string) => new Date(`${iso}T12:00:00`);
const meseDi = (iso: string) => { const d = isoLocale(iso); return d.getFullYear() * 12 + d.getMonth(); };
const sposta = (iso: string, giorni: number) => { const d = isoLocale(iso); d.setDate(d.getDate() + giorni); return isoDi(d); };
const spostaMese = (iso: string, mesi: number) => {
  const d = isoLocale(iso), giorno = d.getDate();
  d.setDate(1); d.setMonth(d.getMonth() + mesi);
  d.setDate(Math.min(giorno, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
  return isoDi(d);
};

/**
 * Selettore di data unico (data dell'esame in Oggi e in Progressi), uguale su PC, iPad e telefono.
 * La data si salva **solo** quando si sceglie un giorno (clic, tocco, Invio o Spazio): girare i mesi, spostarsi con
 * le frecce o chiudere non cambia niente. «Rimuovi data» toglie la data; Esc o «Annulla» chiudono senza toccarla.
 * Tastiera: frecce = giorno/settimana, Pag↑/Pag↓ = mese, Home/Fine = inizio/fine settimana.
 */
export function SceltaData({ value, onChange, min, etichetta = 'Data', vuoto = 'Scegli la data', rimuovi = true, testo, classe = '' }: {
  value?: string; onChange: (iso: string | undefined) => void; min?: string; etichetta?: string; vuoto?: string;
  /** mostra «Rimuovi data» quando una data c'è */
  rimuovi?: boolean;
  /** testo del pulsante al posto della data (es. «Cambia») */
  testo?: string; classe?: string;
}) {
  const oggi = isoDi(new Date());
  const valido = value && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(isoLocale(value).getTime()) ? value : undefined;
  const partenza = () => { const d = valido ?? oggi; return min && d < min ? min : d; };
  const [aperto, setAperto] = useState(false);
  const [fuoco, setFuoco] = useState(partenza);
  const [dove, setDove] = useState<{ left: number; top?: number; bottom?: number }>({ left: 0, top: 0 });
  const bottone = useRef<HTMLButtonElement>(null), pop = useRef<HTMLDivElement>(null);
  const daTastiera = useRef(false);

  const apri = () => {
    const r = bottone.current!.getBoundingClientRect();
    const w = Math.min(316, window.innerWidth - 16);
    const left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8));
    const sotto = r.bottom + 372 < window.innerHeight || r.top < 372;
    setDove(sotto ? { left, top: r.bottom + 6 } : { left, bottom: window.innerHeight - r.top + 6 });
    setFuoco(partenza()); daTastiera.current = true; setAperto(true);
  };
  const chiudi = (ridaiFuoco = true) => { setAperto(false); if (ridaiFuoco) bottone.current?.focus(); };
  const scegli = (iso: string | undefined) => { if (iso && min && iso < min) return; onChange(iso); chiudi(); };

  // all'apertura e a ogni spostamento da tastiera il fuoco va sul giorno indicato
  useLayoutEffect(() => {
    if (!aperto || !daTastiera.current) return;
    daTastiera.current = false;
    pop.current?.querySelector<HTMLButtonElement>(`[data-date="${fuoco}"]`)?.focus({ preventScroll: true });
  }, [aperto, fuoco]);
  useEffect(() => {
    if (!aperto) return;
    const fuori = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      if (!pop.current?.contains(t) && !bottone.current?.contains(t)) chiudi(false);
    };
    // su schermo largo il riquadro è ancorato al pulsante: se la pagina scorre si chiude (sul telefono è un foglio fisso)
    const inizio = bottone.current?.getBoundingClientRect();
    const scorre = (e: Event) => {
      if (pop.current?.contains(e.target as Node) || window.innerWidth <= 560) return;
      const ora = bottone.current?.getBoundingClientRect();
      if (!inizio || !ora || Math.abs(ora.top - inizio.top) > 2 || Math.abs(ora.left - inizio.left) > 2) chiudi(false);
    };
    // Esc chiude anche se il fuoco non è nel riquadro: in Safari toccare o cliccare un pulsante non gli dà il fuoco
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape' && !pop.current?.contains(document.activeElement)) { e.preventDefault(); chiudi(); } };
    document.addEventListener('mousedown', fuori);
    document.addEventListener('touchstart', fuori, { passive: true });
    document.addEventListener('keydown', esc);
    window.addEventListener('scroll', scorre, { passive: true, capture: true });
    window.addEventListener('resize', scorre);
    return () => {
      document.removeEventListener('mousedown', fuori); document.removeEventListener('touchstart', fuori); document.removeEventListener('keydown', esc);
      window.removeEventListener('scroll', scorre, true); window.removeEventListener('resize', scorre);
    };
  }, [aperto]);

  const muovi = (iso: string) => { daTastiera.current = true; setFuoco(min && iso < min ? min : iso); };
  const tasti = (e: React.KeyboardEvent) => {
    const giorno = (isoLocale(fuoco).getDay() + 6) % 7;
    const mosse: Record<string, () => void> = {
      ArrowLeft: () => muovi(sposta(fuoco, -1)), ArrowRight: () => muovi(sposta(fuoco, 1)),
      ArrowUp: () => muovi(sposta(fuoco, -7)), ArrowDown: () => muovi(sposta(fuoco, 7)),
      Home: () => muovi(sposta(fuoco, -giorno)), End: () => muovi(sposta(fuoco, 6 - giorno)),
      PageUp: () => muovi(spostaMese(fuoco, e.shiftKey ? -12 : -1)), PageDown: () => muovi(spostaMese(fuoco, e.shiftKey ? 12 : 1)),
      Escape: () => chiudi(),
    };
    const f = mosse[e.key];
    if (!f) return;
    // le frecce valgono solo sulla griglia dei giorni; Esc ovunque nel riquadro
    if (e.key !== 'Escape' && !(e.target as HTMLElement).closest('.sd-griglia')) return;
    e.preventDefault(); e.stopPropagation(); f();
  };

  const mese = meseDi(fuoco), anno = Math.floor(mese / 12), m = mese % 12;
  const primo = new Date(anno, m, 1);
  const nGiorni = new Date(anno, m + 1, 0).getDate();
  const vuoti = (primo.getDay() + 6) % 7;
  const meseMin = min ? meseDi(min) : -Infinity;
  const nomeMese = primo.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
  const lunga = (iso: string) => isoLocale(iso).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const cambiaMese = (d: number) => setFuoco((f) => { const n = spostaMese(f, d); return min && n < min ? min : n; });

  return (
    <span className={`scelta-data ${classe}`}>
      <button ref={bottone} type="button" className={testo ? 'btn btn-sm btn-ghost' : 'input sd-bottone'} aria-haspopup="dialog" aria-expanded={aperto}
        aria-label={testo ? `${testo}: ${etichetta.toLowerCase()}` : `${etichetta}: ${valido ? lunga(valido) : 'nessuna data'}. Apri il calendario`}
        data-scelta-data onClick={() => (aperto ? chiudi() : apri())}>
        {testo ?? <><Icon n="calendario" size={16} /><span className={valido ? '' : 'faint'}>{valido ? isoLocale(valido).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }) : vuoto}</span></>}
      </button>
      {aperto && createPortal(
        <>
          <div className="sd-velo" onClick={() => chiudi(false)} />
          <div ref={pop} className="sd-pop fade-in" role="dialog" aria-modal="true" aria-label={etichetta} style={dove} onKeyDown={tasti}>
            <div className="sd-testa">
              <button type="button" className="btn btn-sm btn-ghost" aria-label="Mese precedente" disabled={mese <= meseMin} onClick={() => cambiaMese(-1)}><Icon n="indietro" size={16} /></button>
              <b aria-live="polite">{nomeMese}</b>
              <button type="button" className="btn btn-sm btn-ghost" aria-label="Mese successivo" onClick={() => cambiaMese(1)}><Icon n="freccia" size={16} /></button>
            </div>
            <div className="sd-griglia" role="grid" aria-label={nomeMese}>
              {['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'].map((g) => <span key={g} className="sd-gg" role="columnheader" aria-label={g}>{g[0].toUpperCase()}</span>)}
              {Array.from({ length: vuoti }, (_, k) => <span key={`v${k}`} />)}
              {Array.from({ length: nGiorni }, (_, k) => {
                const iso = isoDi(new Date(anno, m, k + 1));
                const cls = `sd-g${iso === valido ? ' on' : ''}${iso === oggi ? ' oggi' : ''}`;
                return (
                  <button key={iso} type="button" role="gridcell" className={cls} data-date={iso} tabIndex={iso === fuoco ? 0 : -1}
                    disabled={!!min && iso < min} aria-pressed={iso === valido} aria-current={iso === oggi ? 'date' : undefined}
                    aria-label={`${lunga(iso)}${iso === valido ? ', data scelta' : ''}`} onClick={() => scegli(iso)}>{k + 1}</button>
                );
              })}
            </div>
            <div className="sd-piede">
              <span className="faint tiny">Scegli un giorno per salvare</span>
              <span className="row" style={{ gap: 4 }}>
                {valido && rimuovi && <button type="button" className="btn btn-sm btn-ghost" onClick={() => scegli(undefined)}>Rimuovi data</button>}
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => chiudi()}>Annulla</button>
              </span>
            </div>
          </div>
        </>, document.body)}
    </span>
  );
}
