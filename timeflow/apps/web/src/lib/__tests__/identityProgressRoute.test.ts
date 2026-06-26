import { describe, expect, it } from 'vitest';
import {
  buildIdentityProgressHref,
  getProgressIdentityIdFromSearch,
  removeProgressParamFromUrl,
} from '../identityProgressRoute';

describe('identity progress route helpers', () => {
  it('builds the habits progress details URL for an identity', () => {
    expect(buildIdentityProgressHref('identity 1')).toBe('/habits?progress=identity+1');
  });

  it('reads a progress identity id from a search string', () => {
    expect(getProgressIdentityIdFromSearch('?progress=identity-1')).toBe('identity-1');
  });

  it('ignores missing or blank progress params', () => {
    expect(getProgressIdentityIdFromSearch('')).toBeNull();
    expect(getProgressIdentityIdFromSearch('?progress=')).toBeNull();
  });

  it('removes only the progress param from a URL', () => {
    expect(removeProgressParamFromUrl('/habits?progress=identity-1')).toBe('/habits');
    expect(removeProgressParamFromUrl('/habits?progress=identity-1&tab=weekly')).toBe(
      '/habits?tab=weekly'
    );
  });
});
