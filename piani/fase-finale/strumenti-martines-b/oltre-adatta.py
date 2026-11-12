import json,glob,re,sys
R='/Users/carlogalli/Desktop/IURIS/'
D=R+'Diritto Costituzionale Martines/05 - Contenuti/'
ids={}
for f in glob.glob(D+'u*.json'):
    for c in json.load(open(f))['concetti']: ids[c['id']]=c['nome']
mine=[]
for n in range(8,16):
    for c in json.load(open(D+'u%02d.json'%n))['concetti']: mine.append(c['id'])
mine=list(dict.fromkeys(mine))
mo=set()
for f in glob.glob(D+'oltre-*.json'):
    if f.endswith('oltre-20.json') or f.endswith('oltre-21.json'): continue
    for v in json.load(open(f))['voci']: mo.add(v['id'])
txt={};col={}
for f in sorted(glob.glob(R+'Diritto Costituzionale/05 - Contenuti/oltre-*.json')):
    for v in json.load(open(f))['voci']:
        if 'oltre' in v: txt[v['id']]=v
        for c in v.get('collegamenti',[]): col.setdefault(v['id'],{})[(c['da'],c['a'])]=c
def fix(t):
    def r(m):
        i=m.group(1).strip(); lab=m.group(2)
        if i in ids: return m.group(0)
        return lab if lab else i.replace('-',' ')
    return re.sub(r'\[\[([^\]|]+)(?:\|([^\]]*))?\]\]',r,t)
out=[];flag=[]
for i in mine:
    if i in mo or i not in txt: continue
    v=txt[i]
    e={'id':i,'oltre':fix(v['oltre'])}
    if v.get('daSapere'): e['daSapere']=v['daSapere']
    cs=[c for c in col.get(i,{}).values() if c['da'] in ids and c['a'] in ids and c['da']!=c['a']]
    if cs: e['collegamenti']=cs
    if v.get('fonti'): e['fonti']=v['fonti']
    out.append(e)
    w=[x for x in ['appunti','Bin','Pitruzzella','dispensa','riassunto','manuale','Torre'] if x in e['oltre']]
    if w: flag.append((i,w))
json.dump({'voci':out},open(sys.argv[1],'w'),ensure_ascii=False,indent=1)
print(len(out),'voci; flag',flag)
