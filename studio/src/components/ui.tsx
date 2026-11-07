import { ReactNode, useEffect, useState } from 'react';
import { livello, type Livello } from '../lib/srs';
import type { Progresso } from '../lib/store';
import { fmtMinuti, intervallo, isoDi } from '../lib/util';

const PATHS: Record<string, ReactNode> = {
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
  salva: <><path d="M5 3h12l4 4v14H3V3h2ZM7 3v6h10V3M7 21v-8h10v8" /><path d="M14 5v2" /></>,
  invio: <path d="M20 5v8H5M10 8l-5 5 5 5" />,
  backup: <><path d="M4 7h16v14H4ZM3 3h18v4H3Z" /><path d="M9 12h6M12 11v6M9 14l3 3 3-3" /></>,
  su: <path d="M12 19V5M6 11l6-6 6 6" />,
  giu: <path d="M12 5v14M6 13l6 6 6-6" />,
  mic: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></>,
  voce: <><path d="M4 9v6h4l5 4V5L8 9Z" /><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" /></>,
  fiamma: <path d="M12 3c1 4 5 5.5 5 10a5 5 0 0 1-10 0c0-2.2 1.2-3.6 2.4-4.6.3 1.6 1.1 2.6 2.1 2.9C11 9 11 6 12 3Z" />,
  calendario: <><rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  libro: <><path d="M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5Z" /><path d="M12 6.5v13" /></>,
  espandi: <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />,
  occhio: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
  altro: <><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></>,
  scarica: <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />,
  carica: <path d="M12 20V9M7 14l5-5 5 5M5 4h14" />,
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
  const title = lv === 'ignoto' ? 'Mai verificato' : `Padronanza ${Math.round((valore ?? 0) * 100)}%`;
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
