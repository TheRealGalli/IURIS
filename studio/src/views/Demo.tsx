import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { Bar, Icon, Ring } from '../components/ui';
import { href, useRotta, vai } from '../lib/router';
import { livello } from '../lib/srs';
import './Demo.css';

const TAPPE = [
  { id: 'oggi', nome: 'Oggi', icon: 'oggi', titolo: 'Sai sempre da dove ripartire.', testo: 'Oggi riunisce pagine studiate, padronanza, giorni di fila e ripassi in scadenza. Imposta la data dell’esame: il piano distribuisce le lezioni ancora da studiare nei giorni disponibili.', invito: 'Prova a segnare la lezione come studiata. Il riepilogo si aggiorna.', nota: 'Le pagine misurano il percorso che hai studiato. La padronanza cresce con le risposte e dipende anche dal tempo trascorso.' },
  { id: 'percorso', nome: 'Percorso', icon: 'percorso', titolo: 'Dalla lettura al ripasso.', testo: 'Il Percorso organizza ogni materia in unità e lezioni, con sintesi, punti chiave, concetti collegati e quiz. Dalla lezione puoi aprire il testo esteso negli Originali.', invito: 'Apri l’unità e cambia lo stato della lezione di esempio.', nota: 'Il comando Studiata è condiviso tra Percorso e Originali e attiva anche i termini del glossario e le date pertinenti. I triangoli segnalano note, correzioni o punti da verificare.' },
  { id: 'originali', nome: 'Originali', icon: 'libro', titolo: 'Il testo diventa il tuo quaderno.', testo: 'Leggi gli appunti in formato Testo, evidenzia o sottolinea i passaggi e premi Salva segno. Puoi scegliere giallo, verde o rosa, cancellare con la gomma e annullare o ripristinare le modifiche.', invito: 'Il passaggio è già selezionato: scegli strumento e colore, poi salva il segno.', nota: 'Il lettore ricorda il punto di lettura. I segni alimentano la Mappa personale e sono inclusi nel backup, insieme alla loro cronologia. La fonte PDF si trova in Fonte e comandi.' },
  { id: 'mappe', nome: 'Le tre mappe', icon: 'mappa', titolo: 'Tre modi di vedere la stessa materia.', testo: 'Per unità segue la struttura della lezione, Tutti i collegamenti mette in relazione i concetti dell’intera materia, Personale raccoglie ciò che hai evidenziato e sottolineato.', invito: 'Cambia mappa e tocca un nodo per scoprirne la funzione.', nota: 'Nelle mappe reali puoi ingrandire, spostarti e adattare la vista. Nei rami misurabili i colori dipendono dalle domande collegate; la mappa personale conserva i colori scelti da te.' },
  { id: 'colori', nome: 'I colori', icon: 'occhio', titolo: 'Un colore ti dice dove tornare.', testo: 'I colori della padronanza raccontano la sicurezza sulle domande che hai già provato: grigio mai verificato, rosso da ripassare, giallo così così, verde li sai.', invito: 'Muovi il cursore: vedrai cambiare lo stesso indicatore usato nell’app.', nota: 'Rosso sotto il 40%, giallo dal 40% a meno del 75%, verde dal 75%. Sono livelli sulle domande viste; la percentuale complessiva include anche quelle mai affrontate. I colori dei segni negli Originali li scegli liberamente.' },
  { id: 'allenamento', nome: 'Allenamento', icon: 'allena', titolo: 'Ripassi quando serve ricordare.', testo: 'Il ripasso spaziato usa le tue risposte per decidere quando riproporti ogni domanda. Puoi anche scegliere un quiz libero per unità, concetto o tipo di esercizio e allenarti per l’orale.', invito: 'Scopri la risposta della scheda di esempio e prova una valutazione.', nota: 'Il limite iniziale è 35 nuove al giorno per materia, modificabile in Progressi. I ripassi in scadenza sono sempre inclusi; una lezione appena studiata può aggiungere fino a 6 verifiche immediate.' },
  { id: 'cronologia', nome: 'Cronologia', icon: 'cronologia', titolo: 'Le date hanno un contesto.', testo: 'La linea del tempo collega eventi, periodi e lezioni. Puoi filtrare gli eventi e aprire le loro schede, poi ripassare le date negli esercizi.', invito: 'Seleziona un evento: il dettaglio segue il punto scelto.', nota: 'I colori della cronologia distinguono i tipi di evento, come leggi, opere, giuristi e istituzioni. Qui il colore indica una categoria, mentre le domande di ripasso misurano quanto ricordi.' },
  { id: 'glossario', nome: 'Glossario', icon: 'glossario', titolo: 'Ogni concetto porta ad altri concetti.', testo: 'Cerca un termine, apri la definizione e segui i collegamenti verso lezioni, relazioni e quiz. Puoi raggiungere un concetto anche dai termini collegati nel testo degli Originali.', invito: 'Cerca una delle voci di esempio e aprila.', nota: 'La ricerca generale, accessibile anche con ⌘K o Ctrl+K, trova concetti, lezioni e date nella materia selezionata.' },
  { id: 'progressi', nome: 'Progressi e statistiche', icon: 'progressi', titolo: 'Capisci cosa misurano i numeri.', testo: 'Le pagine studiate contano le pagine delle lezioni segnate come Studiata, senza duplicare quelle della stessa fonte. La padronanza stima il ricordo dalle risposte, dalla stabilità e dal tempo passato: può diminuire se non ripassi.', invito: 'Cambia quante domande hai visto e la loro sicurezza media per capire il calcolo.', nota: 'In Progressi trovi anche risposte e percentuale di corrette, tempo di lettura, giorni attivi, dettagli per unità e tipo di domanda. Nel calendario più verde significa più attività; il giorno dell’esame è rosso. Tocca un giorno per il dettaglio.' },
  { id: 'backup', nome: 'Backup', icon: 'backup', titolo: 'Tutto il tuo studio, in un solo file.', testo: 'Il salvataggio quotidiano è automatico nel browser. Per ritrovare i dati usa lo stesso browser, profilo, dispositivo e indirizzo del sito. Normalmente restano anche chiudendo la pagina e dopo gli aggiornamenti.', invito: 'Prova il percorso di salvataggio e ripristino. Poi crea il tuo backup dalla sezione dedicata.', nota: 'Safari o Chrome possono rimuovere i dati del sito; anche cancellarli manualmente elimina l’archivio locale. Una copia recente ti permette di recuperare tutto fino al momento del backup, senza ricominciare da capo.' },
] as const;

const NOMI_LIVELLO = { ignoto: 'Mai verificato', debole: 'Da ripassare', medio: 'Così così', forte: 'Li sai' };
const COLORI = { giallo: '#e8bd43', verde: '#70ad80', rosa: '#dc8da5' };
type Colore = keyof typeof COLORI;
type Segno = { colore: Colore; tipo: 'evidenziato' | 'sottolineato' };

export default function Demo() {
  const { query } = useRotta();
  const trovata = TAPPE.findIndex((t) => t.id === query.get('tappa'));
  const passo = trovata < 0 ? 0 : trovata;
  const tappa = TAPPE[passo];
  const titoloRef = useRef<HTMLHeadingElement>(null);
  const [studiata, setStudiata] = useState(false);
  const [segno, setSegno] = useState<Segno | null>(null);
  useLayoutEffect(() => {
    window.scrollTo({ top: 0 });
    titoloRef.current?.focus({ preventScroll: true });
  }, [passo]);
  const linkTappa = (i: number) => href(`/demo?tappa=${TAPPE[i].id}`);

  return <div className="page demo-page fade-in">
    <header className="demo-heading row-between">
      <div><div className="eyebrow">Primi passi · circa 5 minuti</div><h1 className="title-xl">Scopri IURIS</h1></div>
      <a className="btn btn-sm btn-ghost" href={href('/')} aria-label="Esci dalla demo"><Icon n="x" size={16} /><span className="demo-exit-label">Esci dalla demo</span></a>
    </header>
    <p className="muted demo-intro">Dalla prima lezione al backup. Esplora gli esempi: le prove nella demo non modificano il tuo archivio.</p>
    <div className="demo-layout">
      <div className="demo-navigation">
        <nav className="demo-index" aria-label="Tappe della demo">
          {TAPPE.map((t, i) => <a key={t.id} href={linkTappa(i)} className={i === passo ? 'on' : ''} aria-current={i === passo ? 'step' : undefined}>
            <span className="demo-step-number">{String(i + 1).padStart(2, '0')}</span><Icon n={t.icon} size={17} /><span>{t.nome}</span>
          </a>)}
        </nav>
        <label className="demo-picker small">Scegli una tappa
          <select className="select" value={tappa.id} onChange={(e) => vai(`/demo?tappa=${e.target.value}`)}>
            {TAPPE.map((t, i) => <option key={t.id} value={t.id}>{i + 1}. {t.nome}</option>)}
          </select>
        </label>
      </div>
      <section className="card demo-stage" aria-labelledby="demo-titolo">
        <div className="row-between"><span className="eyebrow">{passo + 1} / {TAPPE.length} · {tappa.nome}</span><span className="chip demo-sample">Esempio interattivo</span></div>
        <Bar value={(passo + 1) / TAPPE.length} tone="accent" thin />
        <h2 id="demo-titolo" className="title-l" ref={titoloRef} tabIndex={-1}>{tappa.titolo}</h2>
        <p className="muted demo-description">{tappa.testo}</p>
        <p className="demo-invito small"><Icon n="demo" size={17} />{tappa.invito}</p>
        <div className="demo-preview" key={tappa.id}>
          {tappa.id === 'oggi' && <EsempioOggi studiata={studiata} onStudia={() => setStudiata(!studiata)} />}
          {tappa.id === 'percorso' && <EsempioPercorso studiata={studiata} onStudia={() => setStudiata(!studiata)} />}
          {tappa.id === 'originali' && <EsempioOriginali segno={segno} onSegno={setSegno} />}
          {tappa.id === 'mappe' && <EsempioMappe segno={segno} />}
          {tappa.id === 'colori' && <EsempioColori />}
          {tappa.id === 'allenamento' && <EsempioAllenamento />}
          {tappa.id === 'cronologia' && <EsempioCronologia />}
          {tappa.id === 'glossario' && <EsempioGlossario />}
          {tappa.id === 'progressi' && <EsempioStatistiche />}
          {tappa.id === 'backup' && <EsempioBackup />}
        </div>
        <p className="demo-nota small"><Icon n={tappa.id === 'backup' ? 'backup' : 'occhio'} size={18} /><span>{tappa.nota}</span></p>
        <footer className="demo-controls">
          {passo > 0 ? <a className="btn btn-sm" href={linkTappa(passo - 1)}><Icon n="indietro" size={16} /> Indietro</a> : <span className="tiny faint">Puoi aprire qualsiasi tappa.</span>}
          {passo < TAPPE.length - 1 ? <a className="btn btn-primary" href={linkTappa(passo + 1)}>Avanti <Icon n="freccia" size={16} /></a>
            : <a className="btn btn-primary" href={href('/backup')}><Icon n="backup" size={17} /> Apri Backup completo</a>}
        </footer>
      </section>
    </div>
  </div>;
}

function EsempioOggi({ studiata, onStudia }: { studiata: boolean; onStudia: () => void }) {
  return <div className="stack">
    <div className="demo-today">
      <Ring value={studiata ? .3 : .2} size={88}><div><b>{studiata ? 30 : 20}%</b><small>pagine</small></div></Ring>
      <div><div className="eyebrow">Il tuo punto di partenza</div><h3 className="title-m">Una lezione alla volta.</h3><p className="muted small">{studiata ? 30 : 20} / 100 pagine studiate · 12% padronanza</p></div>
    </div>
    <div className="demo-paper row-between"><div><b>La lezione di oggi</b><div className="small muted">10 pagine · {studiata ? 'Pronta per la verifica' : 'Da studiare'}</div></div><button className={`btn btn-sm ${studiata ? 'btn-ok' : ''}`} aria-pressed={studiata} onClick={onStudia}><Icon n="check" size={16} />{studiata ? 'Studiata' : 'Segna Studiata'}</button></div>
    <p className="tiny muted" role="status">{studiata ? 'Le pagine aumentano. La padronanza aspetta le tue risposte: leggere e ricordare misurano due cose diverse.' : 'Segna la lezione per vedere crescere le pagine studiate.'}</p>
  </div>;
}

function EsempioPercorso({ studiata, onStudia }: { studiata: boolean; onStudia: () => void }) {
  const [aperta, setAperta] = useState(true);
  return <div className="stack">
    <button className="demo-unit row-between" onClick={() => setAperta(!aperta)} aria-expanded={aperta} aria-controls="demo-lezione"><span className="row"><span className="unit-num">01</span><b>La prima unità</b></span><Icon n={aperta ? 'su' : 'giu'} size={17} /></button>
    {aperta && <div id="demo-lezione" className="demo-paper stack"><div className="row-between"><h3 className="title-s">La lezione di oggi</h3><span className={`chip ${studiata ? 'chip-gold' : ''}`}>{studiata ? 'Studiata' : 'Da studiare'}</span></div><p className="small muted">Sintesi → punti chiave → testo esteso → quiz. Lo stato è lo stesso che hai provato nella tappa Oggi.</p><button className={`btn btn-sm ${studiata ? 'btn-ok' : ''}`} style={{ alignSelf: 'flex-start' }} aria-pressed={studiata} onClick={onStudia}><Icon n="check" size={16} />{studiata ? 'Studiata · annulla nella demo' : 'Segna come Studiata'}</button></div>}
    <div className="row small muted"><span className="st st-studiata" /><span>Studiata</span><span className="st st-in-ripasso" /><span>In ripasso</span><span className="st st-padroneggiata"><Icon n="check" size={12} /></span><span>Padroneggiata</span></div>
  </div>;
}

function EsempioOriginali({ segno, onSegno }: { segno: Segno | null; onSegno: (s: Segno | null) => void }) {
  const [colore, setColore] = useState<Colore>(segno?.colore ?? 'giallo');
  const [tipo, setTipo] = useState<Segno['tipo']>(segno?.tipo ?? 'evidenziato');
  const [annullato, setAnnullato] = useState<Segno | null>(null);
  const stile = (s: Segno): CSSProperties => s.tipo === 'evidenziato' ? { background: `color-mix(in srgb, ${COLORI[s.colore]} 40%, transparent)` } : { textDecoration: 'underline', textDecorationColor: COLORI[s.colore], textDecorationThickness: '3px', textUnderlineOffset: '5px' };
  return <div className="stack">
    <div className="row" aria-label="Strumenti della demo">
      <button className={`btn btn-sm ${tipo === 'evidenziato' ? 'btn-primary' : ''}`} aria-pressed={tipo === 'evidenziato'} onClick={() => setTipo('evidenziato')}><Icon n="evidenzia" size={16} />Evidenzia</button>
      <button className={`btn btn-sm ${tipo === 'sottolineato' ? 'btn-primary' : ''}`} aria-pressed={tipo === 'sottolineato'} onClick={() => setTipo('sottolineato')}><Icon n="sottolinea" size={16} />Sottolinea</button>
      {(Object.keys(COLORI) as Colore[]).map((c) => <button key={c} className="demo-swatch" style={{ '--swatch': COLORI[c] } as CSSProperties} aria-label={`Colore ${c}`} aria-pressed={colore === c} onClick={() => setColore(c)} />)}
    </div>
    <div className="demo-paper demo-reading"><div className="eyebrow">Passaggio di esempio · già selezionato</div><p>Studiare significa <span style={stile({ colore, tipo })}>collegare ciò che leggi a ciò che ricordi</span>, per ritrovare il filo anche a distanza di tempo.</p></div>
    <div className="row">
      <button className="btn btn-sm" onClick={() => { setAnnullato(segno); onSegno({ colore, tipo }); }}><Icon n="salva" size={16} />Salva segno nella demo</button>
      <button className="btn btn-sm btn-ghost" disabled={!segno} onClick={() => { setAnnullato(segno); onSegno(null); }}><Icon n="gomma" size={16} />Gomma</button>
      <button className="btn btn-sm btn-ghost" disabled={!segno && !annullato} onClick={() => { onSegno(annullato); setAnnullato(segno); }}><Icon n="annulla" size={16} />{!segno && annullato ? 'Ripristina' : 'Annulla'}</button>
    </div>
    <p className="small muted" role="status">{segno ? <>Segno salvato: <span style={stile(segno)}>collegare ciò che leggi a ciò che ricordi</span>. Lo ritroverai nella prossima tappa, in Personale.</> : 'Il colore sul testo è un’anteprima. Salva il segno per ritrovarlo nella mappa della demo.'}</p>
  </div>;
}

function EsempioMappe({ segno }: { segno: Segno | null }) {
  const [modo, setModo] = useState('unita');
  const [nodo, setNodo] = useState<number | null>(null);
  const nomi = modo === 'unita' ? ['Unità', 'Definizioni', 'Esempi'] : modo === 'grafo' ? ['Concetto A', 'Concetto B', 'Concetto C'] : ['La lezione', 'Il tuo passaggio', 'Il concetto'];
  return <div className="stack">
    <div className="row">{[['unita', 'Per unità'], ['grafo', 'Tutti i collegamenti'], ['personale', 'Personale']].map(([id, nome]) => <button key={id} className={`chip ${modo === id ? 'on' : ''}`} aria-pressed={modo === id} onClick={() => { setModo(id); setNodo(null); }}>{nome}</button>)}</div>
    <div className={`demo-map demo-map-${modo}`}>
      <svg viewBox="0 0 480 180" preserveAspectRatio="none" aria-hidden="true"><path d={modo === 'grafo' ? 'M240 38 75 140 405 140Z' : 'M80 90H225V40H390M225 90V140H390'} /></svg>
      {nomi.map((nome, i) => <button key={i} className={`demo-map-node demo-map-n${i} ${nodo === i ? 'selected' : ''}`} onClick={() => setNodo(i)} aria-pressed={nodo === i}>{nome}</button>)}
    </div>
    <div className="demo-map-detail small" role="status">{modo === 'personale' ? segno ? <><b>Il tuo segno dagli Originali</b><p style={{ borderLeft: `3px solid ${COLORI[segno.colore]}`, paddingLeft: 12 }}>«collegare ciò che leggi a ciò che ricordi» · {segno.tipo}, {segno.colore}</p>Nel sito, il passaggio riapre il punto esatto del testo.</> : 'La Mappa personale nasce dai tuoi segni. Torna alla tappa Originali e salvane uno per vederlo qui.' : nodo === null ? 'Tocca un nodo. Nella mappa reale apri rami e concetti senza perdere il contesto.' : modo === 'unita' ? `${nomi[nodo]}: i rami mostrano la gerarchia dell’unità. Puoi aprirli e richiuderli.` : `${nomi[nodo]}: i collegamenti mostrano le relazioni tra concetti. Da una scheda puoi passare al termine collegato o al suo quiz.`}</div>
  </div>;
}

function EsempioColori() {
  const [sicurezza, setSicurezza] = useState(65);
  const [vista, setVista] = useState(true);
  const lv = livello(vista ? sicurezza / 100 : null, vista ? 1 : 0);
  return <div className="stack">
    <div className={`demo-level lv-${lv}`}><span className="dot" /><b>{NOMI_LIVELLO[lv]}</b><span>{vista ? `${sicurezza}% sulle domande viste` : 'Nessuna risposta ancora'}</span></div>
    <label className="stack small" htmlFor="demo-sicurezza">Sicurezza sulle domande viste<input id="demo-sicurezza" type="range" min="0" max="100" value={sicurezza} disabled={!vista} onChange={(e) => setSicurezza(Number(e.target.value))} /></label>
    <label className="row small"><input type="checkbox" checked={vista} onChange={(e) => setVista(e.target.checked)} />Ho già provato almeno una domanda</label>
    <div className="demo-legend">{(['ignoto', 'debole', 'medio', 'forte'] as const).map((l) => <span key={l} className={`row small lv-${l}`}><span className="dot" />{NOMI_LIVELLO[l]}</span>)}</div>
  </div>;
}

function EsempioAllenamento() {
  const [scoperta, setScoperta] = useState(false);
  const [voto, setVoto] = useState('');
  return <div className="stack">
    <div className="demo-paper stack"><div className="eyebrow">Flashcard di esempio</div><h3 className="title-m">A cosa serve il ripasso spaziato?</h3>{scoperta ? <p className="muted">A ritrovare le informazioni nel tempo, riproponendo le domande in base a come rispondi e a quanto è probabile che le ricordi.</p> : <button className="btn btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setScoperta(true)}>Mostra risposta</button>}</div>
    {scoperta && <div className="row">{['Di nuovo', 'Difficile', 'Bene', 'Facile'].map((v, i) => <button key={v} className={`btn btn-sm ${i === 0 ? 'btn-bad' : i === 1 ? 'btn-mid' : 'btn-ok'}`} aria-pressed={voto === v} onClick={() => setVoto(v)}>{voto === v && <Icon n="check" size={14} />}{v}</button>)}</div>}
    <p className="small muted" role="status">{voto ? `Hai scelto «${voto}». Nel ripasso reale il sistema ricalcola la prossima scadenza; «Di nuovo» e «Difficile» richiedono più rinforzo. Questa prova non registra risposte.` : 'Nel ripasso reale, valuta quanto è stato facile ricordare. Nelle domande con correzione il sistema tiene conto dell’esito.'}</p>
  </div>;
}

const EVENTI = [
  { nome: 'Una legge', tipo: 'Legge', colore: 'var(--t-legge)', testo: 'Una tappa normativa, con data, descrizione e lezioni collegate.' },
  { nome: 'Un’opera', tipo: 'Opera', colore: 'var(--t-opera)', testo: 'Un testo nel suo periodo storico, collegato ai temi della materia.' },
  { nome: 'Un’istituzione', tipo: 'Istituzione', colore: 'var(--t-istituzione)', testo: 'Un cambiamento istituzionale da collocare rispetto agli altri eventi.' },
];
function EsempioCronologia() {
  const [evento, setEvento] = useState(0);
  return <div className="stack"><div className="demo-timeline">{EVENTI.map((e, i) => <button key={e.nome} className={evento === i ? 'on' : ''} style={{ '--event-color': e.colore } as CSSProperties} aria-pressed={evento === i} onClick={() => setEvento(i)}><span /><b>{e.nome}</b><small>{e.tipo}</small></button>)}</div><div className="demo-paper stack" role="status"><h3 className="title-s">{EVENTI[evento].nome}</h3><p className="small muted">{EVENTI[evento].testo}</p><span className="tiny faint">Esempi di categorie, senza date reali.</span></div></div>;
}

const VOCI = [
  { nome: 'Definizione', testo: 'Nella scheda trovi il significato del termine e la sua spiegazione nel contesto della materia.', rel: 'Concetto → Lezione → Quiz' },
  { nome: 'Collegamento', testo: 'Le relazioni esplicitano il legame tra due concetti e permettono di seguirlo nella mappa.', rel: 'Concetto → Relazione → Altro concetto' },
  { nome: 'Fonte', testo: 'I rimandi alle lezioni e ai testi ti aiutano a tornare al passaggio da cui nasce il concetto.', rel: 'Concetto → Lezione → Testo esteso' },
];
function EsempioGlossario() {
  const [cerca, setCerca] = useState('');
  const [voce, setVoce] = useState(0);
  const risultati = VOCI.filter((v) => v.nome.toLocaleLowerCase('it').includes(cerca.trim().toLocaleLowerCase('it')));
  return <div className="stack"><label className="stack small">Cerca nel glossario di esempio<input className="input" value={cerca} onChange={(e) => setCerca(e.target.value)} placeholder="Definizione, collegamento, fonte…" /></label><div className="row">{risultati.map((v) => <button key={v.nome} className={`chip ${VOCI[voce] === v ? 'on' : ''}`} aria-pressed={VOCI[voce] === v} onClick={() => setVoce(VOCI.indexOf(v))}>{v.nome}</button>)}{!risultati.length && <span className="small muted" role="status">Nessuna voce di esempio corrispondente.</span>}</div><div className="demo-paper stack"><h3 className="title-m">{VOCI[voce].nome}</h3><p className="small muted">{VOCI[voce].testo}</p><div className="tiny faint">{VOCI[voce].rel}</div></div></div>;
}

function EsempioStatistiche() {
  const [viste, setViste] = useState(5);
  const [sicurezza, setSicurezza] = useState(80);
  const totale = Math.round(viste * sicurezza / 10);
  const lv = livello(viste ? sicurezza / 100 : null, viste);
  return <div className="stack">
    <div className="demo-stat-grid"><div className="demo-paper kpi"><b>{totale}%</b><span>padronanza complessiva</span></div><div className={`demo-paper kpi lv-${lv}`}><b className="demo-stat-color">{viste ? `${sicurezza}%` : '—'}</b><span><span className="dot" /> {NOMI_LIVELLO[lv]} · sulle viste</span></div></div>
    <label className="stack small" htmlFor="demo-viste">Domande viste: {viste} / 10<input id="demo-viste" type="range" min="0" max="10" value={viste} onChange={(e) => setViste(Number(e.target.value))} /></label>
    <label className="stack small" htmlFor="demo-media">Sicurezza media sulle viste: {sicurezza}%<input id="demo-media" type="range" min="0" max="100" value={sicurezza} onChange={(e) => setSicurezza(Number(e.target.value))} /></label>
    <div className="demo-paper small" role="status"><b>{viste} / 10 × {sicurezza}% = {totale}% complessivo</b><p className="muted">Esempio con 10 domande: quelle mai viste contano zero nel totale. Il colore usa la media sulle sole domande viste. La sicurezza è una stima del ricordo, distinta dalla percentuale storica di risposte corrette.</p></div>
  </div>;
}

function EsempioBackup() {
  const [fase, setFase] = useState(0);
  return <div className="stack">
    <div className="demo-backup-flow"><div className="demo-backup-subjects"><span>Romano</span><span>Filosofia</span><span>Ogni altra materia</span></div><Icon n="giu" size={22} /><div className="demo-backup-file"><Icon n="backup" size={27} /><b>formaiuris-backup.json</b><span className="tiny muted">Un solo file per tutto l’archivio</span></div></div>
    <div className="demo-backup-includes small">Progressi e risposte · ripassi e quiz sospesi · evidenziazioni e sottolineature · mappe personali ricostruite dai segni · cronologia dei segni · punti di lettura · esami e preferenze.</div>
    {fase === 0 && <button className="btn btn-sm" onClick={() => setFase(1)}><Icon n="scarica" size={17} />Simula il salvataggio</button>}
    {fase === 1 && <div className="demo-paper stack" role="status"><b>1. Conserva il file fuori dal browser</b><p className="small muted">Nel sito premi Scarica backup completo e conserva il file nei tuoi documenti o in una cartella cloud. Aggiornalo regolarmente e prima di cambiare browser o dispositivo.</p><button className="btn btn-sm" onClick={() => setFase(2)}><Icon n="carica" size={17} />Simula Carica backup</button></div>}
    {fase === 2 && <div className="demo-paper stack" role="status"><div className="eyebrow">2. Anteprima simulata</div><b>Il file contiene tutte le materie</b><p className="small muted">Nel sito scegli Carica backup, selezioni il file e controlli il riepilogo. Confermando, i dati delle materie elencate vengono sostituiti con quelli della copia; le altre materie restano conservate.</p><button className="btn btn-sm" onClick={() => setFase(3)}>Conferma nella demo</button></div>}
    {fase === 3 && <div className="demo-paper stack" role="status"><b className="row"><Icon n="check" size={18} />3. Riparti da dove eri arrivato</b><p className="small muted">Nella realtà ritrovi i progressi e i segni presenti nel file, anche su un altro browser o dispositivo. La mappa personale si ricompone dalle annotazioni recuperate.</p><button className="btn btn-sm btn-ghost" onClick={() => setFase(0)}>Riprova la simulazione</button></div>}
    <p className="tiny muted">Questa è una simulazione: nessun file è stato scaricato e nessun dato è stato ripristinato. Usa Apri Backup completo per salvare il tuo archivio reale.</p>
  </div>;
}
