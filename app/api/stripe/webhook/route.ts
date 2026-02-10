import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';
import { notifyAdmin } from '@/lib/notify';
import { getAgentByEmail, updateAgent } from '@/lib/agent-storage';

// Stripe sends raw body, so we need to handle it manually
export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  // If no webhook secret is set, just acknowledge (dev mode)
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;

  try {
    if (webhookSecret && signature) {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } else {
      // In development without webhook secret, parse the event directly
      event = JSON.parse(body) as Stripe.Event;
      console.warn('⚠️ Stripe webhook received without signature verification');
    }
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const tier = session.metadata?.tier;
        const customerEmail = session.customer_email || session.metadata?.customer_email;
        const customerName = session.metadata?.customer_name;

        console.log('✅ Checkout completed:', {
          id: session.id,
          email: customerEmail,
          tier,
          amount: session.amount_total,
          mode: session.mode,
        });

        if (tier === 'single') {
          // $14.99 one-time report purchase
          notifyAdmin('report_purchased', {
            name: customerName,
            email: customerEmail || undefined,
            county: session.metadata?.county,
            amount: session.amount_total || 1499,
            tier: 'single',
          });
        } else if (tier === 'unlimited') {
          // $29.99/mo unlimited subscription
          notifyAdmin('unlimited_signup', {
            name: customerName,
            email: customerEmail || undefined,
            amount: session.amount_total || 2999,
            tier: 'unlimited',
          });
        } else if (tier === 'agent') {
          // Agent subscription — update agent record
          notifyAdmin('agent_trial_started', {
            agentName: customerName,
            agentEmail: customerEmail || undefined,
            tier: 'agent',
          });

          // Update agent's Stripe customer ID
          if (customerEmail) {
            const agent = await getAgentByEmail(customerEmail);
            if (agent) {
              const customerId = typeof session.customer === 'string'
                ? session.customer
                : session.customer?.id;
              await updateAgent(agent.id, {
                subscription: {
                  ...agent.subscription,
                  status: 'trial',
                  stripeCustomerId: customerId || undefined,
                  currentPeriodEnd: undefined,
                },
              });
            }
          }
        } else {
          // Generic purchase notification
          notifyAdmin('report_purchased', {
            name: customerName,
            email: customerEmail || undefined,
            amount: session.amount_total || 0,
            tier: tier || 'unknown',
          });
        }
        break;
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('✅ Subscription created:', {
          id: subscription.id,
          tier: subscription.metadata?.tier,
          status: subscription.status,
        });
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const tier = subscription.metadata?.tier;

        // Check if agent trial converted to active
        if (tier === 'agent' && subscription.status === 'active') {
          // Find agent by looking up Stripe customer email
          const customerId = typeof subscription.customer === 'string'
            ? subscription.customer
            : subscription.customer?.id || '';
          
          if (customerId) {
            try {
              const customer = await stripe.customers.retrieve(customerId);
              if (customer && !customer.deleted && 'email' in customer && customer.email) {
                const agent = await getAgentByEmail(customer.email);
                if (agent && agent.subscription?.status === 'trial') {
                  // Trial → Active conversion
                  notifyAdmin('agent_trial_converted', {
                    agentName: agent.name,
                    agentEmail: agent.email,
                    tier: 'agent',
                  });

                  await updateAgent(agent.id, {
                    subscription: {
                      ...agent.subscription,
                      status: 'active',
                      currentPeriodEnd: new Date((subscription as unknown as { current_period_end: number }).current_period_end * 1000).toISOString(),
                    },
                  });
                }
              }
            } catch (err) {
              console.error('Error looking up customer for trial conversion:', err);
            }
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('⚠️ Subscription cancelled:', {
          id: subscription.id,
          tier: subscription.metadata?.tier,
        });

        // Update agent status if agent subscription
        if (subscription.metadata?.tier === 'agent') {
          const customerId = typeof subscription.customer === 'string'
            ? subscription.customer
            : subscription.customer?.id || '';
          if (customerId) {
            try {
              const customer = await stripe.customers.retrieve(customerId);
              if (customer && !customer.deleted && 'email' in customer && customer.email) {
                const agent = await getAgentByEmail(customer.email);
                if (agent) {
                  await updateAgent(agent.id, {
                    subscription: {
                      ...agent.subscription,
                      status: 'cancelled',
                    },
                  });
                }
              }
            } catch (err) {
              console.error('Error updating cancelled agent:', err);
            }
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error('Webhook handler error:', err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
