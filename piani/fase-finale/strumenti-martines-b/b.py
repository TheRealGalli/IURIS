import json,re,sys,os
OUT="/Users/carlogalli/Desktop/IURIS/Diritto Costituzionale Martines/05 - Contenuti/"
LIV={'b':'base','m':'medio','a':'avanzato'}
AUTO={"Presidente della Repubblica":"presidente-della-repubblica","Capo dello Stato":"presidente-della-repubblica","Corte costituzionale":"corte-costituzionale","Consiglio dei ministri":"consiglio-dei-ministri","Presidente del Consiglio":"presidente-del-consiglio","Governo":"governo","Regioni":"regioni","Camere":"parlamento","Parlamento":"parlamento","Senato":"senato","Camera":"camera-dei-deputati","indirizzo politico":"indirizzo-politico","partiti":"partiti-politici","minoranze":"tutela-delle-minoranze","fiducia":"rapporto-di-fiducia","rapporto fiduciario":"rapporto-di-fiducia","decreti-legge":"decreto-legge","decreto-legge":"decreto-legge","decreti legislativi":"decreto-legislativo","Costituzione":"costituzione-italiana","separazione dei poteri":"separazione-dei-poteri","corpo elettorale":"popolo","ministri":"ministri","regolamenti parlamentari":"regolamenti-parlamentari","Assemblea costituente":"assemblea-costituente","CSM":"csm","Corte dei conti":"corte-dei-conti","Consiglio di Stato":"consiglio-di-stato","CNEL":"cnel","leggi costituzionali":"legge-costituzionale","legge costituzionale":"legge-costituzionale","referendum abrogativo":"referendum-abrogativo","Statuto albertino":"statuto-albertino","gruppi parlamentari":"gruppi-parlamentari","commissioni":"commissioni-parlamentari","riserva di legge":"riserva-di-legge","principio di legalità":"principio-di-legalita","forma di governo parlamentare":"governo-parlamentare","magistrati":"magistratura","Unione europea":"unione-europea","diritti inviolabili":"diritti-inviolabili","eguaglianza":"principio-di-uguaglianza","controfirma":"controfirma","legislatura":"legislatura","sovranità popolare":"sovranita-popolare","Consigli regionali":"consiglio-regionale","fonti del diritto":"fonti-del-diritto"}
class Unit:
    def __init__(s,n,titolo,capitolo,p1,p2,abstract,note,noteRed):
        s.id="u%02d"%n; s.u=dict(id=s.id,ordine=n,titolo=titolo,capitolo=capitolo,pagine=[p1,p2],abstract=abstract,note=note,noteRedazione=noteRed,lezioni=[],concetti=[],relazioni=[],eventi=[],mappa=None,domande=[])
        s.q=0; s.lp={}
    def L(s,n,titolo,p1,p2,minuti,sintesi,punti,memoria,concetti=""):
        lid=f"{s.id}-l{n}"; s.lp[n]=[p1,p2]
        s.u['lezioni'].append(dict(id=lid,titolo=titolo,pagine=[p1,p2],minuti=minuti,sintesi=sintesi.strip(),puntiChiave=punti,memoria=[dict(voce=a,dettaglio=b) for a,b in memoria],concetti=concetti.split()))
    def C(s,id,nome,tipo,breve,defi,p1,p2,alias=None,latino=None):
        c=dict(id=id,nome=nome,tipo=tipo,alias=alias or [],breve=breve,definizione=defi.strip(),pagine=[p1,p2])
        if latino:c['latino']=latino
        s.u['concetti'].append(c)
    def R(s,*rs):
        for r in rs:
            a,b=r.split(':',1); da,aa=a.split('>'); t,_,et=b.partition(':')
            d=dict(da=da.strip(),a=aa.strip(),tipo=t.strip())
            if et:d['etichetta']=et.strip()
            s.u['relazioni'].append(d)
    def E(s,id,anno,data,titolo,descr,tipo,conc,p1,p2,annoFine=None):
        e=dict(id=id,anno=anno,data=data,titolo=titolo,descrizione=descr,tipo=tipo,concetti=conc.split(),pagine=[p1,p2])
        if annoFine:e['annoFine']=annoFine
        s.u['eventi'].append(e)
    def M(s,m): s.u['mappa']=s._n(m)
    def _n(s,t):
        if isinstance(t,str): t=(t,)
        d=dict(testo=t[0])
        rest=t[1:]
        for x in rest:
            if isinstance(x,str):
                if x.startswith('#'): d['nota']=x[1:]
                elif x: d['concetto']=x
            elif isinstance(x,list): d['figli']=[s._n(y) for y in x]
        return d
    def _q(s,tipo,lez,liv,conc,**kw):
        s.q+=1
        d=dict(id=f"{s.id}-q{s.q:03d}",tipo=tipo,lezione=f"{s.id}-l{lez}",livello=LIV[liv],pagine=list(s.lp[lez]),concetti=conc.split())
        d.update({k:v for k,v in kw.items() if v is not None}); s.u['domande'].append(d)
    def fc(s,l,v,c,d,r): s._q('flashcard',l,v,c,domanda=d,risposta=r)
    def mc(s,l,v,c,d,o,k,sp): s._q('multipla',l,v,c,domanda=d,opzioni=o,corretta=k,spiegazione=sp)
    def vf(s,l,v,c,a,t,sp): s._q('verofalso',l,v,c,affermazione=a,vero=t,spiegazione=sp)
    def co(s,l,v,c,t,sp=None): s._q('completa',l,v,c,testo=t,spiegazione=sp)
    def ap(s,l,v,c,d,tr,pt,serie=None): s._q('aperta',l,v,c,domanda=d,traccia=tr.strip(),punti=[dict(testo=a,chiavi=b) for a,b in pt],serie=serie)
    def od(s,l,v,c,cons,el,sp=None,serie=None): s._q('ordina',l,v,c,consegna=cons,elementi=el,spiegazione=sp,serie=serie)
    def ab(s,l,v,c,cons,cp,serie=None): s._q('abbina',l,v,c,consegna=cons,coppie=[list(x) for x in cp],serie=serie)
    def save(s,auto=None):
        u=s.u; loc={c['id'] for c in u['concetti']}
        A=dict(AUTO); A.update(auto or {})
        for l in u['lezioni']:
            done=set(re.findall(r'\[\[([^\]|]+)',l['sintesi']))
            for ph,cid in sorted(A.items(),key=lambda x:-len(x[0])):
                if cid in done: continue
                lines=l['sintesi'].split('\n'); ok=False
                for i,ln in enumerate(lines):
                    if ln.startswith('#') or ln.startswith('|---'): continue
                    parts=re.split(r'(\[\[[^\]]*\]\])',ln)
                    for j,p in enumerate(parts):
                        if p.startswith('[['): continue
                        m=re.search(r'(?<![\w*])'+re.escape(ph)+r'(?![\w*])',p)
                        if m:
                            parts[j]=p[:m.start()]+'[['+cid+'|'+ph+']]'+p[m.end():]; ok=True; break
                    if ok: lines[i]=''.join(parts); break
                if ok: l['sintesi']='\n'.join(lines); done.add(cid)
        lk=lambda t:[m.group(1).strip() for m in re.finditer(r'\[\[([^\]|]+)(?:\|[^\]]*)?\]\]',t)]
        W=[]
        inl=set()
        for l in u['lezioni']:
            for i in lk(l['sintesi']):
                if i in loc and i not in l['concetti']: l['concetti'].append(i)
            inl|=set(l['concetti'])
            n=len(l['sintesi'].split()); pp=l['pagine'][1]-l['pagine'][0]+1; nl=len(lk(l['sintesi']))
            qs=[q for q in u['domande'] if q['lezione']==l['id']]
            ty={}
            for q in qs: ty[q['tipo']]=ty.get(q['tipo'],0)+1
            print(f"  {l['id']} pp{l['pagine']} parole {n} ({n/pp:.0f}/pag) link {nl} ({100*nl/n:.1f}/100) domande {len(qs)} {ty}")
            if n/pp<200: W.append(f"{l['id']} sintesi {n/pp:.0f}/pag")
            if 100*nl/n<2: W.append(f"{l['id']} pochi link")
            if len(qs)<14: W.append(f"{l['id']} domande {len(qs)}")
        qc=set(); 
        for q in u['domande']: qc|=set(q['concetti'])
        rc={}
        for r in u['relazioni']:
            for k in (r['da'],r['a']): rc[k]=rc.get(k,0)+1
        for c in u['concetti']:
            n=len(c['definizione'].split())
            if c['id'] not in inl: W.append(f"{c['id']} non in lezione")
            if c['id'] not in qc: W.append(f"{c['id']} senza domanda")
            if rc.get(c['id'],0)<2: W.append(f"{c['id']} relazioni {rc.get(c['id'],0)}")
            if n<55 or n>100: W.append(f"{c['id']} definizione {n} parole")
            if len(c['breve'])>150: W.append(f"{c['id']} breve lungo")
        txt=json.dumps(u,ensure_ascii=False)
        for m in re.finditer(r'\b([XVI]{2,}) secolo(?! [ad]\.C\.)',txt): W.append('secolo senza era: '+m.group(0))
        print(f"{s.id}: lezioni {len(u['lezioni'])} concetti {len(u['concetti'])} relazioni {len(u['relazioni'])} eventi {len(u['eventi'])} domande {len(u['domande'])}")
        for w in W: print("  !",w)
        json.dump(u,open(OUT+s.id+".json","w"),ensure_ascii=False,indent=1)
