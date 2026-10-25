// Node resolve hook for `npm test`. Mirrors what Vite does for the app:
// maps the "@/..." alias to src/ and resolves extensionless imports to .ts files.
import { existsSync } from "node:fs";

const SRC_DIR = new URL("../../src/", import.meta.url);
const HAS_EXTENSION = /\.[cm]?[jt]sx?$/;

export async function resolve(specifier, context, nextResolve) {
  const isAlias = specifier.startsWith("@/");
  const isRelative = specifier.startsWith("./") || specifier.startsWith("../");
  if (!isAlias && !isRelative) return nextResolve(specifier, context);

  const url = isAlias
    ? new URL(specifier.slice(2), SRC_DIR)
    : new URL(specifier, context.parentURL);
  if (!HAS_EXTENSION.test(url.pathname)) {
    const withTs = new URL(`${url.href}.ts`);
    if (existsSync(withTs)) return nextResolve(withTs.href, context);
  }
  return nextResolve(url.href, context);
}
