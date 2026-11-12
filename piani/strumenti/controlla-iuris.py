#!/usr/bin/env python3
"""Controllo del testo IURIS (Originale scritto da noi) contro le fonti.

Uso: python3 piani/strumenti/controlla-iuris.py <file.txt> [<file.txt> …]  [--json] [--fonte=<testo.txt>] [--extra=<testo.txt>]
Romano: --fonte="Diritto Romano /00 - Appunti e fonti/testo/pennacchio.txt" --extra=(stessa)

Il testo IURIS è diviso «=== pagina N ===»: la pagina N riscrive la pagina N del riassunto Martines
(stessa numerazione), con dentro i temi del percorso A-L (Bin-Pitruzzella) che le appartengono.

Per ogni pagina controlla:
- completezza: ogni articolo, anno, numero di legge o sentenza della pagina Martines compare anche nel testo IURIS;
- originalità: nessuna sequenza di 8 parole uguale alle fonti (Martines e Bin-Pitruzzella), fuori dalle citazioni
  tra «…» (il testo della Costituzione e delle leggi si può citare alla lettera);
- lunghezza: parole IURIS / parole Martines (atteso 0,8–2,0: più alto dove entrano i temi A-L);
- forma: niente diario di lezione («il professore», «la volta scorsa»…), elenchi con «• », titoli «### ».
Esce con codice 1 se una pagina ha errori (sequenze copiate o numeri mancanti).
"""
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MART = ROOT / 'Diritto Costituzionale Martines/00 - Appunti e fonti/testo/martines.txt'
BINP = ROOT / 'Diritto Costituzionale/00 - Appunti e fonti/testo/bin-pitruzzella-258.txt'
N = 8

def pagine(path):
    parts = re.split(r'^=== pagina (\d+) ===\s*$', path.read_text(), flags=re.M)
    return {int(parts[i]): parts[i + 1] for i in range(1, len(parts), 2)}

def parole(t):
    return re.findall(r"[a-zà-ÿ0-9]+", t.lower())

def senza_citazioni(t):
    return re.sub(r'«[^»]{0,1200}»', ' ', t)

def grammi(ws):
    return {' '.join(ws[i:i + N]) for i in range(len(ws) - N + 1)}

def riferimenti(t):
    t = t.replace(' ', ' ')
    refs = set()
    for m in re.finditer(r'\bartt?\.\s*(\d+(?:\s*(?:,|e|-|–)\s*\d+)*)', t, re.I):
        refs.update(re.findall(r'\d+', m.group(1)))
    refs.update(re.findall(r'\b(1[6-9]\d\d|20[0-2]\d)\b', t))
    refs.update(re.findall(r'\b(\d{2,4})\s*(?:a\.\s?C|d\.\s?C)', t))  # date avanti/dopo Cristo (romano)
    refs.update(re.findall(r'\b\d{1,4}/(?:19|20)?\d{2,4}\b', t))
    return refs

def main():
    global MART, BINP
    for a in sys.argv[1:]:
        # --fonte=<testo per pagina della materia> (default: Martines) e --extra=<altra fonte per l'originalità>
        if a.startswith('--fonte='): MART = Path(a.split('=', 1)[1])
        if a.startswith('--extra='): BINP = Path(a.split('=', 1)[1])
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    if not args:
        print(__doc__); sys.exit(2)
    mart = pagine(MART)
    fonti_g = set()
    for p in list(mart.values()) + list(pagine(BINP).values()):
        fonti_g |= grammi(parole(p))
    errori, righe = 0, []
    for f in args:
        for n, testo in sorted(pagine(Path(f)).items()):
            src = mart.get(n, '')
            ws = parole(senza_citazioni(testo))
            g = [' '.join(ws[i:i + N]) for i in range(len(ws) - N + 1)]
            copiati = [x for x in g if x in fonti_g]
            # sequenza copiata più lunga (in parole)
            lungo, cur = 0, 0
            for x in g:
                cur = cur + 1 if x in fonti_g else 0
                lungo = max(lungo, cur + N - 1 if cur else 0)
            mancanti = sorted(riferimenti(src) - riferimenti(testo))
            nw, ns = len(parole(testo)), max(1, len(parole(src)))
            forma = [m.group(0) for m in re.finditer(r'il professore|la professoressa|la volta scorsa|prossima lezione|a lezione|come abbiamo visto a lezione|oggi vediamo', testo, re.I)]
            trattini = len(re.findall(r'^\s*- ', testo, re.M))
            err = []
            if copiati: err.append(f'{len(copiati)} sequenze di {N} parole uguali alle fonti (la più lunga {lungo} parole): «{copiati[0]}»')
            if mancanti: err.append(f'riferimenti della fonte assenti: {", ".join(mancanti[:12])}')
            avv = []
            if not (0.8 <= nw / ns <= 2.2) and src.strip(): avv.append(f'lunghezza {nw}/{ns} parole = {nw/ns:.2f}')
            if forma: avv.append(f'diario di lezione: {", ".join(forma[:3])}')
            if trattini: avv.append(f'{trattini} righe con «- »: usare «• » per gli elenchi')
            if err: errori += 1
            righe.append({'file': f, 'pagina': n, 'parole': nw, 'paroleFonte': ns, 'errori': err, 'avvisi': avv})
    if '--json' in sys.argv:
        print(json.dumps(righe, ensure_ascii=False, indent=1))
    else:
        for r in righe:
            if r['errori'] or r['avvisi']:
                print(f"p. {r['pagina']}: " + ' | '.join(['ERRORE ' + e for e in r['errori']] + r['avvisi']))
        tot = sum(r['parole'] for r in righe); tf = sum(r['paroleFonte'] for r in righe)
        print(f"{len(righe)} pagine, {tot} parole (fonte Martines {tf}); pagine con errori: {errori}")
    sys.exit(1 if errori else 0)

if __name__ == '__main__':
    main()
