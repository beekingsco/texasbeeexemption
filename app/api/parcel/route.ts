import { NextRequest, NextResponse } from 'next/server';
import { recordSearchFollowUp } from '@/lib/address-search-log';
import { lookupTexasParcel, type TexasParcel } from '@/lib/texas-parcel';

export type { TexasParcel as ParcelData };

export async function GET(request: NextRequest) {
  const lat = Number(request.nextUrl.searchParams.get('lat'));
  const lng = Number(request.nextUrl.searchParams.get('lng'));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(
      { found: false, status: 'lookup_failed', error: 'lat and lng are required' },
      { status: 400 },
    );
  }

  const parcel = await lookupTexasParcel(lat, lng);
  if (parcel.status === 'ok') {
    await rememberParcel(request, lat, lng, parcel);
    return NextResponse.json(parcel);
  }
  if (parcel.status === 'no_parcel') {
    await recordSearchFollowUp({
      headers: request.headers,
      lat,
      lng,
      eligibility: 'no_parcel',
    });
    return NextResponse.json(parcel);
  }

  console.error('Parcel lookup failed:', parcel.error);
  await recordSearchFollowUp({
    headers: request.headers,
    lat,
    lng,
    eligibility: 'parcel_lookup_failed',
  });
  return NextResponse.json(parcel, { status: 502 });
}

function rememberParcel(request: NextRequest, lat: number, lng: number, parcel: TexasParcel) {
  return recordSearchFollowUp({
    headers: request.headers,
    lat,
    lng,
    parcelId: parcel.propertyId ? String(parcel.propertyId) : null,
    county: parcel.county ?? null,
    acres: parcel.legalArea ?? null,
    marketValue: parcel.marketValue ?? null,
  });
}
