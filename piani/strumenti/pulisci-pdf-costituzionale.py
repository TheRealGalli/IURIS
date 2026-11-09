# Ripulisce il PDF StuDocu di costituzionale per gli Originali (da lanciare dalla radice del progetto).
import re, sys, hashlib, os
from pypdf import PdfReader, PdfWriter
from pypdf.generic import NameObject, StreamObject
src="Diritto Costituzionale/00 - Appunti e fonti/Bin-Pitruzzella, riassunto completo (258 pp).pdf"
out="studio/public/originali/costituzionale-bin-pitruzzella.pdf"
r=PdfReader(src); w=PdfWriter()
EMAIL=re.compile(rb'(/R\d+ 6\.30655 Tf\n[^\n]* 6[0-9]\.\d+ Tm\n)\[[^\n]*\]TJ\n')
senza=[]
for i,p in enumerate(r.pages):
    c=p['/Contents']; assert len(c)==3 and b'Scaricato da' in c[2].get_object().get_data()
    s=StreamObject()
    if i in (0,2):
        s.set_data(b'')
    else:
        main=c[1].get_object().get_data()
        main,n=EMAIL.subn(rb'\1',main)
        if n!=1: senza.append((i+1,n))
        s.set_data(b'q\n'+main+b'\nQ\n')
    np=w.add_page(p)
    np[NameObject('/Contents')]=w._add_object(s)
    if '/Annots' in np: del np['/Annots']
for p in w.pages: p.compress_content_streams(level=9)
w.add_metadata({'/Title':'Diritto costituzionale — riassunto del Bin-Pitruzzella'})
w.compress_identical_objects(remove_duplicates=True, remove_unreferenced=True)
w.write(out)
print('pagine con sostituzioni != 1:', senza)
print(os.path.getsize(out), hashlib.sha256(open(out,'rb').read()).hexdigest())
