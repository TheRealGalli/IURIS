#!/usr/bin/env python3
"""Converte l'OCR di un PDF (JSONL di piani/strumenti/ocr.m) in testo per pagina per extract-letture.

L'OCR restituisce righe tipografiche senza capoversi: qui i paragrafi si ricostruiscono dalla forma
delle righe (riga corta che chiude con un segno di punteggiatura, titoli, voci di elenco, «D:» e «R:»).
Uso: python3 scripts/testo-ocr.py <ocr.jsonl> <uscita.txt>
"""
from __future__ import annotations
import json
import re
import sys

FINE = re.compile(r'[.:;!?»"”)]$')
ELENCO = re.compile(r'^(?:[●•▪◦]|[a-z]\)|\d{1,2}[.)])\s')
TITOLO_NUM = re.compile(r'^\d+(?:\.\d+)*\.?\s+\S')


def titolo(riga: str) -> bool:
    s = riga.strip()
    if not s or len(s) > 110 or FINE.search(s):
        return False
    lettere = [c for c in s if c.isalpha()]
    maiuscolo = bool(lettere) and sum(c.isupper() for c in lettere) / len(lettere) > .8
    return maiuscolo or bool(TITOLO_NUM.match(s)) or s.lower().startswith(('capitolo', 'titolo', 'sezione'))


def pagina(righe: list[str]) -> str:
    righe = [r.rstrip() for r in righe if r.strip()]
    if not righe:
        return ''
    if (len(righe) >= 15 and sum(titolo(r) or len(r.strip()) < 25 for r in righe) / len(righe) > .6
            and sum(bool(FINE.search(r.strip())) for r in righe) / len(righe) < .15):
        # Pagine d'indice: righe brevi una sotto l'altra, da leggere come elenco e non come titoli.
        return '\n'.join(f'• {r.strip()}' for r in righe)
    lunghe = sorted(len(r) for r in righe)
    tipica = lunghe[int(len(lunghe) * .8)] if len(lunghe) >= 5 else max(lunghe)
    out: list[str] = []
    for i, r in enumerate(righe):
        s = r.strip()
        prima = out[-1] if out else ''
        nuovo = False
        if titolo(s) or s.startswith(('D:', 'R:', 'Art.', 'ART.')):
            nuovo = True
        elif prima and titolo(prima):
            nuovo = True
        elif prima and FINE.search(prima) and len(prima) < tipica * .85:
            nuovo = True
        elif ELENCO.match(s) and prima and not ELENCO.match(prima) and FINE.search(prima):
            nuovo = True
        if nuovo and out and out[-1] != '':
            out.append('')
        out.append(s)
    return '\n'.join(out)


def main() -> None:
    src, dst = sys.argv[1], sys.argv[2]
    pagine = {}
    for line in open(src, encoding='utf-8'):
        if line.strip():
            d = json.loads(line)
            pagine[d['pagina']] = d['testo'].split('\n')
    with open(dst, 'w', encoding='utf-8') as f:
        for n in range(1, max(pagine) + 1):
            f.write(f'=== pagina {n} ===\n{pagina(pagine.get(n, []))}\n\n')
    print(f'{dst}: {max(pagine)} pagine')


if __name__ == '__main__':
    main()
