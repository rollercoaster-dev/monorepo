/**
 * DID (Decentralized Identifier) utility functions
 * @see https://w3c-ccg.github.io/did-method-web/
 */

export function generateDidWeb(url: string | undefined | null): string | null {
  if (!url) {
    return null;
  }
  try {
    const parsedUrl = new URL(url);
    let did = 'did:web:';
    if (parsedUrl.port) {
      did += `${parsedUrl.hostname}%3A${parsedUrl.port}`;
    } else {
      did += parsedUrl.hostname;
    }
    if (parsedUrl.pathname && parsedUrl.pathname !== '/') {
      const pathParts = parsedUrl.pathname.split('/').filter((part) => part.length > 0);
      if (pathParts.length > 0) {
        did += ':' + pathParts.join(':');
      }
    }
    return did;
  } catch {
    return null;
  }
}

export function isValidDidWeb(did: string): boolean {
  if (!did || typeof did !== 'string') return false;
  if (!did.startsWith('did:web:')) return false;
  const afterPrefix = did.slice(8);
  if (!afterPrefix || afterPrefix.length === 0) return false;
  const parts = afterPrefix.split(':');
  return parts.length > 0 && parts[0].length > 0;
}

export function didWebToUrl(did: string): string | null {
  if (!isValidDidWeb(did)) return null;
  const afterPrefix = did.slice(8);
  const parts = afterPrefix.split(':');
  const domain = parts[0].replace('%3A', ':');
  const pathSegments = parts.slice(1);
  let url = `https://${domain}`;
  if (pathSegments.length > 0) {
    url += '/' + pathSegments.join('/');
  }
  return url;
}
