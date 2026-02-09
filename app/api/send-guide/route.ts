import { NextRequest, NextResponse } from 'next/server';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'hello@beeexemption.com';

interface GuideEmailRequest {
  to: string;
  firstName: string;
  county: string;
  estimatedSavings: number;
  acres: number;
  requiredHives: number;
  guideUrl: string;
}

function buildGuideEmail(data: GuideEmailRequest): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your ${data.county} County Bee Exemption Guide</title>
</head>
<body style="margin:0;padding:0;background:#EDF6FF;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
    
    <!-- Header -->
    <div style="background:#053249;border-radius:16px 16px 0 0;padding:32px;text-align:center;">
      <h1 style="color:#ffffff;font-size:24px;font-weight:800;margin:0 0 8px;">🐝 Your Bee Exemption Guide</h1>
      <p style="color:#8DA4B5;font-size:14px;margin:0;">${data.county} County, Texas</p>
    </div>
    
    <!-- Savings Banner -->
    <div style="background:#1C7CE5;padding:24px;text-align:center;">
      <p style="color:rgba(255,255,255,0.8);font-size:13px;font-weight:600;margin:0 0 4px;text-transform:uppercase;letter-spacing:1px;">Estimated Annual Savings</p>
      <p style="color:#ffffff;font-size:48px;font-weight:900;margin:0;line-height:1;">$${data.estimatedSavings.toLocaleString()}</p>
      <p style="color:rgba(255,255,255,0.8);font-size:14px;margin:8px 0 0;">per year on property taxes</p>
    </div>
    
    <!-- Body -->
    <div style="background:#ffffff;padding:32px;border-radius:0 0 16px 16px;">
      <p style="color:#053249;font-size:16px;line-height:1.6;margin:0 0 20px;">
        Hi ${data.firstName},
      </p>
      <p style="color:#6B7280;font-size:15px;line-height:1.6;margin:0 0 20px;">
        Thanks for using the Bee Exemption Calculator! Based on your property in <strong style="color:#053249;">${data.county} County</strong>, 
        here's what you need to know about qualifying for a beekeeping agricultural exemption.
      </p>
      
      <!-- Quick Facts -->
      <div style="background:#F8FAFC;border-radius:12px;padding:20px;margin:0 0 24px;">
        <h3 style="color:#053249;font-size:15px;font-weight:700;margin:0 0 12px;">📋 Your Property Summary</h3>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:6px 0;color:#6B7280;font-size:14px;">Property Size</td>
            <td style="padding:6px 0;color:#053249;font-size:14px;font-weight:700;text-align:right;">${data.acres} acres</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6B7280;font-size:14px;">Hives Required</td>
            <td style="padding:6px 0;color:#053249;font-size:14px;font-weight:700;text-align:right;">${data.requiredHives} hives</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6B7280;font-size:14px;">County</td>
            <td style="padding:6px 0;color:#053249;font-size:14px;font-weight:700;text-align:right;">${data.county} County</td>
          </tr>
          <tr style="border-top:1px solid #e2e8f0;">
            <td style="padding:10px 0 6px;color:#249241;font-size:15px;font-weight:700;">Annual Savings</td>
            <td style="padding:10px 0 6px;color:#249241;font-size:15px;font-weight:700;text-align:right;">$${data.estimatedSavings.toLocaleString()}/yr</td>
          </tr>
        </table>
      </div>

      <!-- CTA Button -->
      <div style="text-align:center;margin:0 0 24px;">
        <a href="${data.guideUrl}" style="display:inline-block;background:#57C975;color:#ffffff;font-weight:700;font-size:16px;padding:14px 32px;border-radius:12px;text-decoration:none;">
          📋 View Your Full ${data.county} County Guide
        </a>
      </div>
      
      <!-- Next Steps -->
      <h3 style="color:#053249;font-size:15px;font-weight:700;margin:0 0 12px;">What's Next?</h3>
      <ol style="color:#6B7280;font-size:14px;line-height:1.8;padding-left:20px;margin:0 0 24px;">
        <li><strong style="color:#053249;">Read your county guide</strong> — specific requirements, deadlines, and filing instructions</li>
        <li><strong style="color:#053249;">Get your hives set up</strong> — BeeKings provides equipment, bees, and training</li>
        <li><strong style="color:#053249;">File with your county</strong> — apply for agricultural appraisal with your CAD</li>
        <li><strong style="color:#053249;">Start saving</strong> — enjoy reduced property taxes every year</li>
      </ol>
      
      <!-- Contact -->
      <div style="background:#EDF6FF;border-radius:12px;padding:20px;text-align:center;">
        <p style="color:#053249;font-size:15px;font-weight:700;margin:0 0 8px;">Ready to get started?</p>
        <p style="color:#6B7280;font-size:14px;margin:0 0 16px;">BeeKings provides everything you need: hives, bees, equipment, and hands-on training.</p>
        <a href="mailto:info@beekings.com" style="color:#1C7CE5;font-weight:600;font-size:14px;text-decoration:none;">info@beekings.com</a>
        <span style="color:#6B7280;margin:0 8px;">·</span>
        <a href="https://beekings.com" style="color:#1C7CE5;font-weight:600;font-size:14px;text-decoration:none;">beekings.com</a>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="text-align:center;padding:24px 16px;">
      <p style="color:#8DA4B5;font-size:12px;margin:0 0 4px;">
        © ${new Date().getFullYear()} BeeKings · Canton, Texas
      </p>
      <p style="color:#8DA4B5;font-size:11px;margin:0;">
        Estimates based on county tax data. Actual savings depend on your property and CAD approval.
      </p>
    </div>
  </div>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  if (!RESEND_API_KEY) {
    return NextResponse.json({ error: 'Email not configured' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { to, firstName, county, estimatedSavings, acres, requiredHives } = body;

    if (!to || !firstName || !county) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const guideUrl = `https://beeexemption.com/guide?county=${encodeURIComponent(county)}`;

    const html = buildGuideEmail({
      to,
      firstName,
      county,
      estimatedSavings: estimatedSavings || 0,
      acres: acres || 0,
      requiredHives: requiredHives || 6,
      guideUrl,
    });

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `Bee Exemption <${FROM_EMAIL}>`,
        to: [to],
        subject: `Your ${county} County Bee Exemption Guide — Save $${(estimatedSavings || 0).toLocaleString()}/yr`,
        html,
      }),
    });

    const result = await resp.json();

    if (!resp.ok) {
      console.error('Resend error:', result);
      return NextResponse.json({ error: 'Failed to send email', details: result }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: result.id });
  } catch (error) {
    console.error('Email send error:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
