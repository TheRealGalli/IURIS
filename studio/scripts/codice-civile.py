#!/usr/bin/env python3
"""Costruisce la sezione «Codice civile» di Diritto privato dalle pagine di Wikisource.

  python3 studio/scripts/codice-civile.py --scarica   # scarica le pagine (una per titolo) nella cartella delle fonti
  python3 studio/scripts/codice-civile.py             # genera norme.json e norme/<libro>.json in 05 - Contenuti

Le pagine scaricate restano in «Diritto Privato/00 - Appunti e fonti/codice-civile-wikisource/» (fuori da git).
Wikisource dichiara il testo aggiornato al 6 luglio 2022: le modifiche successive si registrano in
«05 - Contenuti/norme-aggiornamenti.json» (vedi piani/diritto-privato.md) e prevalgono sul testo scaricato.
"""
import json, re, sys, time, urllib.parse, urllib.request
from pathlib import Path

RADICE = Path(__file__).resolve().parents[2]
FONTI = RADICE / 'Diritto Privato' / '00 - Appunti e fonti' / 'codice-civile-wikisource'
DEST = RADICE / 'Diritto Privato' / '05 - Contenuti'
UA = {'User-Agent': 'iuris-study-app/0.1'}
ROMANI = {'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6, 'VII': 7, 'VIII': 8, 'IX': 9, 'IX-bis': 9.5, 'X': 10,
          'XI': 11, 'XII': 12, 'XIII': 13, 'XIV': 14}
LIBRI = {'I': 'Delle persone e della famiglia', 'II': 'Delle successioni', 'III': 'Della proprietà',
         'IV': 'Delle obbligazioni', 'V': 'Del lavoro', 'VI': 'Della tutela dei diritti'}
SUFFISSI = r'bis|ter|quater|quinquies|sexies|septies|octies|novies|nonies|decies|undecies|duodecies|terdecies|quaterdecies|quinquiesdecies|sexiesdecies|septiesdecies|octiesdecies'
ART = re.compile(rf"^\[?\s*(?:\{{\{{§\|[^}}]*\}}\}})?\s*(?:Art(?:icolo|\.)?\s*)?(\d+(?:[ -]?(?:{SUFFISSI}))?(?:[./]\d+)?)\b\.?\s*(.*?)\s*\]?$", re.I)
# rinvii ad altri articoli messi tra parentesi dai curatori: «(43, Costit. 29)», «(Cod. Pen. 570)», «(6)»
RINVIO = re.compile(r"\s*\((?=[^)]*\d)(?:[\d\s,;.\-–]|e\b|ss?\b|seg(?:uenti|g)?\b|" + SUFFISSI + r"|Cod\.?|Costit\.?|Cost\.?|Pen\.?|Proc\.?|Civ\.?|Nav\.?|att\.?|disp\.?|prel\.?|trans\.?|c\.p\.c\.?|c\.p\.?|l\.?|n\.?)+\)")

def scarica():
    FONTI.mkdir(parents=True, exist_ok=True)
    url = 'https://it.wikisource.org/w/api.php?action=query&list=allpages&apprefix=Codice%20civile/&aplimit=500&format=json'
    titoli = [p['title'] for p in json.load(urllib.request.urlopen(urllib.request.Request(url, headers=UA)))['query']['allpages']]
    for t in titoli:
        f = FONTI / (re.sub(r'[^A-Za-z0-9-]+', '_', t) + '.txt')
        if f.exists(): continue
        u = 'https://it.wikisource.org/w/index.php?title=' + urllib.parse.quote(t.replace(' ', '_')) + '&action=raw'
        f.write_bytes(urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=30).read())
        time.sleep(0.25)
    print(f'{len(titoli)} pagine in {FONTI}')

def pulisci(s):
    s = re.sub(r'<ref[^>]*>.*?</ref>|<ref[^>]*/>|<references\s*/?>', '', s, flags=re.S)
    s = re.sub(r'\{\{[^{}]*\}\}', '', s)
    s = re.sub(r'\[\[[^\]|]*\|([^\]]*)\]\]', r'\1', s)
    s = re.sub(r'\[\[([^\]]*)\]\]', r'\1', s)
    s = re.sub(r"'{2,}", '', s)
    s = re.sub(r'</?(?:small|big|onlyinclude|div|span|center)[^>]*>', '', s)
    s = RINVIO.sub('', s)
    return re.sub(r'[ \t]+', ' ', s).replace(" ,", ",").replace(" .", ".").strip()

def chiave_articolo(n):
    m = re.match(r'(\d+)(?:[ -]?([a-z]+))?(?:[./](\d+))?', n)
    suff = (SUFFISSI.split('|').index(m.group(2)) + 1) if m.group(2) else 0
    return (int(m.group(1)), suff, int(m.group(3) or 0))

def leggi(file, serie=None):
    testo = file.read_text(encoding='utf8')
    testo = re.sub(r'<!--.*?-->', '', testo, flags=re.S)
    gruppi, percorso, art = [], {}, None
    def chiudi():
        nonlocal art
        if art is None: return
        righe = [pulisci(x) for x in re.split(r'</?br\s*/?>|\n', art.pop('raw'))]
        art['commi'] = [x for x in righe if x and not re.fullmatch(r'[-–—=\s]*', x)]
        prima = art['commi'][0] if art['commi'] else ''
        if not art['commi'] or re.match(r'\(?\s*(?:articolo\s+)?abrogat', prima, re.I) or re.search(r'abrogat', art.get('tema', ''), re.I):
            art['abrogato'] = True
            art['tema'] = re.sub(r'\s*\(?abrogat[oa]\)?\s*', '', art.get('tema', '')).strip()
        if not art.get('tema'): art.pop('tema', None)
        art = None
    for riga in testo.split('\n'):
        m = re.match(r'^(=+)\s*(.*?)\s*=+\s*$', riga)
        if not m:
            if art is not None: art['raw'] += riga + '\n'
            continue
        titolo = pulisci(m.group(2)) if '{{§' not in m.group(2) else m.group(2)
        a = ART.match(m.group(2).strip()) if not re.match(r'\s*(§|Capo|CAPO|Sezione|SEZIONE|Titolo|Note)', m.group(2)) else None
        if a:
            chiudi()
            n = re.sub(r'[ -]+', '-', a.group(1).lower())
            tema = pulisci(re.sub(r'\(\*\)|\[|\]', '', a.group(2))).strip(' .')
            art = {'n': n, 'tema': tema, 'raw': ''}
            if serie: art['serie'] = serie
            if not gruppi or gruppi[-1]['_p'] != dict(percorso):
                gruppi.append({'titolo': ' › '.join(percorso[k] for k in sorted(percorso)), '_p': dict(percorso), 'articoli': []})
            gruppi[-1]['articoli'].append(art)
        elif titolo == 'Note' or re.match(r'Titolo\b', titolo):
            chiudi()                                                        # il titolo è già l'intestazione della pagina
        else:
            chiudi()
            livello = len(m.group(1))
            for k in [k for k in percorso if k >= livello]: del percorso[k]
            t = re.sub(r'\s*\[[\d\s\w.\-–]*\]\s*$', '', titolo)            # «[143-148]» in coda
            t = re.sub(r'^(CAPO|SEZIONE)\b', lambda x: x.group(1).capitalize(), t)
            percorso[livello] = re.sub(r'^((?:Capo|Sezione|Titolo|§)\s*[\dIVXL]+(?:[ -]bis)?)\s*:?\s*', r'\1 · ', t).rstrip('. ')
    chiudi()
    for g in gruppi: del g['_p']
    return gruppi

AGGIORNAMENTI = {}
# campi di servizio di norme-aggiornamenti.json che non vanno nei file pubblicati
META = {'fonte', 'verificato', 'vigenteDal', 'nuovo'}
# intestazioni che la base riporta ancora nella forma anteriore alla riforma della filiazione (d.lgs. 154/2013)
INTESTAZIONI = {
    'Titolo IX · Della potestà dei genitori': 'Titolo IX · Della responsabilità genitoriale e dei diritti e doveri del figlio',
    'Capo I · Dello Stato di figlio legittimo': 'Capo I–III · Dello stato di figlio',
    'Sezione I · Dello stato di figlio legittimo': 'Della presunzione di paternità',
    'Sezione II · Delle prove della filiazione legittima': 'Delle prove della filiazione',
    'Sezione III · Dell’azione di disconoscimento e delle azioni di contestazione e di reclamo di legittimità': 'Dell’azione di disconoscimento e delle azioni di contestazione e di reclamo dello stato di figlio',
    'Capo II · Della filiazione naturale e della legittimazione': 'Capo IV–V · Dei figli nati fuori del matrimonio',
    'Sezione I · Della filiazione naturale': 'Riconoscimento e dichiarazione giudiziale',
    '§1 · Del riconoscimento dei figli naturali': 'Del riconoscimento dei figli nati fuori del matrimonio',
    '§ 2 · Della dichiarazione giudiziale della paternità e della maternità naturale': 'Della dichiarazione giudiziale della paternità e della maternità',
    'Sezione II · Della legittimazione dei figli naturali': 'Della legittimazione (abrogata)',
}

def genera():
    global AGGIORNAMENTI
    f = DEST / 'norme-aggiornamenti.json'
    if f.exists(): AGGIORNAMENTI = json.loads(f.read_text(encoding='utf8'))
    if not FONTI.exists(): sys.exit('Mancano le pagine: lancia prima con --scarica')
    libri, indice_tot = [], 0
    def libro(ident, titolo, file_e_titoli, serie=None):
        nonlocal indice_tot
        gruppi = []
        for f, intestazione in file_e_titoli:
            for g in leggi(f, serie):
                g['titolo'] = ' › '.join(x for x in (intestazione, g['titolo']) if x)
                gruppi.append(g)
        # doppioni nella pagina di origine: resta il primo; poi gli aggiornamenti registrati a mano
        visti = set()
        for g in gruppi:
            g['articoli'] = [a for a in g['articoli'] if not (a['n'] in visti or visti.add(a['n']))]
            g['titolo'] = ' › '.join(INTESTAZIONI.get(x, x) for x in g['titolo'].split(' › '))
            for a in g['articoli']:
                agg = AGGIORNAMENTI.get(a['n']) if not serie else None
                if agg:
                    a.update({k: v for k, v in agg.items() if k not in META})
                    if agg.get('abrogato'): a['commi'] = [agg.get('nota', 'Articolo abrogato.')]; a.pop('nota', None)
                    else: a.pop('abrogato', None)
        gruppi = [g for g in gruppi if g['articoli']]
        # articoli che la base non ha (aggiunti da leggi successive): entrano dopo quello che li precede
        if not serie and gruppi:
            chiavi = [chiave_articolo(a['n']) for g in gruppi for a in g['articoli']]
            for n, agg in sorted(AGGIORNAMENTI.items(), key=lambda kv: chiave_articolo(kv[0])):
                k = chiave_articolo(n)
                if not agg.get('nuovo') or not (min(chiavi)[0] <= k[0] <= max(chiavi)[0]) or k in chiavi: continue
                dove = None
                for g in gruppi:
                    for i, a in enumerate(g['articoli']):
                        if chiave_articolo(a['n']) < k: dove = (g, i)
                if dove is None: continue
                dove[0]['articoli'].insert(dove[1] + 1, {'n': n, **{x: v for x, v in agg.items() if x not in META}})
                chiavi.append(k)
        n = sum(len(g['articoli']) for g in gruppi)
        (DEST / 'norme').mkdir(exist_ok=True)
        (DEST / 'norme' / f'{ident}.json').write_text(json.dumps({'gruppi': gruppi}, ensure_ascii=False, indent=1) + '\n', encoding='utf8')
        libri.append({'id': ident, 'titolo': titolo, 'file': f'norme/{ident}.json', 'articoli': n})
        indice_tot += n
        return gruppi
    pre = FONTI / 'Codice_civile_Disposizioni_sulla_legge_in_generale.txt'
    libro('preleggi', 'Disposizioni sulla legge in generale', [(pre, '')], serie='preleggi')
    tutti = []
    for num, nome in LIBRI.items():
        pagine = []
        for f in FONTI.glob(f'Codice_civile_Libro_{num}_Titolo_*.txt'):
            t = f.stem.split('_Titolo_')[1].replace('_', '-')
            m = re.search(r'sottotitolo\s*=\s*([^|}\n]*)', f.read_text(encoding='utf8'))
            nome_t = re.sub(r'^.*?Titolo\s+[IVX]+(?:-bis)?\s*:?\s*', '', m.group(1)) if m else ''
            nome_t = re.sub(r'^Libro\s+\w+\s*-\s*', '', re.sub(r'\s*\[[^\]]*\]?\s*$', '', nome_t)).strip()
            nome_t = re.sub(r'\s*\(\*\)|\s*\[[^\]]*\]', '', nome_t).lstrip('- ').strip()
            if nome_t.isupper(): nome_t = nome_t.capitalize()
            pagine.append((ROMANI[t], f, f'Titolo {t} · {nome_t}'.rstrip(' ·')))
        pagine.sort()
        g = libro(f'libro-{num.lower()}', f'Libro {num} · {nome}', [(f, t) for _, f, t in pagine])
        tutti += [a for x in g for a in x['articoli']]
    # controlli: numeri mancanti e doppi
    visti = {}
    for a in tutti: visti.setdefault(a['n'], 0); visti[a['n']] += 1
    doppi = sorted(n for n, k in visti.items() if k > 1)
    base = {chiave_articolo(n)[0] for n in visti}
    mancanti = [n for n in range(1, 2970) if n not in base]
    date_verifica = sorted({v['verificato'] for v in AGGIORNAMENTI.values() if v.get('fonte') == 'normattiva'})
    AGGIORNAMENTO = (f'Testo confrontato articolo per articolo con quello vigente su Normattiva il {date_verifica[-1]}.' if date_verifica
                     else 'Testo da Wikisource, che lo dichiara aggiornato al 6 luglio 2022: le modifiche successive sono in corso di verifica.')
    norme = {
        'nome': 'Codice civile', 'atto': 'Codice civile', 'sigla': 'c.c.',
        'aggiornamento': AGGIORNAMENTO,
        'fonte': {'titolo': 'Normattiva, Codice civile (testo vigente); base da Wikisource', 'url': 'https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:regio.decreto:1942-03-16;262'},
        'libri': libri,
    }
    (DEST / 'norme.json').write_text(json.dumps(norme, ensure_ascii=False, indent=1) + '\n', encoding='utf8')
    print(f'{indice_tot} articoli in {len(libri)} file; abrogati {sum(1 for a in tutti if a.get("abrogato"))}; doppi {doppi[:12]}; numeri assenti {len(mancanti)}: {mancanti[:60]}')

if __name__ == '__main__':
    scarica() if '--scarica' in sys.argv else genera()
