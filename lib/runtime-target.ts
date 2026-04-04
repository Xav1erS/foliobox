export function isRunningOnVercel() {
  return Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
}

export function readNumberEnv(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
