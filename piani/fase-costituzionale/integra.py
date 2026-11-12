#!/usr/bin/env python3
"""Integrazione della costituzionale unica: file comuni da A-L (al-precedente) e Martines, migrazione, testo IURIS."""
import json, glob, os, re, shutil
R = '/Users/carlogalli/Desktop/IURIS'
B = f'{R}/Diritto Costituzionale/05 - Contenuti'
AL = f'{R}/Diritto Costituzionale/00 - Appunti e fonti/al-precedente'
M = f'{R}/Diritto Costituzionale Martines/05 - Contenuti'
F = f'{R}/piani/fase-costituzionale'
T = f'{R}/Diritto Costituzionale/00 - Appunti e fonti/testo-iuris'
J = lambda p: json.load(open(p))
def W(p, d): open(p, 'w').write(json.dumps(d, ensure_ascii=False, indent=2) + '\n')

ids = set()
for f in glob.glob(f'{B}/u*.json'):
    for c in J(f).get('concetti', []): ids.add(c['id'])

W(f'{B}/materia.json', {
  "nome": "Diritto costituzionale", "breve": "Costituzionale",
  "manuale": "T. Martines, Diritto costituzionale (Giuffrè) per M-Z e SSG; per A-L un manuale a scelta (Bin-Pitruzzella, Caretti-De Siervo, Zagrebelsky-Marcenò-Pallante)",
  "fonte": {"file": "Testo IURIS", "descrizione": "Testo scritto da IURIS sul programma comune alle tre classi: segue l'ordine del Martines e integra i temi del percorso A-L (Bin-Pitruzzella). Aggiornato alla disciplina in vigore.", "pagine": 267},
  "colore": "#3f7a52"})

for f in glob.glob(f'{B}/oltre*.json'): os.remove(f)
gia = set()
for f in sorted(glob.glob(f'{M}/oltre*.json')):
    shutil.copy(f, B); o = J(f)
    gia |= {v['id'] for v in o['voci'] if v.get('oltre')} | {c['id'] for c in o.get('nuovi', [])}
tolte = 0
for f in sorted(glob.glob(f'{AL}/oltre*.json')):
    o = J(f); voci = []
    nuovi = [n for n in o.get('nuovi', []) if n['id'] not in ids and n['id'] not in gia]
    noti = ids | {n['id'] for n in nuovi}
    for v in o['voci']:
        v.pop('rettifica', None); v.pop('togli', None)
        if v['id'] in gia or v['id'] not in noti: tolte += 1; continue
        v['collegamenti'] = [c for c in v.get('collegamenti', []) if c['da'] in noti and c['a'] in noti]
        gia.add(v['id']); voci.append(v)
    if voci or nuovi:
        o['voci'] = voci
        if nuovi: o['nuovi'] = nuovi
        else: o.pop('nuovi', None)
        W(f"{B}/oltre-a{os.path.basename(f)[6:]}", o)
print('oltre A-L tolte (doppie o senza voce):', tolte)

for n in ('glossario.json', 'quadro.json', 'norme.json'): shutil.copy(f'{M}/{n}', B)

sch = {}
for x in J(f'{M}/schede-inverse.json') + J(f'{AL}/schede-inverse.json'):
    if x['concetto'] in ids and x['concetto'] not in sch: sch[x['concetto']] = x
W(f'{B}/schede-inverse.json', list(sch.values()))
print('schede inverse', len(sch))

lez, dom = {}, {}
for f in sorted(glob.glob(f'{F}/mappa-g*.json')):
    m = J(f); lez.update(m.get('lezioni', {})); dom.update(m.get('domande', {}))
W(f'{B}/migrazione.json', {"versione": 2, "da": [
    {"materia": "diritto-costituzionale", "finoAVersione": 1, "lezioni": lez, "domande": dom},
    {"materia": "diritto-costituzionale-martines", "lezioni": "uguali", "domande": "uguali"}]})
al_lez = {l['id'] for f in glob.glob(f'{AL}/u*.json') for l in J(f)['lezioni']}
al_dom = {q['id'] for f in glob.glob(f'{AL}/u*.json') for q in J(f)['domande']}
nuove_lez = {l['id'] for f in glob.glob(f'{B}/u*.json') for l in J(f)['lezioni']}
nuove_dom = {q['id'] for f in glob.glob(f'{B}/u*.json') for q in J(f)['domande']}
print('mappa: lezioni', len(lez), '/', len(al_lez), ' domande', len(dom), '/', len(al_dom))
print('  lezioni A-L senza mappa:', sorted(al_lez - set(lez)))
print('  domande A-L senza mappa:', sorted(al_dom - set(dom))[:30])
print('  destinazioni inesistenti: lezioni', sorted(set(lez.values()) - nuove_lez), 'domande', sorted(set(dom.values()) - nuove_dom)[:20])
RIN = {'messaggio-presidenziale': 'messaggi-presidenziali'}
e = J(f'{AL}/esame.json')
for t in e['tracce']:
    t['lezioni'] = sorted({lez.get(x, x) for x in t['lezioni']})
    t['concetti'] = list(dict.fromkeys(RIN.get(c, c) for c in t['concetti'] if RIN.get(c, c) in ids))
W(f'{B}/esame.json', e)
print('esame: tracce', len(e['tracce']))

# testo IURIS unico
pag = {}
for f in sorted(glob.glob(f'{T}/g*.txt')):
    parts = re.split(r'^=== pagina (\d+) ===\s*$', open(f).read(), flags=re.M)
    for i in range(1, len(parts), 2):
        n = int(parts[i]); assert n not in pag, f'pagina {n} doppia ({f})'; pag[n] = parts[i + 1].strip()
pag[1] = '## Diritto costituzionale\n\nTesto IURIS per le classi LMG A-L, LMG M-Z e SSG dell\'Università di Bari.'
mancano = [n for n in range(1, 268) if n not in pag]
print('testo IURIS: pagine', len(pag), 'mancanti', mancano)
out = f'{R}/studio/letture-src/testi/costituzionale-iuris.txt'
open(out, 'w').write(''.join(f'=== pagina {n} ===\n{pag.get(n, "")}\n\n' for n in range(1, 268)))
print('scritto', out)
