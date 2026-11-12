import { Component, lazy, Suspense, useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { caricaCorso, CorsoContext, fetchManifest, useCorso, type Indice } from './lib/data';
import { href, useRotta, vai } from './lib/router';
import { ripassoDiOggi } from './lib/srs';
import { impostaMaterieCorso } from './lib/materie-corso';
import { inDemo } from './lib/archivio';
import { ricordaScroll, ripristinaScroll, timbraMateria } from './lib/ritorno';
import { finisciDemo, iniziaDemo, leggiPref, scriviPref, usePref, useProgresso } from './lib/store';
import type { Manifest, MateriaInfo } from './lib/types';
import { Icon } from './components/ui';
import GrigliaMaterie from './components/GrigliaMaterie';
import { CORSI, corsoDi, corsoDisponibile, descriviCorso, linkMateriale, materieDelCorso, type CorsoDiStudio } from './data/corsi';
import IurisMascot from './components/IurisMascot';
import Palette from './components/Palette';
import { MobileHeader, MobileMenu, MobileTabs } from './components/MobileChrome';
import { MobileNavigation, useCompact } from './components/MobileSheet';
import Oggi from './views/Oggi';
import Percorso from './views/Percorso';
import LezioneView from './views/Lezione';
// Le viste più pesanti (mappe con d3, cronologia, allenamento) si scaricano alla prima apertura,
// e subito dopo l'avvio, a browser libero: la prima schermata arriva prima, soprattutto sul telefono.
const carica = {
  mappa: () => import('./views/Mappa'), cronologia: () => import('./views/Cronologia'), glossario: () => import('./views/Glossario'),
  concetto: () => import('./views/Concetto'), allena: () => import('./views/Allena'), progressi: () => import('./views/Progressi'),
  backup: () => import('./views/Backup'), originali: () => import('./views/Originali'),
  norme: () => import('./views/Norme'),
};
const Mappa = lazy(carica.mappa);
const Cronologia = lazy(carica.cronologia);
const Glossario = lazy(carica.glossario);
const ConcettoView = lazy(carica.concetto);
const Allena = lazy(carica.allena);
const Progressi = lazy(carica.progressi);
const Backup = lazy(carica.backup);
const Originali = lazy(carica.originali);
const Norme = lazy(carica.norme);
if (typeof window !== 'undefined') {
  const prefetch = () => { for (const f of Object.values(carica)) f().catch(() => { /* riprova alla prima apertura */ }); };
  window.addEventListener('load', () => ('requestIdleCallback' in window ? requestIdleCallback(prefetch, { timeout: 4000 }) : setTimeout(prefetch, 1500)), { once: true });
}
const Tour = lazy(() => import('./components/Tour'));

const NAV = [
  { to: '/', key: '', label: 'Oggi', icon: 'oggi' },
  { to: '/percorso', key: 'percorso', label: 'Percorso', icon: 'percorso' },
  { to: '/originali', key: 'originali', label: 'Originali', icon: 'libro' },
  { to: '/allena', key: 'allena', label: 'Allenamento', icon: 'allena' },
  { to: '/mappa', key: 'mappa', label: 'Mappa', icon: 'mappa' },
  { to: '/cronologia', key: 'cronologia', label: 'Cronologia', icon: 'cronologia' },
  { to: '/glossario', key: 'glossario', label: 'Glossario', icon: 'glossario' },
  { to: '/norme', key: 'norme', label: 'Norme', icon: 'materia-costituzionale' },
  { to: '/progressi', key: 'progressi', label: 'Progressi', icon: 'progressi' },
];
const TABS = ['', 'percorso', 'allena', 'mappa', 'progressi'];
/** La sezione con il testo dell'atto (Costituzione, un giorno il Codice civile) compare solo nelle materie che ce l'hanno
 *  e prende il nome dall'atto; non sta nella barra in basso (si apre da Altro). */
const FACOLTATIVE = ['norme'];
const navDi = (idx: Indice | null) => NAV.filter((n) => !FACOLTATIVE.includes(n.key) || !!idx?.corso.norme)
  .map((n) => (n.key === 'norme' ? { ...n, label: idx?.corso.norme?.nome ?? n.label } : n));

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

  // Solo le materie del corso scelto: percorso, domande, statistiche e mappa sono già per materia.
  const corso = corsoDi(pref.corso);
  const delCorso = materieDelCorso(corso, manifest.materie);
  const materie = delCorso.length ? delCorso : manifest.materie;
  const disponibili = materie.filter((m) => m.disponibile);
  const materia = materie.find((m) => m.slug === pref.materia) ?? disponibili[0] ?? materie[0];
  impostaMaterieCorso(disponibili.map((m) => m.slug), manifest.materie.filter((m) => m.disponibile).map((m) => m.slug));
  return <Guscio manifest={manifest} materie={materie} corso={corso} materia={materia} />;
}

function Guscio({ manifest, materie, corso, materia }: { manifest: Manifest; materie: MateriaInfo[]; corso: CorsoDiStudio; materia: MateriaInfo }) {
  const rotta = useRotta();
  const lettore = rotta.parti[0] === 'originali';
  const mappa = rotta.parti[0] === 'mappa' && rotta.query.get('quadro') !== '1';
  const compact = useCompact();
  const [mobilePanel, setMobilePanel] = useState<'menu' | 'study' | null>(null);
  useEffect(() => setMobilePanel(null), [rotta.hash]);
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

  // collegamento a un articolo (a.ax), anche di un'altra materia del corso (la Costituzione citata nel privato):
  // prima di partire la pagina ricorda dov'era, così «indietro» nel browser riporta nello stesso punto.
  useEffect(() => {
    const apri = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.('a.ax, a[data-materia]') as HTMLAnchorElement | null;
      if (!a || e.metaKey || e.ctrlKey) return;
      // atto di una materia fuori dal corso scelto: si legge nella scheda, non si cambia materia
      if (a.dataset.fuori) { e.preventDefault(); return; }
      if (e.defaultPrevented) return;
      ricordaScroll();
      const altra = a.dataset.materia;
      if (!altra || altra === leggiPref().materia) return;
      e.preventDefault();
      scriviPref({ materia: altra });
      location.hash = a.getAttribute('href') ?? '#/';
    };
    document.addEventListener('click', apri);
    return () => document.removeEventListener('click', apri);
  }, []);

  // Ogni pagina della cronologia del browser ricorda la materia in cui è stata aperta: tornando indietro da un
  // articolo di un'altra materia si ritrovano la materia, la pagina e il punto in cui si era.
  useEffect(() => { if (!demo) timbraMateria(materia.slug); }, [rotta.hash]);
  useEffect(() => {
    const torna = (e: PopStateEvent) => {
      if (inDemo()) return;
      const stato = e.state as { iurisMateria?: string; iurisScroll?: number } | null;
      const m = stato?.iurisMateria;
      if (m && m !== leggiPref().materia && materie.some((x) => x.slug === m && x.disponibile)) scriviPref({ materia: m });
      if (typeof stato?.iurisScroll === 'number') ripristinaScroll(stato.iurisScroll);
    };
    window.addEventListener('popstate', torna);
    return () => window.removeEventListener('popstate', torna);
  }, [materie]);

  const scegliMateria = (slug: string) => {
    scriviPref({ materia: slug });
    if (!['backup', 'demo'].includes(rotta.parti[0]) && !['', '#', '#/'].includes(location.hash)) location.hash = '#/';
    else timbraMateria(slug);   // stessa pagina, altra materia
  };

  let contenuto;
  if (faseDemo === 'starting' || faseDemo === 'closing') contenuto = null;
  else if (rotta.parti[0] === 'backup') contenuto = <Suspense fallback={null}><Backup materie={manifest.materie} materia={materia.slug} /></Suspense>;
  else if (rotta.parti[0] === 'demo') contenuto = <div className="empty faint">Preparazione della visita guidata…</div>;
  else if (rotta.parti[0] === 'altro') contenuto = <Altro corso={corso} nav={navDi(idx)} />;
  else if (!materia.disponibile) contenuto = <InPreparazione m={materia} />;
  else if (err) contenuto = <div className="empty"><h3>Errore</h3><p>{err}</p></div>;
  else if (!idx) contenuto = <div className="empty faint">Caricamento del corso…</div>;
  else contenuto = <Suspense fallback={<div className="empty faint" role="status">Apertura…</div>}><Rotte /></Suspense>;

  const body = (
    <div className={`shell${lettore ? ' shell-reader' : ''}${demo ? ' shell-tour' : ''}${compact ? ' shell-mobile' : ''}${compact && mappa ? ' shell-map' : ''}`} aria-hidden={demo || undefined}>
      <aside className="side">
        <a className="brand" href={href('/')}>
          <span className="brand-mark">I</span>
          <span><div className="brand-name">IURIS</div><div className="brand-sub">studio del diritto</div></span>
        </a>
        <SceltaCorso corso={corso} />
        <div className="materia-switch">
          <div className="nav-label">Materie</div>
          <GrigliaMaterie corso={corso} materie={materie} selezionata={materia.slug} onSelect={scegliMateria} />
        </div>
        {idx && <NavLaterale nav={navDi(idx)} />}
        <nav className="nav nav-archivio" aria-label="Backup di tutte le materie">
          <div className="nav-label">Backup</div>
          <a href={href('/backup')} className={rotta.parti[0] === 'backup' ? 'on' : ''} aria-current={rotta.parti[0] === 'backup' ? 'page' : undefined}>
            <Icon n="backup" /> Backup completo
          </a>
        </nav>
        <div className="side-foot">
          <InviaMateriale corso={corso} />
          <a className={`search-btn demo-link${demo ? ' on' : ''}`} href={href('/demo')}><IurisMascot active={!demo} /> Demo interattiva</a>
        </div>
      </aside>

      <div className={lettore ? 'shell-reader-content' : compact && mappa ? 'shell-map-content' : undefined} style={{ flex: 1, minWidth: 0 }}>
        {compact && !lettore && <MobileHeader onSearch={() => setPalette(true)} />}
        <header className={`topbar${compact ? ' legacy-topbar' : ''}`}>
          <span className="brand-mark" style={{ width: 28, height: 28, fontSize: 15 }}>I</span>
          <span className="brand-name">IURIS</span>
          {idx && <button className="btn btn-sm btn-ghost" onClick={() => setPalette(true)} aria-label="Cerca"><Icon n="cerca" /></button>}
          <select className="select" value={materia.slug} onChange={(e) => scegliMateria(e.target.value)}>
            {materie.map((m) => <option key={m.slug} value={m.slug}>{m.breve ?? m.nome}</option>)}
            {(corso.inArrivo ?? []).map((m) => <option key={m.nome} disabled>{m.nome} · in arrivo</option>)}
          </select>
        </header>
        <main className={`main${lettore ? ' main-reader' : ''}`}>{contenuto}</main>
      </div>
      {compact ? <MobileTabs items={navDi(idx)} section={sezioneAttiva(rotta.parti)} path={rotta.hash} onMenu={() => setMobilePanel('menu')} /> : <TabBar />}
      {compact && <MobileMenu panel={mobilePanel} onClose={() => setMobilePanel(null)} onStudy={() => setMobilePanel('study')} corso={corso} materie={materie} materia={materia} items={navDi(idx)} section={sezioneAttiva(rotta.parti)} onMateria={scegliMateria} />}
      {faseDemo === 'running' && idx && <Suspense fallback={null}><Tour idx={idx} onClose={chiudiDemo} /></Suspense>}
      {palette && idx && <Palette onClose={() => setPalette(false)} />}
    </div>
  );
  // Il Provider c'è sempre (anche con idx nullo): se comparisse e sparisse, il cambio di materia dopo un ripristino
  // smonterebbe l'intera pagina e farebbe perdere l'esito del backup.
  return <MobileNavigation.Provider value={{ openMenu: () => setMobilePanel('menu') }}><CorsoContext.Provider value={idx}>{body}</CorsoContext.Provider></MobileNavigation.Provider>;
}

/** Invito a mandare sbobine o materiale su WhatsApp, con il corso scelto già scritto nel messaggio. */
function InviaMateriale({ corso, classe = '' }: { corso: CorsoDiStudio; classe?: string }) {
  return (
    <a className={`invia-materiale ${classe}`} href={linkMateriale(corso)} target="_blank" rel="noopener noreferrer"
      title={`Scrivi su WhatsApp per il corso ${corso.breve}`}>
      <Icon n="whatsapp" size={17} />
      <span><b>Hai sbobine complete o materiale aggiuntivo per il tuo corso?</b> Inviamele su WhatsApp</span>
    </a>
  );
}

/** Riquadro sottile sopra le Materie: il corso di studio decide quali materie si vedono e si usano. */
function SceltaCorso({ corso, classe = '' }: { corso: CorsoDiStudio; classe?: string }) {
  const scegli = (id: string) => {
    if (id === corso.id) return;
    const nuovo = corsoDi(id);
    // La materia aperta resta solo se fa parte del nuovo corso.
    scriviPref({ corso: nuovo.id, ...(nuovo.materie.includes(leggiPref().materia ?? '') ? {} : { materia: nuovo.materie[0] }) });
    if (!['backup', 'demo'].includes(location.hash.replace(/^#\/?/, '').split(/[/?]/)[0]) && !['', '#', '#/'].includes(location.hash)) location.hash = '#/';
    else if (leggiPref().materia) timbraMateria(leggiPref().materia!);
  };
  return (
    <label className={`corso-switch ${classe}`} title={descriviCorso(corso)}>
      <span className="corso-label">Corso</span>
      <span className="corso-nome">{corso.sigla}</span>
      {corso.lettere && <span className="corso-classe">{corso.lettere}</span>}
      <Icon n="scegli" size={14} />
      <select className="corso-select" value={corso.id} onChange={(e) => scegli(e.target.value)} aria-label="Corso di studio">
        {CORSI.map((c) => <option key={c.id} value={c.id} disabled={!corsoDisponibile(c)}>{c.breve}{corsoDisponibile(c) ? '' : ' · in arrivo'}</option>)}
      </select>
    </label>
  );
}

function sezioneAttiva(parti: string[]) {
  const s = parti[0] ?? '';
  if (s === 'lezione') return 'percorso';
  if (s === 'concetto') return 'glossario';
  return s;
}

function NavLaterale({ nav }: { nav: typeof NAV }) {
  const rotta = useRotta();
  const att = sezioneAttiva(rotta.parti);
  return (
    <nav className="nav">
      <div className="nav-label">Studio</div>
      {nav.map((n) => (
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

/** Barra in basso: cinque voci sul telefono; su iPad in verticale compaiono anche Originali, Cronologia e Glossario. */
function TabBar() {
  const rotta = useRotta();
  const att = sezioneAttiva(rotta.parti);
  const ridotta = !TABS.includes(att);
  const extra = (k: string) => !TABS.includes(k);
  const voci = [...NAV.filter((n) => n.key !== 'progressi' && !FACOLTATIVE.includes(n.key)), NAV.find((n) => n.key === 'progressi')!];
  return (
    <nav className="tabbar" aria-label="Sezioni" style={{ '--tab-n': voci.length } as CSSProperties}>
      {voci.map((n) => {
        const altro = n.key === 'progressi';
        const on = altro ? att === 'progressi' || (ridotta && !NAV.some((x) => x.key === att)) : att === n.key;
        const cls = [extra(n.key) && !altro ? 'tab-extra' : '', on ? 'on' : '', altro && ridotta && !on ? 'on-ridotta' : ''].filter(Boolean).join(' ');
        return (
          <a key={n.key} href={href(altro ? '/altro' : n.to)} className={cls || undefined} aria-current={on ? 'page' : undefined}>
            <Icon n={altro ? 'altro' : n.icon} size={21} />
            {altro ? 'Altro' : n.label === 'Allenamento' ? 'Allena' : n.label}
          </a>
        );
      })}
    </nav>
  );
}

function Altro({ corso, nav }: { corso: CorsoDiStudio; nav: typeof NAV }) {
  return <div className="page-narrow fade-in stack">
    <h1 className="title-xl">Altro</h1>
    <SceltaCorso corso={corso} classe="corso-switch-pagina" />
    <p className="small muted" style={{ margin: '-4px 2px 0' }}>{descriviCorso(corso)}</p>
    <h2 className="eyebrow" style={{ marginTop: 12 }}>Studio · materia selezionata</h2>
    <nav className="grid g2 altro-studio" aria-label="Altre sezioni di studio">
      {nav.filter((n) => ['originali', 'cronologia', 'glossario', 'norme', 'progressi'].includes(n.key)).map((n) => <a key={n.key} className="card cta-card" href={href(n.to)}><Icon n={n.icon} size={22} /><b className="title-s">{n.label}</b></a>)}
    </nav>
    <h2 className="eyebrow" style={{ marginTop: 12 }}>Backup · tutte le materie</h2>
    <a className="card cta-card" href={href('/backup')}><Icon n="backup" size={22} /><b className="title-s">Backup completo</b><span className="small muted">Un solo file per progressi, segni e mappe personali di tutte le materie.</span></a>
    <InviaMateriale corso={corso} classe="invia-materiale-pagina" />
    <a className="card cta-card" href={href('/demo')}><Icon n="demo" size={22} /><b className="title-s">Demo interattiva</b><span className="small muted">Scopri IURIS, dalle prime lezioni al backup.</span></a>
  </div>;
}

const Assente = () => <div className="empty"><h3>Questa materia non ha ancora questa sezione</h3><a className="btn" href={href('/')}>Torna a Oggi</a></div>;

function Rotte() {
  const { parti, query } = useRotta();
  const idx = useCorso();
  const slug = idx.corso.materia.slug;
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
    case 'norme': return idx.corso.norme ? <Norme id={id} /> : <Assente />;
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
