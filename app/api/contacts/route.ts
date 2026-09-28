import { NextRequest, NextResponse } from 'next/server';
import { forwardToWebhook } from '@/lib/storage';
import { notifyFromRequest } from '@/lib/notify';
import { CONTACT_SEARCH_REUSE_MS, logAddressSearch, recordSearchFollowUp } from '@/lib/address-search-log';
import { externalReferrer, leadAttribution } from '@/lib/lead-source';
import { readServerSearchContext } from '@/lib/search-attribution';
import { clientIpFromHeaders } from '@/lib/address-search';
import { claimSearchAlert } from '@/lib/search-alert-dedupe';
import {
  findBeeContact,
  findBeeContactBySession,
  listBeeContacts,
  saveBeeContact,
  type BeeContact as Contact,
} from '@/lib/bee-store';

function scoreContact(c: Contact): { score: number; tier: 'hot' | 'warm' | 'curious' | 'unknown'; tags: string[] } {
  let score = 0;
  const tags: string[] = [];

  if (c.acres && c.acres >= 5) { score += 15; tags.push('qualifying-acreage'); }
  if (c.acres && c.acres >= 10) { score += 10; tags.push('large-property'); }
  if (c.marketValue && c.marketValue >= 100000) { score += 10; tags.push('high-value'); }
  if (c.estimatedSavings && c.estimatedSavings >= 3000) { score += 15; tags.push('high-savings'); }
  if (c.ownerName && c.ownerName.length > 0) { score += 5; }

  if (c.viewedResults) { score += 10; }
  if (c.viewedDetails) { score += 5; }
  if (c.adjustedEstimate) { score += 15; tags.push('customized-estimate'); }
  if (c.startedSignup) { score += 20; tags.push('started-signup'); }
  if (c.completedSignup) { score += 25; tags.push('completed-signup'); }
  if (c.viewedGuide) { score += 10; tags.push('viewed-guide'); }
  if (c.timeOnResultsMs > 30000) { score += 10; tags.push('engaged-reader'); }
  if (c.timeOnResultsMs > 60000) { score += 10; tags.push('deep-engagement'); }
  if (c.searchCount > 1) { score += 10; tags.push('repeat-searcher'); }

  if (c.referrer) {
    if (c.referrer.includes('facebook') || c.referrer.includes('instagram')) { tags.push('social-media'); }
    if (c.referrer.includes('google') || c.referrer.includes('bing')) { tags.push('search-engine'); score += 5; }
    if (c.referrer.includes('zillow') || c.referrer.includes('realtor') || c.referrer.includes('redfin')) { 
      tags.push('real-estate-referral'); score += 15; 
    }
  }

  const ua = c.userAgent.toLowerCase();
  if (ua.includes('bot') || ua.includes('crawl') || ua.includes('spider') || ua.includes('headless')) {
    score = Math.max(0, score - 50);
    tags.push('bot-suspected');
  }

  let tier: 'hot' | 'warm' | 'curious' | 'unknown' = 'unknown';
  if (score >= 60) tier = 'hot';
  else if (score >= 30) tier = 'warm';
  else if (score >= 10) tier = 'curious';

  return { score, tier, tags };
}

// ── POST — track a search or update engagement ──
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'search') {
      const { address, lat, lng, ownerName, acres, marketValue, landValue,
              improvementValue, estimatedSavings, requiredHives, sessionId, referrer } = body;
      const parish = typeof body.parish === 'string' ? body.parish : '';
      const state = typeof body.state === 'string' ? body.state : '';
      const county = (typeof body.county === 'string' && body.county.trim())
        ? body.county
        : parish;

      const parcelStatus = typeof body.parcelStatus === 'string' ? body.parcelStatus : '';
      const alertKey = (typeof address === 'string' && address.trim())
        ? address
        : [county, body.acres, body.marketValue].filter((part) => part != null && part !== '').join(' ');
      const sendAlert = await claimSearchAlert(alertKey, clientIpFromHeaders(req.headers));
      let contact = await findBeeContact(address || null, sessionId || null);

      if (contact) {
        contact.searchCount += 1;
        contact.lastSeen = new Date().toISOString();
        if (address) contact.address = address;
        if (county) contact.county = county;
        if (lat) contact.lat = lat;
        if (lng) contact.lng = lng;
        if (ownerName) contact.ownerName = ownerName;
        if (acres) contact.acres = acres;
        if (marketValue) contact.marketValue = marketValue;
        if (landValue) contact.landValue = landValue;
        if (improvementValue) contact.improvementValue = improvementValue;
        if (estimatedSavings) contact.estimatedSavings = estimatedSavings;
        if (requiredHives) contact.requiredHives = requiredHives;
      } else {
        contact = {
          id: `ct_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          address: address || '',
          county: county || '',
          lat: lat || null,
          lng: lng || null,
          ownerName: ownerName || '',
          acres: acres || null,
          marketValue: marketValue || null,
          landValue: landValue || null,
          improvementValue: improvementValue || null,
          estimatedSavings: estimatedSavings || null,
          requiredHives: requiredHives || null,
          searchCount: 1,
          viewedResults: false,
          viewedDetails: false,
          adjustedEstimate: false,
          startedSignup: false,
          completedSignup: false,
          viewedGuide: false,
          timeOnResultsMs: 0,
          score: 0,
          tier: 'unknown',
          tags: [],
          referrer: referrer || req.headers.get('referer') || '',
          userAgent: (req.headers.get('user-agent') || '').slice(0, 200),
          sessionId: sessionId || '',
          firstSeen: new Date().toISOString(),
          lastSeen: new Date().toISOString(),
          email: '',
          phone: '',
          firstName: '',
          lastName: '',
          state: state || '',
          parcelStatus,
        };
      }
      contact.state = state || contact.state;
      if (parcelStatus) contact.parcelStatus = parcelStatus;

      const scoring = scoreContact(contact);
      contact.score = scoring.score;
      contact.tier = scoring.tier;
      contact.tags = scoring.tags;

      let stored = true;
      try {
        await saveBeeContact(contact);
      } catch (error) {
        stored = false;
        console.error('contact save failed', error);
      }

      await forwardToWebhook('contact_search', contact as unknown as Record<string, unknown>);

      const attribution = leadAttribution(req);
      const visitReferrer = attribution.context.referrer
        || externalReferrer(typeof referrer === 'string' ? referrer : null);
      await logAddressSearch({
        rawAddress: contact.address || contact.county || '',
        normalizedAddress: contact.address || null,
        lat: contact.lat,
        lng: contact.lng,
        state: state || null,
        county: contact.county,
        acres: contact.acres,
        marketValue: contact.marketValue,
        savingsShown: contact.estimatedSavings,
        resultShown: contact.address ? 'searched' : (contact.county ? 'county_only' : null),
        context: { ...attribution.context, referrer: visitReferrer },
        userAgent: req.headers.get('user-agent'),
        headers: req.headers,
      }, { reuseRecentMs: CONTACT_SEARCH_REUSE_MS });

      if (sendAlert) {
        await notifyFromRequest(req, 'address_searched', {
          address: contact.address,
          county: contact.county,
          state: state || undefined,
          parcelStatus: parcelStatus || undefined,
          acres: contact.acres || undefined,
          estimatedSavings: contact.estimatedSavings || undefined,
          referrer: visitReferrer || undefined,
        });
      }

      return NextResponse.json({ ok: true, id: contact.id, tier: contact.tier, stored });
    }

    if (action === 'engage') {
      const { sessionId, event, timeMs } = body;
      if (sessionId) {
        const contact = await findBeeContactBySession(sessionId);
        if (contact) {
          contact.lastSeen = new Date().toISOString();
          if (event === 'viewed_results') contact.viewedResults = true;
          if (event === 'viewed_details') contact.viewedDetails = true;
          if (event === 'adjusted_estimate') contact.adjustedEstimate = true;
          if (event === 'started_signup') contact.startedSignup = true;
          if (event === 'completed_signup') contact.completedSignup = true;
          if (event === 'viewed_guide') contact.viewedGuide = true;
          if (event === 'time_on_results' && timeMs) contact.timeOnResultsMs += timeMs;
          const scoring = scoreContact(contact);
          contact.score = scoring.score;
          contact.tier = scoring.tier;
          contact.tags = scoring.tags;
          await saveBeeContact(contact);
        }
      }
      return NextResponse.json({ ok: true });
    }

    if (action === 'identify') {
      const { sessionId, firstName, lastName, email, phone } = body;
      if (sessionId) {
        const contact = await findBeeContactBySession(sessionId);
        if (contact) {
          if (firstName) contact.firstName = firstName;
          if (lastName) contact.lastName = lastName;
          if (email) contact.email = email;
          if (phone) contact.phone = phone;
          contact.completedSignup = true;
          contact.lastSeen = new Date().toISOString();
          const scoring = scoreContact(contact);
          contact.score = scoring.score;
          contact.tier = scoring.tier;
          contact.tags = scoring.tags;
          await saveBeeContact(contact);
        }
      }
      const context = readServerSearchContext(req);
      await recordSearchFollowUp({
        sessionId: context.sessionId,
        email: typeof email === 'string' ? email : null,
        phone: typeof phone === 'string' ? phone : null,
        headers: req.headers,
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Contact tracking error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// ── GET — view contacts (admin, requires key) ──
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const { checkAdminAuth } = await import('@/lib/admin-auth');
  if (!checkAdminAuth(req).authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const contacts = await listBeeContacts();

  const tier = searchParams.get('tier');
  const format = searchParams.get('format');

  let filtered = tier ? contacts.filter(c => c.tier === tier) : contacts;
  filtered = filtered.sort((a, b) => b.score - a.score);

  // CSV export
  if (format === 'csv') {
    const headers = 'Owner Name,Address,County,Acres,Market Value,Est. Savings,Score,Tier,Email,Phone,First Seen,Last Seen,Tags';
    const rows = filtered.map(c => 
      [c.ownerName, c.address, c.county, c.acres || '', c.marketValue || '', c.estimatedSavings || '',
       c.score, c.tier, c.email, c.phone, c.firstSeen, c.lastSeen, c.tags.join(';')
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
    );
    const csv = [headers, ...rows].join('\n');
    return new NextResponse(csv, {
      headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename=beekings-contacts.csv' },
    });
  }

  // Summary stats
  const stats = {
    total: contacts.length,
    hot: contacts.filter(c => c.tier === 'hot').length,
    warm: contacts.filter(c => c.tier === 'warm').length,
    curious: contacts.filter(c => c.tier === 'curious').length,
    withEmail: contacts.filter(c => c.email).length,
    avgScore: contacts.length > 0 ? Math.round(contacts.reduce((s, c) => s + c.score, 0) / contacts.length) : 0,
  };

  return NextResponse.json({ stats, contacts: filtered });
}
