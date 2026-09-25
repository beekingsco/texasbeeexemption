import { NextRequest, NextResponse } from 'next/server';
import {
  SEARCH_ATTR_COOKIE,
  SEARCH_ATTR_HEADER,
  SEARCH_SESSION_COOKIE,
  SEARCH_SESSION_HEADER,
  attributionFromLanding,
  cookieOptions,
  encodeAttribution,
  isSessionId,
} from '@/lib/search-attribution';

/**
 * First-touch session and campaign cookies. This does not change the page
 * body. Cookies are set only when missing, and the resolved values are passed
 * to route handlers as request headers so the search log can read them.
 */
export function proxy(request: NextRequest) {
  const existingSession = request.cookies.get(SEARCH_SESSION_COOKIE)?.value;
  const existingAttribution = request.cookies.get(SEARCH_ATTR_COOKIE)?.value;
  const sessionId = isSessionId(existingSession) ? existingSession : crypto.randomUUID();
  const attribution = existingAttribution
    || encodeAttribution(attributionFromLanding(request.nextUrl, request.headers.get('referer')));

  const headers = new Headers(request.headers);
  headers.delete(SEARCH_SESSION_HEADER);
  headers.delete(SEARCH_ATTR_HEADER);
  headers.set(SEARCH_SESSION_HEADER, sessionId);
  headers.set(SEARCH_ATTR_HEADER, attribution);

  const response = NextResponse.next({ request: { headers } });
  const options = cookieOptions(request.nextUrl.protocol === 'https:');
  if (!isSessionId(existingSession)) {
    response.cookies.set(SEARCH_SESSION_COOKIE, sessionId, options);
  }
  if (!existingAttribution) {
    response.cookies.set(SEARCH_ATTR_COOKIE, attribution, options);
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
