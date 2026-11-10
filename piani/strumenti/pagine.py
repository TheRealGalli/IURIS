#!/usr/bin/env python3
"""Stampa un intervallo di pagine del testo estratto, riunendo le righe spezzate: python3 piani/strumenti/pagine.py <file testo> 9 15"""
import re, sys
s = open(sys.argv[1], encoding='utf8').read()
a, b = int(sys.argv[2]), int(sys.argv[3])
i = s.index(f'=== pagina {a} ===')
j = s.find(f'=== pagina {b + 1} ===')
t = s[i:j if j > 0 else len(s)]
t = re.sub(r'[ \t]+\n', '\n', t)
t = re.sub(r'\n(?=[a-zàèéìòù(“"])', ' ', t)
# righe illeggibili (caratteri codificati dei riquadri): si segnalano e basta
t = re.sub(r'(?:^[^\n]*[<>@=+/]{3,}[^\n]*\n)+', '[riquadro illeggibile]\n', t, flags=re.M)
print(re.sub(r'[ \t]{2,}', ' ', t))
