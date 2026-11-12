import json
R='/Users/carlogalli/Desktop/IURIS/'
D=R+'Diritto Costituzionale Martines/05 - Contenuti/'
C={}
for n in range(8,16):
    for c in json.load(open(D+'u%02d.json'%n))['concetti']: C[c['id']]=c
SELF={"camera-dei-deputati","senato","presidenza-del-consiglio","consiglio-dei-ministri","decreto-legge","referendum-abrogativo","legge-formale","forza-di-legge","conferenza-dei-capigruppo","commissioni-parlamentari","commissioni-bicamerali","ufficio-parlamentare-di-bilancio","reati-ministeriali","rottura-della-costituzione","riserva-assoluta","riserva-relativa","riserva-di-legge-costituzionale","crisi-extraparlamentare","leggi-di-indirizzo-politico","risoluzione-parlamentare","indirizzo-politico","senatori-a-vita","bicameralismo-paritario","parlamento-in-seduta-comune","rappresentanza-politica","elettorato-attivo","elettorato-passivo","sistema-elettorale","caratteri-del-voto","premio-di-maggioranza","soglia-di-sbarramento","par-condicio","giunta-delle-elezioni","prerogative-parlamentari","giuri-d-onore","sanzioni-disciplinari-parlamentari","immunita-della-sede","autonomia-contabile-camere","regolamenti-parlamentari","legislatura","scioglimento-anticipato","quorum-strutturale","programmazione-dei-lavori","interna-corporis","legge-ordinaria","commissione-referente","commissione-redigente","navetta-parlamentare","promulgazione","revisione-costituzionale","rapporto-di-fiducia","rendiconto-generale","mozione-parlamentare","interrogazione-parlamentare","interpellanza","quorum-referendario","legge-di-conversione"}
G=[{"concetto":i,"premessa":c['breve']} for i,c in C.items() if i not in SELF]
S=[
("parlamento-in-seduta-comune","Collegio formato da tutti i deputati e senatori insieme, convocato solo nei casi previsti dalla Costituzione, per esempio per eleggere il Capo dello Stato."),
("bicameralismo-paritario","Assetto in cui due assemblee elettive hanno le stesse funzioni: ogni legge va approvata da entrambe nello stesso testo e il Governo deve avere la fiducia di tutte e due."),
("circoscrizione-estero","Ripartizione territoriale che consente ai cittadini residenti fuori dall'Italia di eleggere otto deputati e quattro senatori."),
("premio-di-maggioranza","Seggi aggiuntivi attribuiti dalla legge elettorale a chi vince, per garantirgli una maggioranza in Parlamento."),
("soglia-di-sbarramento","Percentuale minima di voti al di sotto della quale una lista o una coalizione non partecipa alla ripartizione dei seggi."),
("par-condicio","Regola di parità di accesso ai mezzi di informazione per partiti e candidati durante la campagna elettorale (leggi del 1993 e del 2000)."),
("ineleggibilita","Causa che impedisce di essere validamente eletti e rende nulla l'elezione, se non rimossa prima della candidatura."),
("incompatibilita","Situazione che non impedisce l'elezione ma obbliga l'eletto a scegliere tra il seggio e un'altra carica."),
("incandidabilita","Divieto di presentarsi alle elezioni per chi ha riportato condanne definitive per alcuni gravi reati (legge del 2012)."),
("verifica-dei-poteri","Controllo, affidato a ciascuna Camera, sui titoli di ammissione dei propri membri e sulla regolarità della loro elezione."),
("insindacabilita-parlamentare","Garanzia per cui i membri delle Camere non rispondono delle opinioni espresse e dei voti dati nell'esercizio delle funzioni."),
("divieto-di-mandato-imperativo","Regola dell'art. 67 per cui il parlamentare rappresenta la Nazione e non può essere vincolato da istruzioni di elettori o partiti."),
("indennita-parlamentare","Compenso stabilito dalla legge che l'art. 69 riconosce ai membri delle Camere, per consentire anche ai meno abbienti di svolgere il mandato."),
("giuri-d-onore","Commissione che accerta, su richiesta del deputato o senatore offeso, la fondatezza di accuse lesive della sua onorabilità mosse in aula."),
("conferenza-dei-capigruppo","Organo interno che riunisce i presidenti dei gruppi con il Presidente della Camera per fissare programma e calendario dei lavori."),
("prorogatio","Prolungamento dei poteri delle Camere scadute o sciolte finché non si riuniscono le nuove (art. 61)."),
("quorum-strutturale","Presenza della maggioranza dei componenti, necessaria perché una seduta delle Camere sia valida (art. 64, terzo comma)."),
("interna-corporis","Atti e attività interni alle Camere, come il computo dei voti o l'applicazione dei regolamenti, sottratti di regola a controlli esterni."),
("ostruzionismo","Uso esasperato degli strumenti procedurali per ritardare o impedire una deliberazione parlamentare."),
("commissione-deliberante","Procedimento in cui una commissione permanente esamina e approva definitivamente un disegno di legge senza passare dall'Assemblea."),
("commissione-redigente","Procedimento intermedio: la commissione approva i singoli articoli e l'Assemblea vota solo il testo finale."),
("navetta-parlamentare","Passaggio ripetuto di un disegno di legge da una Camera all'altra finché entrambe approvano lo stesso testo."),
("promulgazione","Atto con cui il Presidente della Repubblica, entro un mese dall'approvazione, dichiara che la legge è stata approvata e ne ordina l'osservanza."),
("vacatio-legis","Intervallo, di regola di quindici giorni, che separa la pubblicazione di una legge dal momento in cui diventa obbligatoria."),
("rottura-della-costituzione","Deroga posta da una norma costituzionale a un'altra norma o a un principio della stessa Costituzione, come la XII disposizione finale."),
("rapporto-di-fiducia","Legame politico per cui il Governo può restare in carica solo se ha il sostegno di entrambe le Camere."),
("governo-di-minoranza","Esecutivo che si regge su astensioni o appoggi esterni, senza una maggioranza precostituita, come il III Andreotti del 1976."),
("esercizio-provvisorio","Autorizzazione, concessa con legge e per non più di quattro mesi, a riscuotere e spendere quando il bilancio non è approvato in tempo."),
("copertura-finanziaria","Obbligo per ogni legge che importa nuovi o maggiori oneri di indicare i mezzi per farvi fronte."),
("amnistia-e-indulto","Provvedimenti di clemenza generale che estinguono il reato o condonano la pena, approvati con legge a maggioranza dei due terzi."),
("interpellanza","Domanda scritta al Governo sui motivi e gli intendimenti della sua condotta, che può sfociare in una mozione."),
("questione-di-fiducia","Strumento con cui il Governo lega la propria permanenza in carica all'approvazione di un provvedimento da parte delle Camere."),
("mozione-di-sfiducia","Atto parlamentare motivato, firmato da un decimo dei componenti di una Camera, con cui si revoca il sostegno al Governo."),
("quorum-referendario","Partecipazione della maggioranza degli aventi diritto, senza la quale il voto popolare abrogativo non è valido."),
("divieto-di-ripristino","Limite per cui il legislatore non può reintrodurre subito la disciplina che gli elettori hanno abrogato (sent. 199/2012)."),
("referendum-di-indirizzo","Consultazione popolare del 1989 sul mandato costituente al Parlamento europeo, indetta con apposita legge costituzionale."),
("consiglio-di-gabinetto","Comitato ristretto di ministri, designati dal Presidente del Consiglio, che lo aiuta nella direzione politica (art. 6 l. 400/1988)."),
("spoil-system","Prassi di origine americana per cui i vertici dell'amministrazione cambiano quando cambia la maggioranza di governo."),
("mandato-esplorativo","Compito affidato dal Capo dello Stato, spesso al Presidente di una Camera, di sondare i partiti quando una maggioranza non è evidente."),
("viceministri","Sottosegretari, al massimo dieci, che ricevono deleghe ampie su aree di più strutture del ministero (l. 81/2001)."),
("alta-amministrazione","Atti al confine tra indirizzo politico e amministrazione, come le nomine ai vertici dello Stato, deliberati dal Consiglio dei ministri."),
("reiterazione-decreti-legge","Prassi, vietata dalla Corte nel 1996, di riadottare un provvedimento d'urgenza non convertito entro sessanta giorni."),
("legge-di-sanatoria","Legge con cui le Camere regolano i rapporti giuridici sorti su decreti d'urgenza non convertiti (art. 77, terzo comma)."),
("eccesso-di-delega","Vizio dell'atto governativo con forza di legge che supera oggetto, termine o principi fissati dal Parlamento."),
("decreti-correttivi","Atti legislativi del Governo con cui, entro un ulteriore termine fissato dal Parlamento, si integrano o si correggono decreti già emanati."),
("regolamenti-indipendenti","Atti normativi secondari del Governo in materie non disciplinate dalla legge e non riservate a essa."),
("regolamenti-di-esecuzione","Atti normativi secondari che dettano norme di dettaglio per applicare una legge già completa."),
("riserva-di-regolamento","Ambito, l'organizzazione degli uffici dei ministeri, che la legge 59/1997 ha affidato alla normazione secondaria del Governo."),
("riserva-assoluta","Vincolo per cui una materia, come quella penale, può essere disciplinata soltanto dalla legge e dagli atti con forza di legge."),
("riserva-relativa","Vincolo per cui la legge deve fissare le linee essenziali di una materia, lasciando il dettaglio a fonti secondarie, come per l'art. 23."),
("rimpasto","Sostituzione di uno o più ministri decisa dal Presidente del Consiglio senza aprire una crisi."),
("governo-dimissionario","Esecutivo che, dopo aver rassegnato le dimissioni, resta in carica solo per l'ordinaria amministrazione e gli atti urgenti fino al giuramento del successore."),
("crisi-extraparlamentare","Caduta del Governo dovuta a scelte dei partiti fuori dalle Camere, senza un voto di sfiducia."),
("reati-ministeriali","Reati commessi dai membri del Governo nell'esercizio delle funzioni, giudicati da un collegio speciale previa autorizzazione parlamentare."),
("avvocatura-dello-stato","Organo che rappresenta e difende in giudizio lo Stato e le amministrazioni pubbliche, anche davanti alla Corte costituzionale."),
]
json.dump(G,open(R+'piani/fase-finale/martines-b-glossario.json','w'),ensure_ascii=False,indent=1)
json.dump([{"concetto":a,"definizione":b} for a,b in S],open(R+'piani/fase-finale/martines-b-schede-inverse.json','w'),ensure_ascii=False,indent=1)
json.dump({i:{"nome":c['nome'],"alias":c.get('alias',[]),"latino":c.get('latino')} for i,c in C.items()},open('conc.json','w'),ensure_ascii=False)
print(len(G),[g['concetto'] for g in G]); print(len(S),len(C))
