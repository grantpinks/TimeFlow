export function buildIdentityProgressHref(identityId: string): string {
  const params = new URLSearchParams({ progress: identityId });
  return `/habits?${params.toString()}`;
}

export function getProgressIdentityIdFromSearch(search: string): string | null {
  const identityId = new URLSearchParams(search).get('progress')?.trim();
  return identityId ? identityId : null;
}
