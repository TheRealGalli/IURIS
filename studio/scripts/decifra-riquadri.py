#!/usr/bin/env python3
"""Ricostruisce i riquadri «illeggibili» della dispensa di Diritto privato.

Nel PDF i riquadri di approfondimento usano un font (NanumGothic) senza tabella dei caratteri: l'estrazione dà
simboli a caso («+:<.» per «art.»). I codici però seguono l'ordine dei glifi, quindi la tabella si ricostruisce:
0x09–0x12 cifre, 0x15–0x28 maiuscole, 0x2b–0x40 minuscole, più punteggiatura e accentate.

Lo script rilegge il PDF, decifra ogni riga in quel font, la ritrova nei blocchi di letture-src e scrive le
sostituzioni in letture-src/revisioni.json (i file .md restano l'estrazione originale).

Uso:  python3 scripts/decifra-riquadri.py            (prova: stampa quanto trova)
      python3 scripts/decifra-riquadri.py --scrivi   (aggiorna revisioni.json)
"""
import glob, hashlib, json, logging, os, re, sys
from collections import defaultdict
from pypdf import PdfReader

logging.getLogger('pypdf').setLevel(logging.ERROR)
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
DOC = 'diritto-privato-torrente-dispense-v1'
PDF = os.path.join(ROOT, 'public/originali/diritto-privato-torrente-dispense.pdf')
FONT = 'KRYMHK+NanumGothic'
NOTA = 'Riquadro ricostruito: nel PDF i caratteri sono codificati e sono stati decifrati uno per uno.'

TAB = {0x01: ' ', 0x02: '’', 0x03: '(', 0x04: ')', 0x05: ',', 0x06: '–', 0x07: '.', 0x08: '/', 0x13: ':', 0x14: ';',
       0x29: '[', 0x2a: ']', 0x41: '‘', 0x42: '’', 0x43: '«', 0x44: '»', 0x45: '•', 0x46: 'À', 0x47: 'à', 0x48: 'é',
       0x49: 'è', 0x4a: 'ù'}
TAB.update({0x09 + i: str(i) for i in range(10)})
TAB.update({0x15 + i: c for i, c in enumerate('ABCDEGHILMNOPQRSTUVZ')})
TAB.update({0x2b + i: c for i, c in enumerate('abcdefghilmnopqrstuvxz')})
SENZA_O = re.compile(r'^(?:gni|ltre|ccorr|ggett|bblig|ppure|ccasion|pera[tz]|rdin|sserv|ttenu|nere|norevol|rgan|riginar|ve\b|ra\b|nde\b)')
def decifra(s):
    out = []
    for i, c in enumerate(s):
        if c == ' ':
            # 0x20 è la «O» maiuscola, ma è anche lo spazio che l'estrazione aggiunge tra le parole
            dopo = ''.join(TAB.get(ord(x), x) for x in s[i + 1:i + 9])
            prima = TAB.get(ord(s[i - 1]), '') if i else ''
            out.append('O' if SENZA_O.match(dopo) or (prima.isupper() and dopo[:1].isupper()) else ' ')
        else: out.append(TAB.get(ord(c), c))
    return ''.join(out)
visibile = lambda c: 0x21 <= ord(c) <= 0x4a  # ciò che l'estrazione ha conservato di sicuro
VUOTO = '&nbsp;'  # il testo del blocco è confluito in quello accanto: resta al suo posto, ma non si vede
SEP = '\ue000'  # confine tra due blocchi della stessa pagina


def righe_cifrate():
    """Per pagina: le righe nel font cifrato, nell'ordine del PDF."""
    out = defaultdict(list)
    for n, pagina in enumerate(PdfReader(PDF).pages, 1):
        def visita(testo, cm, tm, font, size, n=n):
            if testo and font and FONT in str(font.get('/BaseFont')): out[n].append(testo)
        pagina.extract_text(visitor_text=visita)
    return out


def main():
    scrivi = '--scrivi' in sys.argv
    righe = righe_cifrate()
    blocchi = defaultdict(list)  # pagina → [(id, testo)]
    for f in sorted(glob.glob(os.path.join(ROOT, 'letture-src', DOC, '*.md'))):
        for m in re.finditer(r'<!-- blocco:(\S+) pagina:(\d+) -->\s*\n([\s\S]*?)(?=\n\s*<!-- blocco:|$)', open(f, encoding='utf8').read()):
            blocchi[int(m.group(2))].append((m.group(1), m.group(3).strip()))
    trovate = perse = 0
    voci, tutti = {}, {}
    for pagina, lista in sorted(righe.items()):
        ids = [b[0] for b in blocchi[pagina]]
        tutti.update(blocchi[pagina])
        T = SEP.join(b[1] for b in blocchi[pagina])
        tratti, cursore = [], 0  # [inizio, fine, testo]
        for riga in lista:
            chiari = [c for c in riga if visibile(c)]
            chiaro = re.sub(r'\s+', ' ', decifra(riga)).strip()
            if not chiaro: continue
            if len(chiari) < 2:  # sole cifre o simboli che l'estrazione ha perso: seguono la riga precedente
                if tratti: tratti[-1][2] += ('' if re.match(r'[,.;:)»]', chiaro) else ' ') + chiaro
                continue
            modello = re.compile(('[\\s#\x00-\x20' + SEP + ']*').join(re.escape(c) for c in chiari))
            m = modello.search(T, cursore) or modello.search(T)
            if not m or any(m.start() < f and m.end() > i for i, f, _ in tratti):
                perse += 1
                if '--verboso' in sys.argv: print(f'  p. {pagina}: non ritrovata «{chiaro[:70]}»')
                continue
            trovate += 1; cursore = m.end()
            tratti.append([m.start(), m.end(), chiaro])
        if not tratti: continue
        tratti.sort(key=lambda x: x[0])
        uniti = []
        for a, b, chiaro in tratti:
            mezzo = T[uniti[-1][1]:a] if uniti else None
            if uniti and not re.search(r'[A-Za-zÀ-ÿ]{3}', mezzo):
                lettere = ''.join(c for c in mezzo if c.isalpha())  # una «ò» o «ì» rimasta leggibile in mezzo
                uniti[-1][1] = b; uniti[-1][2] += lettere + ' ' + chiaro; uniti[-1][3] += mezzo.count(SEP)
            else: uniti.append([a, b, chiaro, 0])
        nuovo, fine = '', 0
        for a, b, chiaro, confini in uniti:
            while a > fine and not T[a - 1].isalpha() and T[a - 1] not in '.)»:;,' + SEP: a -= 1
            while b < len(T) and not T[b].isalpha() and T[b] not in '(«' + SEP: b += 1
            confini += T[a:b].count(SEP) - confini
            nuovo += T[fine:a] + ' ' + chiaro + ' ' + SEP * T[a:b].count(SEP)
            fine = b
        nuovo += T[fine:]
        for bid, vecchio, t in zip(ids, T.split(SEP), nuovo.split(SEP)):
            if t == vecchio: continue
            t = re.sub(r'[\x00-\x08\x0b-\x1f]', ' ', t)
            t = re.sub(r'[\[)]\s*(Approfondimento|Esempio)\s*\]?\s*[:–\s]*', r'**\1.** ', t)
            t = re.sub(r' +([,.;:)»])', r'\1', re.sub(r'([(«]) +', r'\1', re.sub(r'[ \t]+', ' ', t))).strip()
            if '[' not in t: t = re.sub(r'\s*\]', '', t)
            if re.match(r'#{1,6} ', vecchio) and len(t) > 90: t = re.sub(r'^#{1,6} ', '', t)  # non era un titolo
            voci[bid] = {'baseSha256': hashlib.sha256(vecchio.encode()).hexdigest(), 'markdown': t or VUOTO, 'notaRevisione': NOTA}
    # intestazione della prima pagina: i nomi degli autori restano, il fregio in grassetto cifrato no
    if 'p001-b002' in voci: voci['p001-b002']['markdown'] = voci['p001-b002']['markdown'].replace('%', ' ').replace(': e ', ': ')
    voci['p001-b003'] = {'markdown': VUOTO, 'notaRevisione': NOTA}
    print(f'righe cifrate ritrovate: {trovate}; non ritrovate: {perse}; blocchi toccati: {len(voci)}; svuotati: {sum(1 for v in voci.values() if v["markdown"] == VUOTO)}')
    if '--mostra' in sys.argv:
        for bid in sorted(voci)[:int(os.environ.get('N', 12))]: print(f'\n{bid}\n  PRIMA {tutti[bid][:160]!r}\n  DOPO  {voci[bid]["markdown"][:600]}')
    if scrivi:
        p = os.path.join(ROOT, 'letture-src/revisioni.json')
        rev = json.load(open(p, encoding='utf8'))
        rev[DOC] = {**{k: v for k, v in rev.get(DOC, {}).items() if v.get('notaRevisione') != NOTA}, **voci}
        json.dump(rev, open(p, 'w', encoding='utf8'), ensure_ascii=False, indent=2); open(p, 'a').write('\n')
        print(f'scritte {len(voci)} revisioni in letture-src/revisioni.json')


if __name__ == '__main__':
    main()
