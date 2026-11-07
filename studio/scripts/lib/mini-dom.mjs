// DOM minimo per i controlli: abbastanza per leggere l'HTML di marked come fa il browser
// (textContent, childNodes, children, TreeWalker sui nodi di testo). Nessuna dipendenza.
const VUOTI = new Set(['br', 'hr', 'img', 'input', 'meta', 'link']);
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0', '#39': "'" };
const decodifica = (s) => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+\d*);/gi, (m, e) => e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : ENT[e] ?? m);

class Nodo {
  constructor(tipo) { this.nodeType = tipo; this.childNodes = []; this.parentNode = null; }
  get children() { return this.childNodes.filter((n) => n.nodeType === 1); }
  get firstElementChild() { return this.children[0] ?? null; }
  get textContent() { return this.nodeType === 3 ? this.data : this.childNodes.map((n) => n.textContent).join(''); }
  contains(n) { for (let x = n; x; x = x.parentNode) if (x === this) return true; return false; }
  append(n) { n.parentNode = this; this.childNodes.push(n); return n; }
}
class Testo extends Nodo { constructor(data) { super(3); this.data = data; } }
class Elemento extends Nodo {
  constructor(tag) { super(1); this.tagName = tag.toUpperCase(); this.attributi = {}; }
  getAttribute(k) { return this.attributi[k] ?? null; }
  set innerHTML(html) {
    this.childNodes = [];
    const pila = [this];
    for (const m of html.matchAll(/<!--[\s\S]*?-->|<\/([a-zA-Z0-9]+)\s*>|<([a-zA-Z0-9]+)((?:\s+[^\s=>]+(?:=(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>|([^<]+)/g)) {
      const cima = pila[pila.length - 1];
      if (m[5] !== undefined) { cima.append(new Testo(decodifica(m[5]))); continue; }
      if (m[1]) { const t = m[1].toUpperCase(); const i = pila.map((x) => x.tagName).lastIndexOf(t); if (i > 0) pila.length = i; continue; }
      if (!m[2]) continue;
      const el = cima.append(new Elemento(m[2]));
      for (const a of (m[3] ?? '').matchAll(/([^\s=]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) el.attributi[a[1]] = decodifica(a[2] ?? a[3] ?? a[4] ?? '');
      if (!m[4] && !VUOTI.has(m[2].toLowerCase())) pila.push(el);
    }
  }
}
export const documento = {
  createElement: (tag) => new Elemento(tag),
  createTreeWalker(root, _filtro) {
    const testi = []; const giro = (n) => { for (const c of n.childNodes) { if (c.nodeType === 3) testi.push(c); else giro(c); } }; giro(root);
    let i = -1; return { nextNode: () => testi[++i] ?? null };
  },
};
/** textContent dell'HTML come lo calcolerebbe il browser. */
export const testoDi = (html) => { const d = documento.createElement('div'); d.innerHTML = html; return d.textContent; };
