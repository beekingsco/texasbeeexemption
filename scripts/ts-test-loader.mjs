const root = new URL('../', import.meta.url);

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    const rel = specifier.slice(2).replace(/\.ts$/, '');
    return nextResolve(new URL(`${rel}.ts`, root).href, context);
  }
  return nextResolve(specifier, context);
}
