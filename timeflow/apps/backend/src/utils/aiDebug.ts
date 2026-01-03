export function resolveAiDebugFlag(
  envEnabled: boolean,
  headerValue?: string | string[]
): boolean {
  if (!envEnabled) {
    return false;
  }
  const normalized = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  return normalized === 'true' || normalized === '1';
}
