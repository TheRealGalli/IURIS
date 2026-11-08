/** Le prove del tour vivono solo in memoria. Il browser personale non viene modificato. */
export class ArchivioTemporaneo implements Storage {
  private dati = new Map<string, string>();
  get length() { return this.dati.size; }
  key(i: number) { return [...this.dati.keys()][i] ?? null; }
  getItem(k: string) { return this.dati.get(k) ?? null; }
  setItem(k: string, v: string) { this.dati.set(k, String(v)); }
  removeItem(k: string) { this.dati.delete(k); }
  clear() { this.dati.clear(); }
}
let temporaneo: ArchivioTemporaneo | null = null;
export const archivio = (): Storage => temporaneo ?? localStorage;
export const inDemo = () => temporaneo !== null;
export function apriArchivioDemo() { temporaneo = new ArchivioTemporaneo(); }
export function chiudiArchivioDemo() { temporaneo = null; }
