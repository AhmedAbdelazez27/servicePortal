export function toRFC3339(v: string | Date | null | undefined): string | null {
  if (!v) return null;
  const d = typeof v === 'string' ? new Date(v) : v;
  return isNaN(d.getTime()) ? null : d.toISOString();
}
