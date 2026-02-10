import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/auth-tokens';
import { getAgentById } from '@/lib/agent-storage';
import { stripe } from '@/lib/stripe';

export async function GET(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get('bee_session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const agentId = verifySessionToken(sessionCookie);
    if (!agentId) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const agent = await getAgentById(agentId);
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const customerId = agent.subscription?.stripeCustomerId;
    if (!customerId) {
      return NextResponse.json({ invoices: [] });
    }

    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit: 10,
    });

    const mapped = invoices.data.map(invoice => ({
      id: invoice.id,
      date: invoice.created * 1000,
      description: invoice.lines.data[0]?.description || 'Agent Partner Plan',
      amount: (invoice.amount_paid / 100).toFixed(2),
      status: invoice.status,
      invoiceUrl: invoice.hosted_invoice_url,
    }));

    return NextResponse.json({ invoices: mapped });
  } catch (error) {
    console.error('Billing history error:', error);
    return NextResponse.json({ error: 'Failed to fetch billing history' }, { status: 500 });
  }
}
