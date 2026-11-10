#!/usr/bin/env python3
"""Costruisce un'unità `uNN.json` da un file di testo compatto, più veloce da scrivere e da rivedere del JSON.

Uso:  python3 piani/strumenti/unita.py "<Materia>/05 - Contenuti/sorgenti/u01.txt"
      (scrive "<Materia>/05 - Contenuti/u01.json"; poi va validata con studio/scripts/validate-content.mjs)

Formato del sorgente (ogni sezione comincia con una riga @…; il carattere | separa i campi e non va usato nel testo):

@unita u01|1|Titolo dell'unità|Capitoli 1–2|1-8
@abstract Una o due frasi.
@note Avviso «Da sapere» per chi studia (oppure -)
@redazione Nota per chi lavora sui contenuti (più righe @redazione = più note)
@lezione u01-l1|Titolo|1-3|25|concetto-a,concetto-b
Sintesi in markdown, su più righe, fino alla sezione successiva.
@punti
- punto chiave
@memoria
voce :: dettaglio
@concetto id|Nome|tipo|alias1;alias2|1-3|Definizione breve (max ~140 caratteri)
Definizione estesa, anche su più righe.
@relazione da|a|tipo|etichetta
@evento ev-id|1942|16 marzo 1942|Titolo|tipo|concetto-a,concetto-b|Descrizione
@mappa
Radice [concetto]
  Ramo [concetto] {nota}
    Foglia
@domande
F|lezione|livello|concetti|domanda|risposta
M|lezione|livello|concetti|domanda|opz1|opz2|opz3|opz4|indice corretta (0-3)|spiegazione
V|lezione|livello|concetti|affermazione|V oppure F|spiegazione
C|lezione|livello|concetti|testo con {{buchi}}|spiegazione
A|lezione|livello|concetti|domanda|traccia (\\n per andare a capo)|punto=chiave,chiave;punto=chiave
O|lezione|livello|concetti|consegna|el1;el2;el3;el4|spiegazione
B|lezione|livello|concetti|consegna|sinistra=destra;sinistra=destra
"""
import json, re, sys
from pathlib import Path

def intervallo(s):
    a, _, b = s.strip().partition('-')
    return [int(a), int(b or a)]

def lista(s, sep=','):
    return [x.strip() for x in s.split(sep) if x.strip()]

def punti(t):
    out, acc = [], ''
    for parte in t.split(';'):
        acc = f'{acc};{parte}' if acc else parte
        if '=' in acc:
            testo, _, chiavi = acc.rpartition('=')
            out.append({'testo': testo.strip(), 'chiavi': [k.strip().lower() for k in chiavi.split(',') if k.strip()]})
            acc = ''
    return out

def mappa(righe):
    radice, pila = None, []
    for r in righe:
        if not r.strip(): continue
        livello = (len(r) - len(r.lstrip(' '))) // 2
        t = r.strip()
        nodo = {}
        m = re.search(r'\{([^}]*)\}', t)
        if m: nodo['nota'] = m.group(1).strip(); t = t.replace(m.group(0), '')
        m = re.search(r'\[([^\]]*)\]', t)
        if m: nodo['concetto'] = m.group(1).strip(); t = t.replace(m.group(0), '')
        nodo = {'testo': t.strip(), **nodo}
        if livello == 0: radice = nodo
        else: pila[livello - 1].setdefault('figli', []).append(nodo)
        pila[livello:] = [nodo]
    return radice

def costruisci(src):
    u = {'note': None, 'noteRedazione': [], 'lezioni': [], 'concetti': [], 'relazioni': [], 'eventi': [], 'domande': []}
    sezione, corpo, corrente = None, [], None
    lezioni = {}

    def chiudi():
        nonlocal corpo
        testo = '\n'.join(corpo).strip()
        if sezione == 'lezione': corrente['sintesi'] = testo
        elif sezione == 'punti': corrente['puntiChiave'] = [x[1:].strip() for x in corpo if x.strip().startswith('-')]
        elif sezione == 'memoria':
            corrente['memoria'] = [{'voce': a.strip(), 'dettaglio': b.strip()} for a, _, b in (x.partition('::') for x in corpo if '::' in x)]
        elif sezione == 'concetto': u['concetti'][-1]['definizione'] = testo
        elif sezione == 'mappa': u['mappa'] = mappa(corpo)
        elif sezione == 'domande':
            for riga in corpo:
                if riga.strip(): domanda(riga)
        corpo = []

    def domanda(riga):
        p = riga.split('|')
        t, les, liv, con, resto = p[0], p[1], p[2], p[3], p[4:]
        lz = lezioni[les]
        q = {'id': f"{u['id']}-q{len(u['domande']) + 1:03d}", 'lezione': les, 'livello': liv, 'pagine': lz['pagine']}
        if lista(con): q['concetti'] = lista(con)
        if t == 'F': assert len(resto) == 2, riga[:70]; q.update(tipo='flashcard', domanda=resto[0], risposta=resto[1])
        elif t == 'M': assert len(resto) == 7, riga[:70]; q.update(tipo='multipla', domanda=resto[0], opzioni=resto[1:5], corretta=int(resto[5]), spiegazione=resto[6])
        elif t == 'V': assert len(resto) == 3 and resto[1] in 'VF', riga[:70]; q.update(tipo='verofalso', affermazione=resto[0], vero=resto[1] == 'V', spiegazione=resto[2])
        elif t == 'C': assert len(resto) == 2, riga[:70]; q.update(tipo='completa', testo=resto[0], spiegazione=resto[1])
        elif t == 'A': assert len(resto) == 3, riga[:70]; q.update(tipo='aperta', domanda=resto[0], traccia=resto[1].replace('\\n', '\n'), punti=punti(resto[2]))
        elif t == 'O': assert len(resto) == 3, riga[:70]; q.update(tipo='ordina', consegna=resto[0], elementi=lista(resto[1], ';'), spiegazione=resto[2])
        elif t == 'B': assert len(resto) == 2, riga[:70]; q.update(tipo='abbina', consegna=resto[0], coppie=[[a.strip(), b.strip()] for a, _, b in (x.partition('=') for x in resto[1].split(';'))])
        else: raise ValueError(f'tipo di domanda sconosciuto: {riga[:60]}')
        u['domande'].append(q)

    for riga in Path(src).read_text(encoding='utf8').split('\n'):
        m = re.match(r'^@(\w+)\s?(.*)$', riga)
        if not m:
            corpo.append(riga); continue
        chiudi()
        sezione, arg = m.group(1), m.group(2)
        if sezione == 'unita':
            i, ordine, titolo, capitolo, pag = arg.split('|')
            u = {'id': i, 'ordine': int(ordine), 'titolo': titolo, 'capitolo': capitolo, 'pagine': intervallo(pag), 'abstract': '', **u}
        elif sezione == 'abstract': u['abstract'] = arg.strip()
        elif sezione == 'note': u['note'] = None if arg.strip() in ('', '-') else arg.strip()
        elif sezione == 'redazione': u['noteRedazione'].append(arg.strip())
        elif sezione == 'lezione':
            i, titolo, pag, minuti, con = arg.split('|')
            corrente = {'id': i, 'titolo': titolo, 'pagine': intervallo(pag), 'minuti': int(minuti), 'sintesi': '', 'puntiChiave': [], 'memoria': [], 'concetti': lista(con)}
            u['lezioni'].append(corrente); lezioni[i] = corrente
        elif sezione == 'concetto':
            i, nome, tipo, alias, pag, breve = arg.split('|')
            u['concetti'].append({'id': i, 'nome': nome, 'tipo': tipo, 'alias': lista(alias, ';'), 'breve': breve.strip(), 'definizione': '', 'pagine': intervallo(pag)})
        elif sezione == 'relazione':
            da, a, tipo, *et = arg.split('|')
            r = {'da': da.strip(), 'a': a.strip(), 'tipo': tipo.strip()}
            if et and et[0].strip(): r['etichetta'] = et[0].strip()
            u['relazioni'].append(r)
        elif sezione == 'evento':
            i, anno, data, titolo, tipo, con, desc = arg.split('|')
            e = {'id': i, 'anno': int(anno), 'data': data, 'titolo': titolo, 'descrizione': desc.strip(), 'tipo': tipo, 'pagine': u['pagine']}
            if lista(con): e['concetti'] = lista(con)
            u['eventi'].append(e)
        elif sezione not in ('punti', 'memoria', 'mappa', 'domande'):
            raise ValueError(f'sezione sconosciuta: @{sezione}')
    chiudi()
    return u

if __name__ == '__main__':
    for src in sys.argv[1:]:
        u = costruisci(src)
        dest = Path(src).parent.parent / f"{u['id']}.json"
        dest.write_text(json.dumps(u, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
        tipi = {}
        for q in u['domande']: tipi[q['tipo']] = tipi.get(q['tipo'], 0) + 1
        print(f"{dest.name}: {len(u['lezioni'])} lezioni, {len(u['concetti'])} voci, {len(u['domande'])} domande {tipi}")
