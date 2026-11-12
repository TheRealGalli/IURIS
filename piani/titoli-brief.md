# Titoli di unità e lezioni — regole comuni

- Titoli **nostri**, chiari e descrittivi: dicono di che cosa parla la lezione, non riprendono alla lettera i titoli
  del manuale o degli appunti (es. Romano «Da "idrofobi" ad "anfibi": Roma scopre il mare» → «Roma si apre al mare e
  ai commerci»). Termini tecnici e latini restano (con il corsivo dove serve nel testo, nei titoli senza markup).
- Niente «§», niente numeri di paragrafo all'inizio («§ 2.», «2.», «(§§ 1–11)»), niente «Digressione:»; massimo ~70
  caratteri; maiuscola solo all'inizio e nei nomi propri.
- Campo `capitolo` delle unità: forma breve senza «§», per esempio «Parte I · Capitolo II».
- Cambia SOLO i campi `titolo` (unità e lezioni) e `capitolo`; mai gli `id`. Modifica i file JSON in modo testuale
  (sostituendo solo quelle righe) per non riformattare i file: niente `json.dump` dell'intero file. Valida ogni unità
  con `node studio/scripts/validate-content.mjs "<file>"` (prima `export PATH=/usr/local/bin:$PATH`).
