import { NextRequest, NextResponse } from 'next/server';

// ArcGIS World Geocoder - free, no API key, excellent quality
// Two modes: suggest (autocomplete) and findAddressCandidates (full geocode)

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q');
  const magicKey = request.nextUrl.searchParams.get('magicKey');
  const mode = request.nextUrl.searchParams.get('mode') || 'suggest'; // 'suggest' or 'geocode'
  const state = request.nextUrl.searchParams.get('state') || 'TX'; // 'TX', 'FL', etc.

  if (!q || q.trim().length < 4) {
    return NextResponse.json({ results: [] });
  }

  try {
    if (mode === 'suggest') {
      return await suggestAddresses(q, state);
    } else {
      return await geocodeAddress(q, magicKey || undefined);
    }
  } catch (err) {
    console.error('Geocode error:', err);
    return NextResponse.json({ results: [], error: 'Geocoding failed' });
  }
}

// State config for geocoding bias
const STATE_CONFIG: Record<string, { lat: number; lng: number; regex: RegExp }> = {
  TX: { lat: 31.5, lng: -99.5, regex: /\bTX\b|Texas/i },
  FL: { lat: 28.5, lng: -82.0, regex: /\bFL\b|Florida/i },
  NJ: { lat: 40.2, lng: -74.7, regex: /\bNJ\b|New Jersey/i },
  GA: { lat: 32.7, lng: -83.5, regex: /\bGA\b|Georgia/i },
  NC: { lat: 35.5, lng: -80.0, regex: /\bNC\b|North Carolina/i },
  AL: { lat: 32.8, lng: -86.8, regex: /\bAL\b|Alabama/i },
  SC: { lat: 34.0, lng: -81.0, regex: /\bSC\b|South Carolina/i },
  OH: { lat: 40.4, lng: -82.7, regex: /\bOH\b|Ohio/i },
  WA: { lat: 47.4, lng: -120.5, regex: /\bWA\b|Washington/i },
  AR: { lat: 34.7, lng: -92.3, regex: /\bAR\b|Arkansas/i },
  LA: { lat: 31.0, lng: -92.0, regex: /\bLA\b|Louisiana/i },
};

async function suggestAddresses(query: string, state: string) {
  const config = STATE_CONFIG[state] || STATE_CONFIG.TX;

  // ArcGIS Suggest endpoint - fast autocomplete
  const url = new URL('https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/suggest');
  url.searchParams.set('f', 'json');
  url.searchParams.set('text', query);
  url.searchParams.set('maxSuggestions', '6');
  url.searchParams.set('countryCode', 'US');
  // Bias toward target state center
  url.searchParams.set('location', `${config.lng},${config.lat}`);
  url.searchParams.set('distance', '500000'); // 500km radius preference
  // Only return addresses (not POIs)
  url.searchParams.set('category', 'Address');

  const resp = await fetch(url.toString(), {
    headers: { 'Referer': 'https://beekings.com' },
    signal: AbortSignal.timeout(6000),
  });

  if (!resp.ok) throw new Error(`ArcGIS suggest ${resp.status}`);
  const data = await resp.json();

  const suggestions = (data.suggestions || [])
    .filter((s: { text: string }) => config.regex.test(s.text))
    .map((s: { text: string; magicKey: string }) => ({
      text: s.text,
      magicKey: s.magicKey,
    }));

  return NextResponse.json({ suggestions });
}

async function geocodeAddress(query: string, magicKey?: string) {
  const url = new URL('https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates');
  url.searchParams.set('f', 'json');
  url.searchParams.set('singleLine', query);
  url.searchParams.set('maxLocations', '1');
  url.searchParams.set('outFields', '*');
  url.searchParams.set('countryCode', 'US');
  if (magicKey) {
    url.searchParams.set('magicKey', magicKey);
  }

  const resp = await fetch(url.toString(), {
    headers: { 'Referer': 'https://beekings.com' },
    signal: AbortSignal.timeout(8000),
  });

  if (!resp.ok) throw new Error(`ArcGIS geocode ${resp.status}`);
  const data = await resp.json();

  const candidates = (data.candidates || []).map((c: Record<string, unknown>) => {
    const a = c.attributes as Record<string, string>;
    const loc = c.location as { x: number; y: number };
    return {
      address: c.address as string,
      lat: loc.y,
      lng: loc.x,
      score: c.score,
      street: a.StAddr || '',
      city: a.City || '',
      state: a.RegionAbbr || a.Region || '',
      zip: a.Postal || '',
      county: (a.Subregion || '').replace(/ County$/i, ''),
      addrType: a.Addr_type || '',
      structType: a.StrucType || '',
    };
  });

  return NextResponse.json({ results: candidates });
}
