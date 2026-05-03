/** Сборка `build-beget-static` / `NEXT_PUBLIC_STATIC_EXPORT=1` — только HTML/CSS/JS на хосте, без API Next. */
export function isStaticExportSite(): boolean {
  return process.env.NEXT_PUBLIC_STATIC_EXPORT === "1";
}
