const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'hello@beeexemption.com';
const ADMIN_EMAIL = 'chris@beekings.com';

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

function buildSubject(event: NotifyEvent, data: NotifyData): string {
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
  const timestamp = new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' });
  
  const rows = Object.entries(data)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => {
      const label = k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
      return `<tr><td style="padding:6px 12px;color:#6B7280;font-size:14px;border-bottom:1px solid #f1f5f9;">${label}</td><td style="padding:6px 12px;color:#053249;font-size:14px;font-weight:600;border-bottom:1px solid #f1f5f9;">${v}</td></tr>`;
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
      <table style="width:100%;border-collapse:collapse;">${rows}</table>
      <p style="color:#8DA4B5;font-size:12px;margin:20px 0 0;text-align:center;">${timestamp} CST</p>
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

  const lines = [`${emoji} *${label}*`, ''];
  
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
  lines.push(`⏰ ${new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' })}`);

  return lines.join('\n');
}

/**
 * Send admin notification via email (Resend) and Telegram.
 * Fire-and-forget — never throws, never blocks.
 */
export function notifyAdmin(event: NotifyEvent, data: NotifyData): void {
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
        subject: buildSubject(event, data),
        html: buildEmailBody(event, data),
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
        text: buildTelegramText(event, data),
        parse_mode: 'Markdown',
      }),
    }).catch(() => { /* silent */ });
  }
}
