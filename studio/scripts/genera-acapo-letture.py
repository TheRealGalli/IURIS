# Dai candidati: sostituzioni ad alta confidenza (applica) e elenco di quelli dubbi.
import json,re,sys,glob
from collections import defaultdict,Counter
import os, tempfile
ROOT=os.path.join(os.path.dirname(os.path.abspath(__file__)), '..') + '/'
DOC=sys.argv[1]
c=json.load(open(f'{tempfile.gettempdir()}/candidati-{DOC}.json'))
rev=json.load(open(ROOT+'letture-src/revisioni.json'))
testi={}
for f in sorted(glob.glob(ROOT+f'letture-src/{DOC}/*.md')):
    for m in re.finditer(r'<!-- blocco:(\S+) pagina:(\d+) -->\s*\n([\s\S]*?)(?=\n\s*<!-- blocco:|$)',open(f).read()):
        t=m.group(3).strip(); r=rev.get(DOC,{}).get(m.group(1),{})
        if 'markdown' in r: continue
        for s in r.get('sostituzioni',[]): t=t.replace(s['da'],s['a'])
        testi[m.group(1)]=t
AUTO={'trattino','freccia','etichetta','titolo'}
dubbi=[x for x in c if x['tipo'] not in AUTO or 'blocco' not in x]
perB=defaultdict(list)
for x in c:
    if x['tipo'] in AUTO and 'blocco' in x: perB[x['blocco']].append(x)
voci=[]; tipi=Counter()
for bid,xs in perB.items():
    t=testi[bid]
    for x in sorted(xs,key=lambda x:-x['pos']):
        p=x['pos']; L=x['riga_intera']; k=x['tipo']
        cut=p
        while cut>0 and t[cut-1]==' ': cut-=1
        prima=t[:cut]
        riga=t[t.rfind('\n',0,p)+1:p]
        voce=re.match(r'^(?:(- |• |‣ )|(\d{1,2}\. ))',riga)
        if k=='titolo':
            if voce or not t.startswith(L,p): x['motivo']='titolo dentro una voce o non allineato'; dubbi.append(x); continue
            dopo=t[p+len(L):]
            if dopo and not dopo[0] in ' \n': x['motivo']='titolo non seguito da spazio'; dubbi.append(x); continue
            if not re.search(r'[A-Za-zÀ-ÿ]',L): continue
            if L.startswith('('): H=L; sub='riferimento'
            elif L.rstrip().endswith(':'): H=f'**{L}**'; sub='titoletto'
            else: H=f'#### {L}'; sub='titolo'
            nuovo=(prima+'\n\n' if cut>0 else '')+H+('\n\n'+dopo.lstrip(' ') if dopo.strip() else '')
            tipi[sub]+=1
        elif voce and k in ('freccia','etichetta'):
            if cut==0: continue
            nuovo=prima+'\\\n'+t[p:]; tipi[k+'-in-voce']+=1
        elif voce and k=='trattino' and voce.group(2):
            nuovo=prima+'\n   '+t[p:]; tipi['sottovoce']+=1
        elif k=='etichetta':
            lab=x['etichetta']
            if not t.startswith(lab,p): nuovo=prima+'\n\n'+t[p:]; tipi['etichetta-senza-grassetto']+=1
            else: nuovo=prima+'\n\n**'+lab+'**'+t[p+len(lab):]; tipi['etichetta']+=1
        else:
            if cut==0: continue
            nuovo=prima+'\n\n'+t[p:]; tipi[k]+=1
        # sostituzione minima e univoca
        a0=max(0,cut-25); ok=False
        diff_fine_old=len(t)-1
        # trova il tratto cambiato: prefisso comune, suffisso comune
        i=0
        while i<min(len(t),len(nuovo)) and t[i]==nuovo[i]: i+=1
        j=0
        while j<min(len(t),len(nuovo))-i and t[-1-j]==nuovo[-1-j]: j+=1
        for ctx in (20,35,60,100,200):
            a0=max(0,i-ctx); z_old=min(len(t),len(t)-j+ctx); z_new=len(nuovo)-(len(t)-z_old)
            da=t[a0:z_old]
            if t.count(da)==1:
                voci.append(dict(doc=DOC,blocco=bid,da=da,a=nuovo[a0:z_new])); ok=True; break
        if not ok: x['motivo']='contesto non univoco'; dubbi.append(x); continue
        t=nuovo
    testi[bid]=t
json.dump(voci,open(f'{tempfile.gettempdir()}/voci-{DOC}.json','w'),ensure_ascii=False,indent=0)
json.dump(dubbi,open(f'{tempfile.gettempdir()}/dubbi-{DOC}.json','w'),ensure_ascii=False,indent=0)
json.dump({k:v for k,v in testi.items() if k in perB},open(f'{tempfile.gettempdir()}/finali-{DOC}.json','w'),ensure_ascii=False,indent=0)
print(DOC,'voci',len(voci),'blocchi',len(perB),dict(tipi)); print('dubbi',Counter(x.get('motivo') or (x['tipo']+'/'+x.get('stato','ok')) for x in dubbi))
