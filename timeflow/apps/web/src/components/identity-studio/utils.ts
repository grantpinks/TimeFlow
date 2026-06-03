import type { IdentityStudioSectionExpansion } from './types';

export function resolveSectionExpansion(
  sectionKey: string,
  focusedIdentityId: string | null,
  expandedSectionKeys: ReadonlySet<string>
): IdentityStudioSectionExpansion {
  if (focusedIdentityId === null) {
    return 'full';
  }
  if (sectionKey === focusedIdentityId || expandedSectionKeys.has(sectionKey)) {
    return 'full';
  }
  return 'collapsed-preview';
}
