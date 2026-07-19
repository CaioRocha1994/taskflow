export function normalizeTagName(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 50);
}

export function normalizeTagNames(values: string[]) {
  const uniqueTags = new Map<string, string>();
  for (const value of values) {
    const normalized = normalizeTagName(value);
    if (!normalized) continue;
    const key = normalized.toLocaleLowerCase("pt-BR");
    if (!uniqueTags.has(key)) uniqueTags.set(key, normalized);
  }
  return [...uniqueTags.values()];
}
