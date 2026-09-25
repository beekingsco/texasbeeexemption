import { clientIpFromHeaders, decodeGeoHeader } from '@/lib/address-search';
import { entryPoint, externalReferrer, leadAttribution, SITE_SOURCE } from '@/lib/lead-source';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'hello@beeexemption.com';
const ADMIN_EMAIL = 'chris@beekings.com';

const LEAD_SUBJECT_EVENTS = new Set<NotifyEvent>(['new_lead_captured', 'guide_downloaded']);

type NotifyEvent =
  | 'address_searched'
  | 'guide_downloaded'
  | 'report_purchased'
  | 'unlimited_signup'
  | 'agent_trial_started'
  | 'agent_trial_converted'
  | 'new_lead_captured';

interface NotifyData {
  email?: string;
  name?: string;
  address?: string;
  county?: string;
  estimatedSavings?: number;
  acres?: number;
  amount?: number;
  agentName?: string;
  agentEmail?: string;
  tier?: string;
  [key: string]: unknown;
}

function formatMoney(cents: number): string {
  return '$' + (cents / 100).toFixed(2);
}

function escapeHtml(value: unknown): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function oneLine(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

function sourceOf(data: NotifyData): string {
  return typeof data.source === 'string' && data.source.trim() ? data.source.trim() : SITE_SOURCE;
}

function entryOf(data: NotifyData): string {
  return typeof data.entry === 'string' && data.entry.trim() ? data.entry.trim() : 'direct';
}

function leadName(data: NotifyData): string {
  if (typeof data.name === 'string' && data.name.trim()) return oneLine(data.name);
  if (typeof data.agentName === 'string' && data.agentName.trim()) return oneLine(data.agentName);
  if (typeof data.email === 'string' && data.email.trim()) return oneLine(data.email);
  return 'Unknown';
}

const VISITOR_KEYS = new Set(['source', 'entry', 'city', 'region', 'country', 'ip']);

/** America/Chicago wall time with CST or CDT, whichever is in effect. */
export function centralTimeLabel(date = new Date()): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZoneName: 'short',
  }).format(date);
}

function shown(value: unknown): string {
  return typeof value === 'string' && value.trim() ? value.trim() : 'unknown';
}

function buildSubject(event: NotifyEvent, data: NotifyData): string {
  const source = sourceOf(data);
  if (LEAD_SUBJECT_EVENTS.has(event)) {
    return `Bee exemption lead [${source}]: ${leadName(data)}`;
  }
  const base = subjectFor(event, data);
  return base.includes(`[${source}]`) ? base : `${base} [${source}]`;
}

function subjectFor(event: NotifyEvent, data: NotifyData): string {
  switch (event) {
    case 'address_searched':
      return `🔍 New Search: ${data.address || data.county || 'Unknown'}`;
    case 'guide_downloaded':
      return `📥 Guide Downloaded: ${data.name || data.email || 'Unknown'} — ${data.county || 'Unknown'} County`;
    case 'report_purchased':
      return `💰 Report Sold! ${formatMoney(data.amount || 1499)} — ${data.name || data.email || 'Unknown'}`;
    case 'unlimited_signup':
      return `🎉 New Unlimited Sub! ${formatMoney(data.amount || 2999)}/mo — ${data.name || data.email || 'Unknown'}`;
    case 'agent_trial_started':
      return `🐝 New Agent Trial: ${data.agentName || data.agentEmail || 'Unknown'}`;
    case 'agent_trial_converted':
      return `✅ Agent Converted! ${data.agentName || data.agentEmail || 'Unknown'} is now paying`;
    case 'new_lead_captured':
      return `📋 New Lead: ${data.name || 'Unknown'} — ${data.county || 'Unknown'} County`;
    default:
      return `BeeExemption Event: ${event}`;
  }
}

function buildEmailBody(event: NotifyEvent, data: NotifyData): string {
  const timestamp = centralTimeLabel();
  const source = escapeHtml(shown(sourceOf(data)));
  const entry = escapeHtml(shown(entryOf(data)));
  const city = escapeHtml(shown(data.city));
  const region = escapeHtml(shown(data.region));
  const country = escapeHtml(shown(data.country));
  const ip = escapeHtml(shown(data.ip));
  
  const rows = Object.entries(data)
    .filter(([k, v]) => !VISITOR_KEYS.has(k) && v !== undefined && v !== null && v !== '')
    .map(([k, v]) => {
      const label = k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
      return `<tr><td style="padding:6px 12px;color:#6B7280;font-size:14px;border-bottom:1px solid #f1f5f9;">${escapeHtml(label)}</td><td style="padding:6px 12px;color:#053249;font-size:14px;font-weight:600;border-bottom:1px solid #f1f5f9;">${escapeHtml(v)}</td></tr>`;
    })
    .join('');

  const eventLabels: Record<NotifyEvent, string> = {
    address_searched: '🔍 Address Searched',
    guide_downloaded: '📥 Guide Downloaded',
    report_purchased: '💰 Report Purchased',
    unlimited_signup: '🎉 Unlimited Subscription',
    agent_trial_started: '🐝 Agent Free Trial',
    agent_trial_converted: '✅ Agent Converted to Paid',
    new_lead_captured: '📋 New Lead Captured',
  };

  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#EDF6FF;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="background:#053249;border-radius:16px 16px 0 0;padding:24px;text-align:center;">
      <h1 style="color:#fff;font-size:20px;font-weight:800;margin:0;">🐝 BeeExemption Alert</h1>
      <p style="color:#8DA4B5;font-size:13px;margin:4px 0 0;">${eventLabels[event] || event}</p>
    </div>
    <div style="background:#fff;padding:24px;border-radius:0 0 16px 16px;">
      <div style="background:#F4F8FB;border:1px solid #D6E4EE;border-radius:10px;padding:12px 14px;margin:0 0 16px;">
        <p style="margin:0;font-size:16px;font-weight:800;color:#053249;">Source: ${source}</p>
        <p style="margin:6px 0 0;font-size:16px;font-weight:800;color:#053249;">Entry: ${entry}</p>
        <p style="margin:6px 0 0;font-size:14px;font-weight:700;color:#053249;">City: ${city}</p>
        <p style="margin:4px 0 0;font-size:14px;font-weight:700;color:#053249;">Region: ${region}</p>
        <p style="margin:4px 0 0;font-size:14px;font-weight:700;color:#053249;">Country: ${country}</p>
        <p style="margin:4px 0 0;font-size:14px;font-weight:700;color:#053249;">IP: ${ip}</p>
      </div>
      <table style="width:100%;border-collapse:collapse;">${rows}</table>
      <p style="color:#8DA4B5;font-size:12px;margin:20px 0 0;text-align:center;">${timestamp}</p>
    </div>
  </div>
</body>
</html>`;
}

function buildTelegramText(event: NotifyEvent, data: NotifyData): string {
  const emojiMap: Record<NotifyEvent, string> = {
    address_searched: '🔍',
    guide_downloaded: '📥',
    report_purchased: '💰',
    unlimited_signup: '🎉',
    agent_trial_started: '🐝',
    agent_trial_converted: '✅',
    new_lead_captured: '📋',
  };

  const labelMap: Record<NotifyEvent, string> = {
    address_searched: 'Address Searched',
    guide_downloaded: 'Guide Downloaded',
    report_purchased: 'Report Purchased',
    unlimited_signup: 'Unlimited Signup',
    agent_trial_started: 'Agent Trial Started',
    agent_trial_converted: 'Agent Converted',
    new_lead_captured: 'New Lead',
  };

  const emoji = emojiMap[event] || '📣';
  const label = labelMap[event] || event;

  const lines = [
    `${emoji} *${label}*`,
    '',
    `Source: ${shown(sourceOf(data))}`,
    `Entry: ${shown(entryOf(data))}`,
    `City: ${shown(data.city)}`,
    `Region: ${shown(data.region)}`,
    `Country: ${shown(data.country)}`,
    `IP: ${shown(data.ip)}`,
    '',
  ];
  
  if (data.name) lines.push(`👤 ${data.name}`);
  if (data.email) lines.push(`📧 ${data.email}`);
  if (data.address) lines.push(`📍 ${data.address}`);
  if (data.county) lines.push(`🗺️ ${data.county} County`);
  if (data.acres) lines.push(`🏡 ${data.acres} acres`);
  if (data.estimatedSavings) lines.push(`💵 Est. savings: $${data.estimatedSavings.toLocaleString()}`);
  if (data.amount) lines.push(`💰 Amount: ${formatMoney(data.amount)}`);
  if (data.agentName) lines.push(`🐝 Agent: ${data.agentName}`);
  if (data.agentEmail) lines.push(`📧 Agent: ${data.agentEmail}`);
  if (data.tier) lines.push(`📦 Tier: ${data.tier}`);

  lines.push('');
  lines.push(`⏰ ${centralTimeLabel()}`);

  return lines.join('\n');
}

/**
 * Send admin notification via email (Resend) and Telegram.
 * Fire-and-forget — never throws, never blocks.
 */
type RequestLike = {
  headers: { get(name: string): string | null };
  cookies: { get(name: string): { value: string } | undefined };
};

/** Stamps this site's source and the visit entry point, then sends the alert. */
export function notifyFromRequest(request: RequestLike, event: NotifyEvent, data: NotifyData): void {
  const attribution = leadAttribution(request);
  const bodyReferrer = typeof data.referrer === 'string' ? data.referrer : null;
  const referrer = attribution.context.referrer || externalReferrer(bodyReferrer);
  const entry = entryPoint({
    utmSource: attribution.context.utmSource,
    utmMedium: attribution.context.utmMedium,
    utmCampaign: attribution.context.utmCampaign,
    src: attribution.context.src,
    referrer,
  });
  notifyAdmin(event, {
    ...data,
    source: attribution.source,
    entry: entry.label,
    city: decodeGeoHeader(request.headers.get('x-vercel-ip-city')) || undefined,
    region: decodeGeoHeader(request.headers.get('x-vercel-ip-country-region')) || undefined,
    country: decodeGeoHeader(request.headers.get('x-vercel-ip-country')) || undefined,
    ip: clientIpFromHeaders(request.headers) || undefined,
  });
}

export function notifyAdmin(event: NotifyEvent, data: NotifyData): void {
  const stamped: NotifyData = {
    ...data,
    source: sourceOf(data),
    entry: entryOf(data),
  };
  // Email via Resend (fire-and-forget)
  if (RESEND_API_KEY) {
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `BeeExemption Alerts <${FROM_EMAIL}>`,
        to: [ADMIN_EMAIL],
        subject: buildSubject(event, stamped),
        html: buildEmailBody(event, stamped),
      }),
    }).catch(() => { /* silent */ });
  }

  // Telegram via bot (fire-and-forget)
  const tgBotToken = process.env.TG_BOT_TOKEN;
  const tgChatId = process.env.TG_ALERT_CHAT_ID;
  if (tgBotToken && tgChatId) {
    fetch(`https://api.telegram.org/bot${tgBotToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: tgChatId,
        text: buildTelegramText(event, stamped),
        parse_mode: 'Markdown',
      }),
    }).catch(() => { /* silent */ });
  }
}
