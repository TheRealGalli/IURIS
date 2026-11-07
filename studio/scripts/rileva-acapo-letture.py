# Rileva gli a capo persi confrontando i blocchi con le righe del PDF (inizio riga, font).
# Uso: python3 scripts/rileva-acapo-letture.py <documento> <pdf> ; python3 scripts/genera-acapo-letture.py <documento> ; node scripts/revisiona-letture.mjs applica $TMPDIR/voci-<documento>.json
import json,glob,re,sys,unicodedata,logging
from collections import defaultdict
from pypdf import PdfReader
logging.getLogger('pypdf').setLevel(logging.ERROR)
import os, tempfile
ROOT=os.path.join(os.path.dirname(os.path.abspath(__file__)), '..') + '/'
DOC, PDF = sys.argv[1], sys.argv[2]
def norm(t): return re.sub(r'\s+',' ',unicodedata.normalize('NFC',t).replace('\u00a0',' ').replace('ﬁ','fi').replace('ﬂ','fl')).strip()
rev=json.load(open(ROOT+'letture-src/revisioni.json'))
blocchi={}
for f in sorted(glob.glob(ROOT+f'letture-src/{DOC}/*.md')):
    for m in re.finditer(r'<!-- blocco:(\S+) pagina:(\d+) -->\s*\n([\s\S]*?)(?=\n\s*<!-- blocco:|$)',open(f).read()):
        t=m.group(3).strip(); r=rev.get(DOC,{}).get(m.group(1),{})
        if 'markdown' in r: continue
        for s in r.get('sostituzioni',[]): t=t.replace(s['da'],s['a'])
        blocchi[m.group(1)]=dict(id=m.group(1),pagina=int(m.group(2)),testo=t,sez=f.split('/')[-1][:-3])
perPagina=defaultdict(list)
for b in blocchi.values(): perPagina[b['pagina']].append(b)
reader=PdfReader(ROOT+PDF)
cand=[]
for pg in sorted(perPagina):
    page=reader.pages[pg-1]
    runs=[]
    def v(text,cm,tm,fd,fs):
        if text and text.strip(): runs.append((text,(fd or {}).get('/BaseFont') or ''))
    testo=page.extract_text(visitor_text=v)
    righe=[norm(l) for l in testo.split('\n') if l.strip()]
    # attribuisce a ogni riga il primo run che la comincia
    k=0; info=[]
    for L in righe:
        primo=None
        for j in range(k,min(k+12,len(runs))):
            rt=norm(runs[j][0])
            if rt and (L.startswith(rt[:20]) or rt.startswith(L[:20])):
                primo=j; break
        if primo is None: info.append((L,'',''));continue
        k=primo+1
        rt=norm(runs[primo][0]); font=runs[primo][1]
        info.append((L,font,rt))
    prec=''
    for i,(L,font,rt) in enumerate(info):
        bold='Bold' in font; italic='Italic' in font and not bold
        kind=None
        if re.match(r'^(?:-|•|–)\s*[A-Za-zÀ-ÿ(“"«0-9]',L) and not re.match(r'^-\s*\d',L): kind='trattino'
        elif re.match(r'^(?:>|—>|->|→)\s*\S',L): kind='freccia'
        elif bold and rt.endswith(':') and len(rt)<=70 and len(L)>len(rt)+2: kind='etichetta'
        elif bold and rt==L and len(L)<=100 and not re.search(r'[.;,]$',L) and i+1<len(info): kind='titolo'
        elif re.match(r'^\d{1,2}\s*[-.)]\s+\S',L): kind='numero'
        elif re.search(r'[.:!?]$',prec) and (italic or bold): kind='paragrafo-stile'
        elif re.match(r'^[\p{Lu}]'.replace('\\p{Lu}','A-ZÀ-Ý'),L) and re.search(r'[.!?]$',prec) and len(prec)<70: kind='paragrafo-breve'
        prec=L
        if not kind: continue
        marc=re.match(r'^(?:-|•|–|>|—>|->|→)\s*',L) if kind in ('trattino','freccia') else None
        corpo=L[marc.end():] if marc else L
        sonda=corpo[:40]
        trovati=[]
        for b in perPagina[pg]:
            t=b['testo']; s=0
            while True:
                x=t.find(sonda,s)
                if x<0: break
                trovati.append((b,x)); s=x+1
        if len(trovati)!=1:
            if len(trovati)>1:
                succ=info[i+1][0][:15] if i+1<len(info) else ''
                pre=info[i-1][0][-12:] if i>0 else ''
                f=[(b,x) for (b,x) in trovati if b['testo'].find(corpo,x)==x and (not succ or re.sub(r'[\s*#]','',b['testo'][x+len(corpo):x+len(corpo)+40]).startswith(re.sub(r'\s','',succ)[:10]))]
                if len(f)>1 and pre: f=[(b,x) for (b,x) in f if re.sub(r'[\s*#]','',b['testo'][max(0,x-40):x]).endswith(re.sub(r'\s','',pre)[-8:])]
                trovati=f
            if len(trovati)!=1: cand.append(dict(doc=DOC,pagina=pg,tipo=kind,riga=L[:80],stato='non-trovato' if not trovati else 'ambiguo'));continue
        b,x=trovati[0]
        if marc:
            y=x
            while y>0 and b['testo'][y-1]==' ': y-=1
            m2=re.search(r'(?:-|•|–|>|—>|->|→)$',b['testo'][:y])
            if not m2: cand.append(dict(doc=DOC,pagina=pg,tipo=kind,riga=L[:80],stato='marcatore-assente',blocco_=b['id']));continue
            x=m2.start()
        t=b['testo']; inizio=t[:x].rstrip(' *#')
        if (inizio=='' or inizio.endswith('\n')) and kind!='titolo': continue  # già a capo
        if kind=='titolo' and inizio.endswith('\n'): continue
        riga_src=t[t.rfind('\n',0,x)+1:x]
        nella_voce=bool(re.match(r'^(?:- |\d{1,2}\. |• |‣ )',riga_src))
        cand.append(dict(doc=DOC,pagina=pg,blocco=b['id'],sez=b['sez'],pos=x,tipo=kind,riga=L[:80],etichetta=rt if kind=='etichetta' else None,
                         prima=b['testo'][max(0,x-30):x],voce=nella_voce,riga_intera=L))
json.dump(cand,open(f'{tempfile.gettempdir()}/candidati-{DOC}.json','w'),ensure_ascii=False,indent=0)
from collections import Counter
print(DOC, Counter((c['tipo'],c.get('stato','ok')) for c in cand))
