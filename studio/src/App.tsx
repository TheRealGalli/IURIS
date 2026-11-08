import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { caricaCorso, CorsoContext, fetchManifest, useCorso, type Indice } from './lib/data';
import { href, useRotta, vai } from './lib/router';
import { ripassoDiOggi } from './lib/srs';
import { finisciDemo, iniziaDemo, leggiPref, scriviPref, usePref, useProgresso } from './lib/store';
import type { Manifest, MateriaInfo } from './lib/types';
import { Icon } from './components/ui';
import IurisMascot from './components/IurisMascot';
import Palette from './components/Palette';
import Oggi from './views/Oggi';
import Percorso from './views/Percorso';
import LezioneView from './views/Lezione';
import Mappa from './views/Mappa';
import Cronologia from './views/Cronologia';
import Glossario from './views/Glossario';
import ConcettoView from './views/Concetto';
import Allena from './views/Allena';
import Progressi from './views/Progressi';
import Backup from './views/Backup';
const Originali = lazy(() => import('./views/Originali'));
const Tour = lazy(() => import('./components/Tour'));

const NAV = [
  { to: '/', key: '', label: 'Oggi', icon: 'oggi' },
  { to: '/percorso', key: 'percorso', label: 'Percorso', icon: 'percorso' },
  { to: '/originali', key: 'originali', label: 'Originali', icon: 'libro' },
  { to: '/allena', key: 'allena', label: 'Allenamento', icon: 'allena' },
  { to: '/mappa', key: 'mappa', label: 'Mappa', icon: 'mappa' },
  { to: '/cronologia', key: 'cronologia', label: 'Cronologia', icon: 'cronologia' },
  { to: '/glossario', key: 'glossario', label: 'Glossario', icon: 'glossario' },
  { to: '/progressi', key: 'progressi', label: 'Progressi', icon: 'progressi' },
];
const TABS = ['', 'percorso', 'allena', 'mappa', 'progressi'];

export default function App() {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const pref = usePref();

  useEffect(() => { fetchManifest().then(setManifest).catch((e) => setErr(String(e))); }, []);
  useEffect(() => {
    const t = pref.tema ?? 'auto';
    if (t === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', t === 'scuro' ? 'dark' : 'light');
  }, [pref.tema]);

  if (err) return <div className="empty"><h3>Contenuti non trovati</h3><p>Esegui <code>npm run sync</code> nella cartella studio. ({err})</p></div>;
  if (!manifest) return <div className="empty faint">Caricamento…</div>;

  const disponibili = manifest.materie.filter((m) => m.disponibile);
  const materia = manifest.materie.find((m) => m.slug === pref.materia) ?? disponibili[0] ?? manifest.materie[0];
  return <Guscio manifest={manifest} materia={materia} />;
}

function Guscio({ manifest, materia }: { manifest: Manifest; materia: MateriaInfo }) {
  const rotta = useRotta();
  const lettore = rotta.parti[0] === 'originali';
  const [idx, setIdx] = useState<Indice | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [palette, setPalette] = useState(false);
  const [faseDemo, setFaseDemo] = useState<'idle' | 'starting' | 'running' | 'closing'>('idle');
  const [uscitaDemo, setUscitaDemo] = useState('/');
  const demo = faseDemo !== 'idle';
  useEffect(() => {
    if (rotta.parti[0] === 'demo' && faseDemo === 'idle' && idx) {
      setPalette(false); setFaseDemo('starting');
    }
  }, [rotta.hash, faseDemo, idx]);
  useEffect(() => {
    if (faseDemo === 'starting') {
      iniziaDemo(materia.slug); vai('/'); setFaseDemo('running');
    } else if (faseDemo === 'closing') {
      finisciDemo(); vai(uscitaDemo); setFaseDemo('idle');
    }
  }, [faseDemo]);
  const chiudiDemo = (to = '/') => { setUscitaDemo(to); setFaseDemo('closing'); };

  useEffect(() => {
    setIdx(null); setErr(null);
    if (materia.disponibile && materia.file) caricaCorso(materia.file).then(setIdx).catch((e) => setErr(String(e)));
  }, [materia.slug]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (demo) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette((v) => !v); }
      if (e.key === '/' && !(e.target as HTMLElement).closest('input, textarea')) { e.preventDefault(); setPalette(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [demo]);

  const scegliMateria = (slug: string) => {
    scriviPref({ materia: slug });
    if (!['backup', 'demo'].includes(rotta.parti[0])) location.hash = '#/';
  };

  let contenuto;
  if (faseDemo === 'starting' || faseDemo === 'closing') contenuto = null;
  else if (rotta.parti[0] === 'backup') contenuto = <Backup materie={manifest.materie} materia={materia.slug} />;
  else if (rotta.parti[0] === 'demo') contenuto = <div className="empty faint">Preparazione della visita guidata…</div>;
  else if (rotta.parti[0] === 'altro') contenuto = <Altro />;
  else if (!materia.disponibile) contenuto = <InPreparazione m={materia} />;
  else if (err) contenuto = <div className="empty"><h3>Errore</h3><p>{err}</p></div>;
  else if (!idx) contenuto = <div className="empty faint">Caricamento del corso…</div>;
  else contenuto = <Rotte />;

  const body = (
    <div className={`shell${lettore ? ' shell-reader' : ''}${demo ? ' shell-tour' : ''}`} aria-hidden={demo || undefined}>
      <aside className="side">
        <a className="brand" href={href('/')}>
          <span className="brand-mark">I</span>
          <span><div className="brand-name">IURIS</div><div className="brand-sub">studio del diritto</div></span>
        </a>
        <div className="materia-switch">
          <div className="nav-label">Materie</div>
          {manifest.materie.map((m) => (
            <button key={m.slug} className={`materia-btn ${m.slug === materia.slug ? 'on' : ''}`} onClick={() => scegliMateria(m.slug)}>
              <span className="materia-dot" style={{ background: m.colore ?? undefined }} />
              <span>{m.breve ?? m.nome}</span>
              {!m.disponibile && <small>presto</small>}
            </button>
          ))}
        </div>
        {idx && <NavLaterale />}
        <nav className="nav nav-archivio" aria-label="Backup di tutte le materie">
          <div className="nav-label">Backup</div>
          <a href={href('/backup')} className={rotta.parti[0] === 'backup' ? 'on' : ''} aria-current={rotta.parti[0] === 'backup' ? 'page' : undefined}>
            <Icon n="backup" /> Backup completo
          </a>
        </nav>
        <div className="side-foot">
          <a className={`search-btn demo-link${demo ? ' on' : ''}`} href={href('/demo')}><IurisMascot active={!demo} /> Demo interattiva</a>
          {idx && (
            <button className="search-btn" onClick={() => setPalette(true)}>
              <Icon n="cerca" size={16} /> Cerca <kbd>⌘K</kbd>
            </button>
          )}
        </div>
      </aside>

      <div className={lettore ? 'shell-reader-content' : undefined} style={{ flex: 1, minWidth: 0 }}>
        <header className="topbar">
          <span className="brand-mark" style={{ width: 28, height: 28, fontSize: 15 }}>I</span>
          <span className="brand-name">IURIS</span>
          {idx && <button className="btn btn-sm btn-ghost" onClick={() => setPalette(true)} aria-label="Cerca"><Icon n="cerca" /></button>}
          <select className="select" value={materia.slug} onChange={(e) => scegliMateria(e.target.value)}>
            {manifest.materie.map((m) => <option key={m.slug} value={m.slug}>{m.breve ?? m.nome}</option>)}
          </select>
        </header>
        <main className={`main${lettore ? ' main-reader' : ''}`}>{contenuto}</main>
      </div>
      <TabBar />
      {faseDemo === 'running' && idx && <Suspense fallback={null}><Tour idx={idx} onClose={chiudiDemo} /></Suspense>}
      {palette && idx && <Palette onClose={() => setPalette(false)} />}
    </div>
  );
  return idx ? <CorsoContext.Provider value={idx}>{body}</CorsoContext.Provider> : body;
}

function sezioneAttiva(parti: string[]) {
  const s = parti[0] ?? '';
  if (s === 'lezione') return 'percorso';
  if (s === 'concetto') return 'glossario';
  return s;
}

function NavLaterale() {
  const rotta = useRotta();
  const att = sezioneAttiva(rotta.parti);
  return (
    <nav className="nav">
      <div className="nav-label">Studio</div>
      {NAV.map((n) => (
        <a key={n.key} href={href(n.to)} className={att === n.key ? 'on' : ''}>
          <Icon n={n.icon} /> {n.label}
          {n.key === 'allena' && <BadgeRipasso />}
        </a>
      ))}
    </nav>
  );
}

function BadgeRipasso() {
  const idx = useCorso();
  const p = useProgresso(idx.corso.materia.slug);
  const r = ripassoDiOggi(idx, p);
  const n = r.scadute.length + r.nuove.length;
  return n > 0 ? <span className="count">{n}</span> : null;
}

function TabBar() {
  const rotta = useRotta();
  const att = sezioneAttiva(rotta.parti);
  const altro = !TABS.includes(att);
  return (
    <nav className="tabbar">
      {NAV.filter((n) => TABS.includes(n.key)).map((n) => (
        <a key={n.key} href={href(n.key === 'progressi' ? '/altro' : n.to)} className={(n.key === 'progressi' ? (att === 'progressi' || altro) : att === n.key) ? 'on' : ''}>
          <Icon n={n.key === 'progressi' ? 'altro' : n.icon} size={21} />
          {n.key === 'progressi' ? 'Altro' : n.label === 'Allenamento' ? 'Allena' : n.label}
        </a>
      ))}
    </nav>
  );
}

function Altro() {
  return <div className="page-narrow fade-in stack">
    <h1 className="title-xl">Altro</h1>
    <h2 className="eyebrow" style={{ marginTop: 12 }}>Studio · materia selezionata</h2>
    <nav className="grid g2 altro-studio" aria-label="Altre sezioni di studio">
      {NAV.filter((n) => ['originali', 'cronologia', 'glossario', 'progressi'].includes(n.key)).map((n) => <a key={n.key} className="card cta-card" href={href(n.to)}><Icon n={n.icon} size={22} /><b className="title-s">{n.label}</b></a>)}
    </nav>
    <h2 className="eyebrow" style={{ marginTop: 12 }}>Backup · tutte le materie</h2>
    <a className="card cta-card" href={href('/backup')}><Icon n="backup" size={22} /><b className="title-s">Backup completo</b><span className="small muted">Un solo file per progressi, segni e mappe personali di tutte le materie.</span></a>
    <a className="card cta-card" href={href('/demo')}><Icon n="demo" size={22} /><b className="title-s">Demo interattiva</b><span className="small muted">Scopri IURIS, dalle prime lezioni al backup.</span></a>
  </div>;
}

function Rotte() {
  const { parti, query } = useRotta();
  const slug = useCorso().corso.materia.slug;
  const [s, id] = parti;
  switch (s) {
    case undefined: return <Oggi />;
    case 'percorso': return <Percorso />;
    case 'lezione': return <LezioneView id={id} />;
    case 'mappa': return <Mappa query={query} />;
    case 'cronologia': return <Cronologia query={query} />;
    case 'glossario': return <Glossario />;
    case 'concetto': return <ConcettoView id={id} />;
    case 'allena': return <Allena query={query} />;
    case 'progressi': return <Progressi />;
    case 'originali': return <OriginaliBoundary key={slug} slug={slug}><Suspense fallback={<div className="empty faint">Apertura degli originali…</div>}><Originali /></Suspense></OriginaliBoundary>;
    default: return <div className="empty"><h3>Pagina non trovata</h3><a className="btn" href={href('/')}>Torna a Oggi</a></div>;
  }
}

class OriginaliBoundary extends Component<{ slug: string; children: ReactNode }, { errore: boolean }> {
  state = { errore: false };
  static getDerivedStateFromError() { return { errore: true }; }
  render() {
    if (!this.state.errore) return this.props.children;
    return <div className="page-narrow card stack">
      <h1 className="title-m">Il lettore non si è aperto</h1>
      <p className="muted">Ricarica la pagina per riprovare. Segni e posizione di lettura restano salvati.</p>
      <button className="btn" onClick={() => location.reload()}>Ricarica la pagina</button>
    </div>;
  }
}

function InPreparazione({ m }: { m: MateriaInfo }) {
  return (
    <div className="page-narrow">
      <div className="card" style={{ padding: 32 }}>
        <div className="eyebrow">In preparazione</div>
        <h1 className="title-l" style={{ margin: '8px 0 10px' }}>{m.nome}</h1>
        <p className="muted">Le fonti sono caricate ma i contenuti di studio (lezioni, mappa, glossario, quiz) non sono ancora stati generati.</p>
        {m.fonti.length > 0 && (
          <>
            <div className="eyebrow" style={{ marginTop: 18, marginBottom: 8 }}>Fonti</div>
            <div className="stack" style={{ gap: 6 }}>{m.fonti.map((f) => <div key={f} className="row"><Icon n="libro" size={16} /> {f}</div>)}</div>
          </>
        )}
      </div>
    </div>
  );
}

// Materia iniziale dal link (#/?m=slug) per condividere un link diretto
const qm = new URLSearchParams(location.hash.split('?')[1] ?? '').get('m');
if (qm && qm !== leggiPref().materia) scriviPref({ materia: qm });
