export function errorMessage(e: unknown, t: (key: string) => string): string {
  const message = e instanceof Error ? e.message : '';
  if (message === 'sessionExpired') return t('sessionExpired');
  return t('error');
}
