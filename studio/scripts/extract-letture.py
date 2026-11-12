#!/usr/bin/env python3
"""Estrae i PDF una volta, in Markdown modificabile con ID di blocco stabili.

Non rilanciare sugli estratti attuali: le sezioni sono ora per lezione (scripts/sezioni-letture.mjs)
e revisioni.json dipende dal testo esatto dei blocchi.

Non genera né riassume testo. La pubblicazione ordinaria usa sync-letture.mjs,
senza richiedere Python o pypdf. Le revisioni sono separate dagli estratti.
"""
from __future__ import annotations
import argparse
from collections import Counter
import hashlib
import json
import logging
from pathlib import Path
import re
import unicodedata
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'letture-src'
logging.getLogger('pypdf').setLevel(logging.ERROR)


def compact(text: str) -> str:
    text = unicodedata.normalize('NFC', text).replace('\u00a0', ' ').replace('\u200b', '')
    return re.sub(r'\s+', ' ', text).strip()


def tokens(text: str) -> list[str]:
    return re.findall(r'\w+', text, flags=re.UNICODE)


def page_edges(text: str) -> list[str]:
    lines = [compact(line) for line in text.splitlines() if line.strip()]
    return list(dict.fromkeys(lines[:2] + lines[-3:]))


TITOLO_RIGA = re.compile(r'^\s*(?:\d{1,2}\s?[-.–]\s*(?:[a-z]\)\s*\w|[A-ZÀÈÉÌÒÙ“"«])|(?:Parte|PARTE|Capitolo|CAPITOLO)\b|(?:Sezione|SEZIONE)\s+[IVX]+\b)')


def strip_boilerplate(text: str, repeated: set[str]) -> tuple[str, list[str]]:
    lines = text.splitlines()
    nonempty = [i for i, line in enumerate(lines) if line.strip()]
    edges = set(nonempty[:2] + nonempty[-3:])
    removed, kept = [], []
    for i, line in enumerate(lines):
        value = compact(line)
        if i in edges and (value in repeated or re.fullmatch(r'\d{1,3}', value)):
            removed.append(value)
        else:
            kept.append(line)
    return '\n'.join(kept).strip(), removed


def format_paragraph(lines: list[str], first: bool) -> str:
    """Ricongiunge righe tipografiche, conservando elenchi e parole originali."""
    nonempty = [line for line in lines if line.strip()]
    if not nonempty:
        return ''
    items, current = [], ''
    has_list = False
    for line in nonempty:
        s = compact(line)
        marker = re.match(r'^(?:[●•▪◦]|(?:\d{1,2})[.)])\s+', s)
        if marker:
            has_list = True
            if current:
                items.append(current)
            current = re.sub(r'^[●•▪◦]\s+', '- ', s)
        else:
            current = f'{current} {s}'.strip()
    if current:
        items.append(current)
    result = '\n'.join(items) if has_list else ' '.join(items)
    # Titoli riconoscibili per forma; le altre righe rimangono testo integrale.
    one_line = len(nonempty) == 1
    short = len(result) <= 115 and len(result.split()) <= 17
    centred = len(nonempty[0]) - len(nonempty[0].lstrip()) >= 14
    heading = short and one_line and not re.search(r'[.;:,!?]$', result) and (
        (first and centred) or result.isupper() or bool(re.match(r'^(?:CAPITOLO|Capitolo|PARTE|Parte|SEZIONE|Sezione)\b', result)))
    return f'## {result}' if heading else result


def markdown_blocks(text: str) -> list[str]:
    """Testo già scritto in Markdown (opzione `testoMarkdown`, es. il testo IURIS di costituzionale).

    Un blocco per capoverso (righe vuote); titoli `#`, tabelle `|` e capoversi restano come sono, «• » diventa «- ».
    Una voce d'elenco seguita senza riga vuota da una riga normale: quella riga apre un blocco nuovo
    (altrimenti finirebbe dentro l'ultima voce). Nessuna riga viene tolta come intestazione o piè di pagina.
    """
    blocks = []
    for paragraph in re.split(r'\n\s*\n', text.strip()):
        lines = [line.rstrip() for line in paragraph.splitlines() if line.strip()]
        current: list[str] = []
        for line in lines:
            bullet = re.match(r'^[•●▪◦-]\s+', line)
            if current and not bullet and not line.startswith('|') and re.match(r'^- ', current[-1]):
                blocks.append('\n'.join(current))
                current = []
            current.append(re.sub(r'^[•●▪◦]\s+', '- ', line) if bullet else line)
        if current:
            blocks.append('\n'.join(current))
    return blocks


def ocr_layouts(path: Path, pagine: int) -> list[str]:
    """Legge il testo OCR diviso per pagina; le righe vuote separano i paragrafi."""
    parts = re.split(r'^=== pagina (\d+) ===\n', path.read_text(), flags=re.M)
    pages = {int(parts[i]): parts[i + 1] for i in range(1, len(parts), 2)}
    if sorted(pages) != list(range(1, pagine + 1)):
        raise ValueError(f'{path.name}: pagine OCR incomplete')
    return [pages[n].strip('\n') for n in range(1, pagine + 1)]


def sections(doc: dict) -> list[dict]:
    result = []
    start = 1
    if doc['id'] == 'filosofia-incampo-v1':
        result.extend([
            {'id': 'u01-l1', 'titolo': 'La filosofia del diritto come scienza del dovere giuridico', 'da': 1, 'a': 3, 'lezione': 'u01-l1', 'pilota': True},
            {'id': 'u01-l2', 'titolo': "L'ordinamento e la forza del dovere: norme necessarie e solo possibili", 'da': 4, 'a': 6, 'lezione': 'u01-l2', 'pilota': True},
        ])
        start = 7
    for da in range(start, doc['pagine'] + 1, 4):
        a = min(da + 3, doc['pagine'])
        result.append({'id': f'p{da:03d}-{a:03d}', 'titolo': f'Pagine {da}–{a}' if a > da else f'Pagina {da}', 'da': da, 'a': a})
    for sec in result:
        sec['file'] = f"letture/{doc['id']}/{sec['id']}.json"
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--replace-base', action='store_true', help='Rigenera anche estratti Markdown esistenti; non modifica revisioni.json.')
    parser.add_argument('--solo', action='append', default=[], metavar='ID',
                        help='Estrae solo questi documenti (ripetibile); gli altri restano come sono nel catalogo e nella verifica.')
    args = parser.parse_args()
    catalog = json.loads((ROOT / 'src/lib/originali-catalogo.json').read_text())
    # I fascicoli riusati dal Percorso non sono PDF da estrarre e restano nel catalogo sorgente.
    previous_catalog = json.loads((SRC / 'catalogo.json').read_text()) if (SRC / 'catalogo.json').exists() else []
    SRC.mkdir(parents=True, exist_ok=True)
    output_catalog, report = [], {'versione': 1, 'documenti': []}
    if args.solo:
        ignoti = set(args.solo) - {doc['id'] for doc in catalog}
        if ignoti:
            raise ValueError(f"Documenti non in catalogo: {', '.join(sorted(ignoti))}")
        previous_report = json.loads((SRC / 'estrazione-verifica.json').read_text()) if (SRC / 'estrazione-verifica.json').exists() else report
        output_catalog = [doc for doc in previous_catalog if doc['id'] not in args.solo and doc.get('tipoFonte') != 'manuale-ricostruito']
        report['documenti'] = [doc for doc in previous_report['documenti'] if doc['id'] not in args.solo]
    for doc in catalog:
        if doc.get('tipoFonte') == 'manuale-ricostruito':
            continue
        if args.solo and doc['id'] not in args.solo:
            continue
        if doc.get('testoFonte'):
            # Documento solo testo (es. riassunti StuDocu con nome ed email di chi ha scaricato in ogni pagina):
            # nessun PDF pubblicato; la fonte è il testo già ripulito in letture-src, diviso «=== pagina N ===»
            # come quello dell'OCR (righe vuote = capoversi). sha256 è l'impronta di quel testo.
            path = SRC / doc['testoFonte']
            digest = hashlib.sha256(path.read_bytes()).hexdigest()
            if digest != doc['sha256']:
                raise ValueError(f"Il testo {doc['id']} è cambiato: aggiornare il catalogo e l'edizione prima dell'estrazione")
            layouts = ocr_layouts(path, doc['pagine'])
        else:
            path = ROOT / 'public' / doc['file']
            digest = hashlib.sha256(path.read_bytes()).hexdigest()
            if digest != doc['sha256']:
                raise ValueError(f"La fonte {doc['id']} è cambiata: aggiornare il catalogo e l'edizione prima dell'estrazione")
            reader = PdfReader(path)
            if len(reader.pages) != doc['pagine']:
                raise ValueError(f"Numero pagine inatteso: {doc['id']}")
            if doc.get('testoOcr'):
                # PDF con font cifrati (es. StuDocu): il testo viene dall'OCR, una pagina per blocco «=== pagina N ===».
                layouts = ocr_layouts(SRC / doc['testoOcr'], doc['pagine'])
            else:
                # Le pagine bianche (senza flusso di contenuto) valgono come pagine senza testo.
                layouts = [(page.extract_text(extraction_mode='layout') or '') if '/Contents' in page else '' for page in reader.pages]
        # Pagine da non mostrare nel lettore (es. indici: le sezioni fanno già da indice). Restano nel PDF.
        for n in doc.get('pagineOmesse', []):
            layouts[n - 1] = ''
        edge_counts = Counter(value for text in layouts for value in page_edges(text))
        repeated = {value for value, n in edge_counts.items() if n >= max(5, int(len(layouts) * .12)) and 5 < len(value) < 220}
        # Nei testi di Incampo e Moro il piè di pagina comprende il riferimento alla fonte.
        # Il riferimento completo resta nel catalogo; non serve ripeterlo ad ogni pagina.
        pages, page_report = {}, []
        for number, layout in enumerate(layouts, 1):
            if doc.get('testoMarkdown'):
                cleaned, removed = layout.strip(), []
                blocks = [{'id': f'p{number:03d}-b{i:03d}', 'pagina': number, 'markdown': md}
                          for i, md in enumerate(markdown_blocks(cleaned), 1)]
                source_tokens = tokens(cleaned)
                if source_tokens != tokens('\n'.join(b['markdown'] for b in blocks)):
                    raise ValueError(f"Contenuto perso o spostato in {doc['id']} pagina {number}")
                pages[number] = blocks
                page_report.append({'pagina': number, 'blocchi': len(blocks), 'parole': len(source_tokens), 'caratteri': len(compact(cleaned)), 'rimossi': [], 'coperturaToken': True})
                continue
            cleaned, removed = strip_boilerplate(layout, repeated)
            if doc.get('dividiTitoli'):
                # Testo giustificato senza righe vuote (es. riassunto di Martines): un capoverso nuovo
                # comincia a ogni titolo di paragrafo numerato («12. …», «3- …») o di parte, capitolo, sezione.
                cleaned = '\n'.join(('\n' + line) if TITOLO_RIGA.match(line) else line for line in cleaned.splitlines()).strip()
            paragraphs = re.split(r'\n\s*\n', cleaned)
            blocks = []
            for paragraph in paragraphs:
                md = format_paragraph(paragraph.splitlines(), first=(not blocks))
                if md:
                    blocks.append({'id': f'p{number:03d}-b{len(blocks)+1:03d}', 'pagina': number, 'markdown': md})
            source_tokens = tokens(cleaned)
            result_tokens = tokens('\n'.join(b['markdown'] for b in blocks))
            if source_tokens != result_tokens:
                raise ValueError(f"Contenuto perso o spostato in {doc['id']} pagina {number}")
            if not blocks and compact(cleaned):
                raise ValueError(f"Pagina interamente rimossa: {doc['id']} pagina {number}")
            pages[number] = blocks
            page_report.append({'pagina': number, 'blocchi': len(blocks), 'parole': len(source_tokens), 'caratteri': len(compact(cleaned)), 'rimossi': removed, 'coperturaToken': True})
        secs = sections(doc)
        target = SRC / doc['id']
        target.mkdir(exist_ok=True)
        for sec in secs:
            source = target / f"{sec['id']}.md"
            if source.exists() and not args.replace_base:
                raise FileExistsError(f'{source} già presente: la rigenerazione richiede --replace-base; le revisioni restano separate')
            pieces = [f"<!-- documento:{doc['id']} edizione:1 sezione:{sec['id']} -->"]
            for page in range(sec['da'], sec['a'] + 1):
                for block in pages[page]:
                    pieces.extend([f"<!-- blocco:{block['id']} pagina:{page} -->", block['markdown']])
            source.write_text('\n\n'.join(pieces) + '\n')
        output_catalog.append({'id': doc['id'], 'edizione': 1, 'materia': doc['materia'], 'titolo': doc['titolo'],
                               'descrizione': doc['descrizione'], 'fonteSha256': digest, 'pagine': doc['pagine'], 'sezioni': secs})
        report['documenti'].append({'id': doc['id'], 'pagine': len(layouts), 'blocchi': sum(len(b) for b in pages.values()),
                                   'parole': sum(p['parole'] for p in page_report), 'pagineSenzaTesto': [p['pagina'] for p in page_report if not p['parole']],
                                   'coperturaToken': all(p['coperturaToken'] for p in page_report), 'pagineDettaglio': page_report})
        print(f"[letture] {doc['id']}: {len(layouts)} pagine, {sum(len(b) for b in pages.values())} blocchi; testo conservato")
    output_catalog.extend(doc for doc in previous_catalog if doc.get('tipoFonte') == 'manuale-ricostruito')
    (SRC / 'catalogo.json').write_text(json.dumps(output_catalog, ensure_ascii=False, indent=2) + '\n')
    (SRC / 'estrazione-verifica.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')


if __name__ == '__main__':
    main()
