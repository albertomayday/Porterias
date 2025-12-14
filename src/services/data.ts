export async function fetchStrips(): Promise<{ strips: unknown[] }> {
  const res = await fetch('/data/strips.json')
  if (!res.ok) throw new Error('No se pudo cargar /data/strips.json')
  return res.json()
}
