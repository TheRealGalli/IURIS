import { useEffect, useMemo, useRef, useState } from 'react';
import { norm, useCorso } from '../lib/data';
import { testoPiano } from '../lib/md';
import { vai } from '../lib/router';
import { TIPO_SINGOLARE } from '../lib/types';
import { rifPagine } from '../lib/util';

interface Voce { k: string; titolo: string; sotto: string; to: string; testo: string; peso: number }

export default function Palette({ onClose }: { onClose: () => void }) {
  const idx = useCorso();
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const voci = useMemo<Voce[]>(() => {
    const out: Voce[] = [];
    for (const c of idx.corso.concetti) out.push({
      k: TIPO_SINGOLARE[c.tipo] ?? 'Concetto', titolo: c.nome, sotto: c.breve, to: `/concetto/${c.id}`,
      testo: norm([c.nome, c.latino ?? '', ...c.alias].join(' ')), peso: 3,
    });
    for (const u of idx.corso.unita) for (const l of u.lezioni) out.push({
      k: 'Lezione', titolo: l.titolo, sotto: `${u.titolo} · ${rifPagine(l)}`, to: `/lezione/${l.id}`,
      testo: norm(`${l.titolo} ${testoPiano(l.sintesi)}`), peso: 2,
    });
    for (const e of idx.corso.eventi) out.push({
      k: e.data, titolo: e.titolo, sotto: e.descrizione, to: `/cronologia?e=${e.id}`, testo: norm(`${e.titolo} ${e.data} ${e.descrizione}`), peso: 1,
    });
    return out;
  }, [idx]);

  const risultati = useMemo(() => {
    const n = norm(q);
    if (!n) return voci.filter((v) => v.k === 'Lezione').slice(0, 8);
    const parole = n.split(/\s+/);
    return voci
      .map((v) => {
        if (!parole.every((p) => v.testo.includes(p))) return null;
        const t = norm(v.titolo);
        const score = v.peso + (t.startsWith(n) ? 10 : t.includes(n) ? 5 : 0);
        return { v, score };
      })
      .filter(Boolean)
      .sort((a, b) => b!.score - a!.score)
      .slice(0, 30)
      .map((x) => x!.v);
  }, [q, voci]);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => setSel(0), [q]);

  const scegli = (v: Voce) => { vai(v.to); onClose(); };

  return (
    <div className="palette-bg" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="palette fade-in">
        <input ref={inputRef} className="input" placeholder="Cerca concetti, lezioni, date… (es. pretore, 367, palinsesto)"
          value={q} onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, risultati.length - 1)); }
            if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
            if (e.key === 'Enter' && risultati[sel]) scegli(risultati[sel]);
          }} />
        <div className="palette-list">
          {risultati.length === 0 && <div className="empty small">Nessun risultato per «{q}»</div>}
          {risultati.map((v, i) => (
            <div key={v.to + i} className={`palette-item ${i === sel ? 'on' : ''}`} onMouseEnter={() => setSel(i)} onClick={() => scegli(v)}>
              <span className="k">{v.k}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{v.titolo}</div>
                <div className="faint small" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.sotto}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
