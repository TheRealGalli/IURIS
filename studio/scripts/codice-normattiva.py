#!/usr/bin/env python3
"""Allinea il Codice civile dell'app al testo vigente di Normattiva (fonte ufficiale).

La base del Codice viene da Wikisource (scripts/codice-civile.py), che in più punti è ferma a testi superati
(filiazione prima del 2013, condominio prima del 2012…) e non ha alcuni articoli aggiunti. Normattiva pubblica ogni
articolo nel testo vigente: questo script li scarica uno per uno, li confronta con la base e registra le differenze
in «05 - Contenuti/norme-aggiornamenti.json», che codice-civile.py applica quando rigenera i libri.

Uso:
  python3 scripts/codice-normattiva.py --scarica      scarica indice e articoli (riprende da dove era rimasto)
  python3 scripts/codice-normattiva.py --confronta    stampa quanti articoli differiscono, senza scrivere
  python3 scripts/codice-normattiva.py --scrivi       aggiorna norme-aggiornamenti.json
  poi: python3 scripts/codice-civile.py   (rigenera norme.json e i libri)

Le pagine scaricate restano in «00 - Appunti e fonti/codice-civile-normattiva/» (fuori da git).
"""
import difflib, html, json, re, sys, time, urllib.request, http.cookiejar
from concurrent.futures import ThreadPoolExecutor
from datetime import date
from pathlib import Path

RADICE = Path(__file__).resolve().parents[2]
DEST = RADICE / 'Diritto Privato' / '05 - Contenuti'
FONTI = RADICE / 'Diritto Privato' / '00 - Appunti e fonti' / 'codice-civile-normattiva'
BASE = 'https://www.normattiva.it'
INDICE = BASE + '/uri-res/N2Ls?urn:nir:stato:regio.decreto:1942-03-16;262'
SUFFISSI = 'bis ter quater quinquies sexies septies octies novies decies undecies duodecies terdecies quaterdecies quinquiesdecies sexiesdecies'.split()

jar = http.cookiejar.CookieJar()
apri = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
apri.addheaders = [('User-Agent', 'Mozilla/5.0 (IURIS, app di studio; scarico una tantum del Codice civile)')]


def leggi_url(url, tentativi=4):
    for k in range(tentativi):
        try:
            with apri.open(url, timeout=45) as r: return r.read().decode('utf8', 'ignore')
        except Exception as e:
            if k == tentativi - 1: raise
            time.sleep(2 + 3 * k)


def indice():
    f = FONTI / '_indice.html'
    if not f.exists(): f.write_text(leggi_url(INDICE), encoding='utf8')
    voci = {}
    for url, etichetta in re.findall(r"showArticle\('(/atto/caricaArticolo\?[^']+)'[^>]*>\s*([^<]{1,40})<", f.read_text(encoding='utf8')):
        url = html.unescape(url)
        m = re.fullmatch(r'art\. (\d+)(?: ([a-z]+))?', etichetta.strip())
        # solo gli articoli del Codice (allegato, tipo 2) nella versione vigente, non le versioni «orig.»
        if not m or 'flagTipoArticolo=2' not in url or 'imUpdate=true' in url: continue
        if m.group(2) and m.group(2) not in SUFFISSI: continue
        n = m.group(1) + (f'-{m.group(2)}' if m.group(2) else '')
        voci.setdefault(n, url.replace(' ', '%20'))
    return voci


def scarica():
    FONTI.mkdir(parents=True, exist_ok=True)
    voci = indice()
    mancanti = [(n, u) for n, u in voci.items() if not (FONTI / f'{n}.html').exists()]
    print(f'{len(voci)} articoli nell\'indice, {len(mancanti)} da scaricare')
    def uno(v):
        n, u = v
        try:
            t = leggi_url(BASE + u)
            if 'bodyTesto' not in t: return n
            (FONTI / f'{n}.html').write_text(t, encoding='utf8'); time.sleep(0.25)
        except Exception: return n
    with ThreadPoolExecutor(3) as pool: falliti = [x for x in pool.map(uno, mancanti) if x]
    print(f'scaricati {len(mancanti) - len(falliti)}; falliti {len(falliti)}: {falliti[:20]}')


MAIUSCOLO = lambda r: sum(c.isupper() for c in r) > 0.85 * max(1, sum(c.isalpha() for c in r))


def articolo(n, rubrica_nota=''):
    """Rubrica, commi e stato dell'articolo dalla pagina di Normattiva. `rubrica_nota` è quella già conosciuta."""
    f = FONTI / f'{n}.html'
    if not f.exists(): return None
    s = f.read_text(encoding='utf8')
    corpo = re.search(r'<div class="bodyTesto">([\s\S]*?)<div class="d-flex justify-content-between', s)
    if not corpo: return None
    t = corpo.group(1)
    t = re.sub(r'<div class="art_aggiornamento[\s\S]*$', '', t)            # note di aggiornamento in coda
    t = re.sub(r'<br\s*/?>\s*<br\s*/?>', '\n\n', t)
    t = re.sub(r'<br\s*/?>', '\n', t)
    t = html.unescape(re.sub(r'<[^>]+>', '', t)).replace('\xa0', ' ')
    t = re.sub(r'-{5,}[\s\S]*$', '', t)
    t = re.sub(r'\(\(\s*\d+[a-z]?\s*\)\)', '', t)                           # richiami alle note «((12))»
    t = re.sub(r'\(\(|\)\)', '', t)                                          # segni di modifica
    t = re.sub(r'\s*\.\.\.\s*', ' ', t)                                    # parole soppresse da una modifica
    for _ in range(4): t = re.sub(r'(?<=[.;,:a-zàèéìòù)])[ \t]*\(\d{1,3}[a-z]?\)(?=\s|$|\()', '', t)  # richiami alle note «(216)»
    # avvisi redazionali in maiuscolo dentro il testo: «PERIODO SOPPRESSO DAL D.L. … N. 2.»
    t = re.sub(r"(?:PERIODO|COMMA|NUMERO|LETTERA|CAPOVERSO|ALINEA)\s+(?:SOPPRESS[OA]|ABROGAT[OA])[A-Z0-9 .,'’/-]*?N\.\s*\d+[A-Z0-9 .,'’/-]*?(?=\s+[A-ZÀ-Ý][a-zà-ù]|\s*\n|\s*$)", '', t)
    t = re.sub(r'[ \t]+', ' ', t)
    # rubrica senza parentesi su una riga a sé («Disconoscimento di paternità»), come negli articoli recenti
    testa = re.match(r'\s*(?:CODICE CIVILE\s*)?(?:Art\. ?\d+(?:[- ][a-z]+)?\.?\s*)?', t)
    prima_riga = t[testa.end():].split('\n', 1)[0].strip()
    riga_rubrica = ''
    if prima_riga and not prima_riga.startswith('(') and len(prima_riga) <= 160 and '\n' in t[testa.end():]:
        nuda = prima_riga.rstrip(' .')
        simile = rubrica_nota and difflib.SequenceMatcher(None, norma(nuda), norma(rubrica_nota)).ratio() > 0.75
        if simile or (not re.search(r'[.;:]$', prima_riga.replace(' .', '')) and not re.search(r'ABROGAT|SOPPRESS', prima_riga)):
            riga_rubrica = nuda; t = t[:testa.end()] + t[testa.end():].split('\n', 1)[1]
    # a capo semplice: resta solo davanti alle voci di un elenco
    t = re.sub(r'\n(?!\n)(?! ?(?:\d{1,2}[).-]|[a-z](?:-[a-z]+)?\)) )', ' ', t)
    righe = [r.strip() for r in re.split(r'\n+', t)]
    righe = [r for r in righe if r and r not in '.,;']
    # intestazioni: «CODICE CIVILE», «Art. 1.»
    while righe and re.match(r'(?:CODICE CIVILE\s*)?(?:Art\. ?\d+(?:[- ][a-z]+)?\.?)?\s*', righe[0]).end() > 0:
        resto = re.sub(r'^(?:CODICE CIVILE\s*)?(?:Art\. ?\d+(?:[- ][a-z]+)?\.?)?\s*', '', righe[0])
        if resto == righe[0]: break
        if resto: righe[0] = resto
        else: righe.pop(0)
    rubrica = riga_rubrica
    if righe and not rubrica:
        righe[0] = re.sub(r'^\(([^()]{2,120})\.\s*$', r'(\1).', righe[0])  # parentesi non chiusa
        m = re.match(r'\(([^()]{2,200}(?:\([^()]*\)[^()]*)?)\)\s*\.?\s*', righe[0])
        if m and not re.search(r'ABROGAT|SOPPRESS', m.group(1)):
            rubrica = m.group(1).strip().rstrip('.'); righe[0] = righe[0][m.end():]
        elif rubrica_nota and norma(righe[0]).startswith(norma(rubrica_nota)) and len(norma(rubrica_nota)) > 3:
            # rubrica senza parentesi in testa al primo capoverso: si toglie contando i caratteri utili
            k, i = len(norma(rubrica_nota)), 0
            while k and i < len(righe[0]):
                k -= len(norma(righe[0][i])); i += 1
            rubrica = righe[0][:i].strip(' .'); righe[0] = righe[0][i:].lstrip(' .')
        if righe and not righe[0]: righe.pop(0)
    VERBO = re.compile(r'\b(?:è|sono|ha|hanno|può|possono|deve|devono|si|non|sia|siano)\b')
    if righe and not rubrica and len(righe) > 1 and len(righe[0]) <= 110 and righe[0].endswith('.') and not VERBO.search(righe[0]) \
            and not re.search(r'ABROGAT|SOPPRESS|\d\)', righe[0]) and len(righe[0].split()) <= 12:
        rubrica = righe.pop(0).rstrip(' .')                                   # «Responsabilità genitoriale.» su un capoverso a sé
    elif righe and not rubrica and not rubrica_nota:
        m = re.match(r'([A-ZÀ-Ý][^.,;:()]{3,60})\. (?=[A-ZÀ-Ý])', righe[0])   # «Separazione dei beni. I coniugi…»
        if m and len(m.group(1).split()) <= 6 and not VERBO.search(m.group(1)): rubrica = m.group(1); righe[0] = righe[0][m.end():]
    righe = [r for r in righe if re.search(r'[A-Za-zÀ-ÿ]{2}', r) and not re.fullmatch(r'(?:\(\d+[a-z]?\)\s*)+', r)]
    puliti = []
    for r in righe:
        if not MAIUSCOLO(r): r = re.sub(r'(?<=[a-zàèéìòù)»][.;:])\s+\d{1,4}[a-z]?\s*$', '', r).strip()        # numero di pagina o di nota rimasto in coda
        if MAIUSCOLO(r) and len(r) > 12:
            if re.search(r'ABROGAT|SOPPRESS', r) and len(righe) > 1: puliti.append('(Comma abrogato.)')
            elif len(righe) == 1: puliti.append(r)
            continue                                                         # nota redazionale in maiuscolo
        if r: puliti.append(r.replace("'", '’'))
    testo = ' '.join(puliti)
    abrogato = not puliti or (len(puliti) == 1 and bool(re.search(r'ABROGA|SOPPRESS|abrogato', testo)) and len(testo) < 300)
    vigore = re.search(r'id="artInizio"[^>]*>\s*(?:&nbsp;)?\s*([\d-]+)', s)
    nota = ''
    if abrogato and puliti:
        nota = puliti[0].strip(' .').capitalize() + '.'
        for x, y in (('d.lgs.', 'd.lgs.'), (' dal d.l. ', ' dal d.l. '), (' l. ', ' l. '), (' n. ', ' n. ')): nota = nota.replace(x, y)
        nota = re.sub(r'\b(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\b', lambda m: m.group(1), nota)
    return {'tema': rubrica.replace("'", '’'), 'commi': puliti, 'abrogato': abrogato, 'nota': nota, 'dal': vigore.group(1) if vigore else ''}


norma = lambda x: re.sub(r'[^a-z0-9àèéìòù]', '', re.sub(r'</?br ?/?>', ' ', x).lower().replace('ı', 'i'))


def base():
    """Articoli oggi nell'app (senza gli aggiornamenti già scritti da questo script)."""
    out = {}
    for f in sorted((DEST / 'norme').glob('libro-*.json')):
        for g in json.loads(f.read_text(encoding='utf8'))['gruppi']:
            for a in g['articoli']: out[a['n']] = a
    return out


def confronta(scrivi):
    voci, app = indice(), base()
    p = DEST / 'norme-aggiornamenti.json'
    agg = json.loads(p.read_text(encoding='utf8')) if p.exists() else {}
    prima = {k: v for k, v in agg.items() if v.get('fonte') == 'normattiva'}  # scritte in un giro precedente
    agg = {k: v for k, v in agg.items() if v.get('fonte') != 'normattiva'}
    oggi = date.today().isoformat()
    diversi, nuovi, abrogati, uguali, senza = [], [], [], 0, []
    for n in voci:
        vecchio = app.get(n)
        a = articolo(n, (vecchio or {}).get('tema', ''))
        if a is None: senza.append(n); continue
        if n in agg: continue  # correzione fatta a mano: resta
        voce = {'fonte': 'normattiva', 'verificato': oggi}
        if a['dal']: voce['vigenteDal'] = a['dal']
        if a['abrogato']:
            if vecchio is None: continue
            if n in prima and prima[n].get('abrogato'): agg[n] = {**prima[n], 'verificato': oggi}; continue
            if not vecchio.get('abrogato'):
                abrogati.append(n)
                agg[n] = {**voce, 'abrogato': True, 'nota': a['nota'] or 'Articolo abrogato.',
                          **({'precedente': vecchio['commi']} if len(' '.join(vecchio['commi'])) > 40 else {})}
            continue
        if vecchio is None:
            nuovi.append(n); agg[n] = {**voce, 'nuovo': True, 'tema': a['tema'], 'commi': a['commi']}
            continue
        stesso_testo = norma(' '.join(vecchio['commi'])) == norma(' '.join(a['commi']))
        # la rubrica di Normattiva vale solo se è davvero un'altra: a parità di sostanza resta quella già pulita
        a['tema'] = re.sub(r'\s*\(\d+\)', '', a['tema']).strip()
        stessa_rubrica = not a['tema'] or (vecchio.get('tema') and difflib.SequenceMatcher(None, norma(vecchio['tema']), norma(a['tema'])).ratio() >= 0.8)
        if stesso_testo and stessa_rubrica and not vecchio.get('abrogato'):
            # l'app ha già il testo vigente: se è così grazie a un giro precedente, la correzione resta registrata
            if n in prima: agg[n] = {**prima[n], 'verificato': oggi}
            uguali += 1; continue
        diversi.append(n)
        agg[n] = {**voce, 'commi': a['commi'], 'abrogato': False, **({'tema': a['tema']} if a['tema'] and not stessa_rubrica else {})}
    num = lambda x: (int(re.match(r'\d+', x).group()), x)
    print(f'uguali {uguali}; testo o rubrica diversi {len(diversi)}; assenti nell\'app {len(nuovi)}; abrogati da segnare {len(abrogati)}; pagine mancanti {len(senza)}')
    print('assenti:', sorted(nuovi, key=num)[:80])
    print('abrogati:', sorted(abrogati, key=num)[:60])
    print('diversi (primi):', sorted(diversi, key=num)[:120])
    if scrivi:
        p.write_text(json.dumps(dict(sorted(agg.items(), key=lambda kv: num(kv[0]))), ensure_ascii=False, indent=1) + '\n', encoding='utf8')
        print(f'scritto {p.name}: {len(agg)} voci')


if __name__ == '__main__':
    if '--scarica' in sys.argv: scarica()
    elif '--confronta' in sys.argv or '--scrivi' in sys.argv: confronta('--scrivi' in sys.argv)
    else: print(__doc__)
