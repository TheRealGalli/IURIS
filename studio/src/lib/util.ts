const pad = (n: number) => String(n).padStart(2, '0');

export function isoDi(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export const oggiISO = () => isoDi(new Date());

export function giorniTra(daISO: string, aISO: string): number {
  const [a, b] = [daISO, aISO].map((s) => {
    const [y, m, d] = s.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  });
  return Math.round((b - a) / 86400000);
}

export function fmtData(iso: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' }): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('it-IT', opts);
}

export const intervallo = ([a, b]: [number, number]) => (a === b ? `${a}` : `${a}–${b}`);

/** "pp. 165–169" (appunti), "Incampo pp. 3–5" (materie con più testi), "manuale pp. 287–289" (unità ricostruite) */
export function rifPagine(x: { pagine?: [number, number]; manuale?: [number, number]; fonteNome?: string }): string {
  const parti: string[] = [];
  if (x.pagine) parti.push(`${x.fonteNome ? `${x.fonteNome} ` : ''}pp. ${intervallo(x.pagine)}`);
  if (x.manuale) parti.push(`manuale pp. ${intervallo(x.manuale)}`);
  return parti.join(' · ');
}

export function fmtAnno(anno: number): string {
  return anno < 0 ? `${-anno} a.C.` : `${anno} d.C.`;
}

export function fmtMinuti(sec: number): string {
  const m = Math.round(sec / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${pad(m % 60)}`;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function plurale(n: number, uno: string, molti: string) {
  return `${n} ${n === 1 ? uno : molti}`;
}
