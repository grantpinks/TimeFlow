export function buildIdentityProgressHref(identityId: string): string {
  const params = new URLSearchParams({ progress: identityId });
  return `/habits?${params.toString()}`;
}

export function getProgressIdentityIdFromSearch(search: string): string | null {
  const identityId = new URLSearchParams(search).get('progress')?.trim();
  return identityId ? identityId : null;
}

export function removeProgressParamFromUrl(pathWithSearch: string): string {
  const [pathname, rawSearch = ''] = pathWithSearch.split('?');
  const params = new URLSearchParams(rawSearch);
  params.delete('progress');
  const nextSearch = params.toString();
  return nextSearch ? `${pathname}?${nextSearch}` : pathname;
}
