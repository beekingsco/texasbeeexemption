#!/usr/bin/env node
/**
 * TX Property Tax Twitter Monitor
 * 
 * Searches Twitter API v2 for tweets about Texas property taxes, ag exemptions,
 * and beekeeping tax benefits. Scores tweets by engagement potential and generates
 * draft replies promoting beeexemption.com.
 * 
 * Zero dependencies — uses only Node.js built-in modules.
 * Requires Twitter API v2 Basic tier ($100/month) or higher for search access.
 * Free tier only supports tweet posting — NOT search.
 * 
 * Usage:
 *   node twitter-monitor.js                    # Run with default query rotation
 *   node twitter-monitor.js --query-index 0    # Run specific query (0-4)
 *   node twitter-monitor.js --all              # Run all queries
 *   node twitter-monitor.js --json             # Output JSON
 *   node twitter-monitor.js --dry-run          # Show what would run without API call
 * 
 * Environment variables (override AGENTS.md defaults):
 *   TWITTER_CONSUMER_KEY       OAuth 1.0a Consumer Key (API Key)
 *   TWITTER_CONSUMER_SECRET    OAuth 1.0a Consumer Secret (API Key Secret)
 *   TWITTER_ACCESS_TOKEN       OAuth 1.0a Access Token
 *   TWITTER_ACCESS_TOKEN_SECRET OAuth 1.0a Access Token Secret
 *   TWITTER_BEARER_TOKEN       OAuth 2.0 Bearer Token (alternative auth)
 */

const crypto = require('crypto');
const https = require('https');

// ─── Twitter API Credentials ───────────────────────────────────────────────────
// From AGENTS.md — the "API Key" is actually a Client ID (base64-encoded).
// The decoded consumer key is extracted below. Override with env vars if needed.

const RAW_CLIENT_ID = 'cTZaa1l2bEdVTlI4bWM2SDFzdlI6MTpjaQ';
const DECODED_CONSUMER_KEY = (() => {
  try {
    const decoded = Buffer.from(RAW_CLIENT_ID, 'base64').toString();
    // Twitter Client IDs decode to format: consumer_key:version:ci
    const parts = decoded.split(':');
    return parts[0]; // e.g., 'q6ZkYvlGUNR8mc6H1svR'
  } catch {
    return RAW_CLIENT_ID;
  }
})();

const CREDENTIALS = {
  consumerKey: process.env.TWITTER_CONSUMER_KEY || DECODED_CONSUMER_KEY,
  consumerSecret: process.env.TWITTER_CONSUMER_SECRET || 'SC9wB3gswKJEYYZLGR9EzyVXA4SP7sbdmcSpSljkZpnqZTBmIa',
  accessToken: process.env.TWITTER_ACCESS_TOKEN || '14747990-XvxwPloKE8scmyYLAwffpdvBlIHE4KgZmKsfnHaDf',
  accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET || 'RCyv4KJsoNok1976zqevMDRai47zRN5U7dkx487ykKid4',
  bearerToken: process.env.TWITTER_BEARER_TOKEN || null,
};

// ─── Search Queries (rotated) ──────────────────────────────────────────────────
const QUERIES = [
  '"texas property tax" -is:retweet lang:en',
  '"ag exemption" texas -is:retweet lang:en',
  '"property tax" texas bees OR beekeeping -is:retweet lang:en',
  '"property tax too high" texas -is:retweet lang:en',
  '"texas land tax" -is:retweet lang:en',
];

// ─── Draft Reply Templates ─────────────────────────────────────────────────────
const REPLY_TEMPLATES = [
  () =>
    `Have you looked into beekeeping ag exemptions? A lot of Texas landowners are saving 40-70% on property taxes that way. Worth checking out beeexemption.com if you haven't already 🐝`,
  () =>
    `Beekeeping ag exemptions are honestly one of the best-kept secrets in Texas. Can knock 40-70% off your property tax bill. beeexemption.com has the details if you're curious`,
  () =>
    `Texas beekeeping ag exemptions can save landowners 40-70% on property taxes. Surprisingly easy to qualify for too. beeexemption.com breaks it all down`,
  () =>
    `A friend of mine cut their TX property taxes by over 60% with a beekeeping ag exemption. Not kidding. beeexemption.com has info on how it works 🐝`,
  () =>
    `If you've got even a few acres in Texas, beekeeping ag exemptions can save 40-70% on property taxes. Seriously underrated strategy. Check beeexemption.com`,
  () =>
    `Beekeeping ag exemption might be worth a look — lots of TX landowners save 40-70% on property taxes with it. beeexemption.com has a good breakdown`,
  () =>
    `One word: bees 🐝 Texas beekeeping ag exemptions can save you 40-70% on property taxes. beeexemption.com explains how to qualify`,
  () =>
    `Have you considered a beekeeping ag exemption? It's saving Texas landowners 40-70% on property taxes. More info at beeexemption.com if you're interested`,
  () =>
    `The beekeeping ag exemption is how a lot of Texas landowners are quietly saving 40-70% on property taxes. beeexemption.com has the full rundown 🐝`,
  () =>
    `Bees + Texas land = serious tax savings. Beekeeping ag exemptions can cut property taxes 40-70%. beeexemption.com if you want the details`,
];

// ─── OAuth 1.0a Implementation ─────────────────────────────────────────────────

/**
 * Percent-encode per RFC 3986 (required by OAuth 1.0a / RFC 5849)
 */
function percentEncode(str) {
  return encodeURIComponent(String(str))
    .replace(/!/g, '%21')
    .replace(/\*/g, '%2A')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29');
}

/**
 * Generate a random nonce (32 hex chars)
 */
function generateNonce() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Build OAuth 1.0a Authorization header for a request.
 */
function buildOAuthHeader(method, baseUrl, queryParams) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = generateNonce();

  const oauthParams = {
    oauth_consumer_key: CREDENTIALS.consumerKey,
    oauth_token: CREDENTIALS.accessToken,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_nonce: nonce,
    oauth_version: '1.0',
  };

  // Merge query params + oauth params for signature base
  const allParams = {};
  for (const [k, v] of Object.entries(queryParams)) {
    allParams[k] = v;
  }
  for (const [k, v] of Object.entries(oauthParams)) {
    allParams[k] = v;
  }

  // Sort by key, then by value for duplicate keys
  const sortedKeys = Object.keys(allParams).sort();
  const paramString = sortedKeys
    .map((k) => `${percentEncode(k)}=${percentEncode(allParams[k])}`)
    .join('&');

  // Signature base string: METHOD&url&params
  const signatureBase = [
    method.toUpperCase(),
    percentEncode(baseUrl),
    percentEncode(paramString),
  ].join('&');

  // Signing key: consumerSecret&tokenSecret
  const signingKey = `${percentEncode(CREDENTIALS.consumerSecret)}&${percentEncode(CREDENTIALS.accessTokenSecret)}`;

  // HMAC-SHA1
  const signature = crypto
    .createHmac('sha1', signingKey)
    .update(signatureBase)
    .digest('base64');

  oauthParams.oauth_signature = signature;

  // Build header: OAuth key="value", ...
  const headerParts = Object.keys(oauthParams)
    .sort()
    .map((k) => `${percentEncode(k)}="${percentEncode(oauthParams[k])}"`)
    .join(', ');

  return `OAuth ${headerParts}`;
}

/**
 * Make an authenticated GET request to the Twitter API v2.
 * Uses Bearer token if available, otherwise OAuth 1.0a.
 */
function twitterGet(endpoint, params) {
  return new Promise((resolve, reject) => {
    const baseUrl = `https://api.twitter.com${endpoint}`;

    // Build query string
    const qsParts = Object.entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    const fullPath = `${endpoint}?${qsParts}`;

    // Choose auth method
    let authHeader;
    if (CREDENTIALS.bearerToken) {
      authHeader = `Bearer ${CREDENTIALS.bearerToken}`;
    } else {
      authHeader = buildOAuthHeader('GET', baseUrl, params);
    }

    const options = {
      hostname: 'api.twitter.com',
      path: fullPath,
      method: 'GET',
      headers: {
        Authorization: authHeader,
        'User-Agent': 'TXPropertyTaxMonitor/1.0',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsed;
        try {
          parsed = JSON.parse(data);
        } catch {
          parsed = { rawBody: data };
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: parsed,
        });
      });
    });

    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Request timed out after 15s'));
    });
    req.end();
  });
}

// ─── Tweet Scoring ─────────────────────────────────────────────────────────────

/**
 * Score a tweet by engagement potential for reply targeting.
 * Higher score = better candidate.
 * 
 * Criteria:
 * - Freshness (low reply count = less crowded)
 * - Moderate engagement (has audience but not overwhelming)
 * - Pain point keywords (expressing frustration or seeking help)
 * - Negative signals (already mentions us, is promotional)
 */
function scoreTweet(tweet) {
  const metrics = tweet.public_metrics || {};
  const likes = metrics.like_count || 0;
  const retweets = metrics.retweet_count || 0;
  const replies = metrics.reply_count || 0;
  const quotes = metrics.quote_count || 0;
  const text = (tweet.text || '').toLowerCase();

  let score = 0;

  // ── Freshness (fewer replies = our reply gets seen) ──
  if (replies === 0) score += 15;
  else if (replies <= 3) score += 10;
  else if (replies <= 10) score += 5;
  else score += 0; // too many replies

  // ── Engagement sweet spot ──
  if (likes >= 1 && likes <= 50) score += 10;
  else if (likes > 50 && likes <= 200) score += 15;
  else if (likes > 200) score += 8; // too big, reply gets lost

  if (retweets >= 1 && retweets <= 20) score += 8;
  else if (retweets > 20 && retweets <= 100) score += 12;

  if (quotes >= 1) score += 5;

  // ── Pain point keywords (strong signals) ──
  const strongPainPoints = [
    'too high', 'ridiculous', 'outrageous', 'crazy', 'insane',
    'can\'t afford', 'unaffordable', 'killing me', 'robbery',
  ];
  const moderatePainPoints = [
    'going up', 'increase', 'assessment', 'appraisal', 'protest',
    'unfair', 'overtaxed', 'overvalued',
  ];
  const helpSeeking = [
    'how to', 'any way', 'advice', 'tip', 'suggestion', 'help',
    'save', 'reduce', 'lower', 'cut', 'what can i do',
  ];
  const landKeywords = [
    'land', 'acre', 'ranch', 'farm', 'rural', 'homestead', 'property',
  ];

  for (const kw of strongPainPoints) {
    if (text.includes(kw)) score += 5;
  }
  for (const kw of moderatePainPoints) {
    if (text.includes(kw)) score += 3;
  }
  for (const kw of helpSeeking) {
    if (text.includes(kw)) score += 4;
  }
  for (const kw of landKeywords) {
    if (text.includes(kw)) score += 2;
  }

  // ── High-value topic signals ──
  if (text.includes('ag exemption') || text.includes('agricultural exemption')) score += 10;
  if (text.includes('bee') || text.includes('beekeep')) score += 12;
  if (text.includes('wildlife') || text.includes('timber')) score += 5;

  // ── Negative signals ──
  if (text.includes('beeexemption')) score -= 50; // already mentions us
  if (text.includes('sponsor') || text.includes('#ad') || text.includes('promoted')) score -= 20;
  if (text.includes('http') && text.includes('.com')) score -= 3; // already linking somewhere

  return Math.max(score, 0);
}

// ─── Reply Generation ──────────────────────────────────────────────────────────

/**
 * Generate a contextual draft reply. Picks from templates and
 * ensures the reply stays under 280 characters.
 */
function generateReply(tweet, username, index) {
  const template = REPLY_TEMPLATES[index % REPLY_TEMPLATES.length];
  let reply = template();

  // Ensure under 280 characters
  if (reply.length > 280) {
    reply = reply.substring(0, 277) + '...';
  }

  return reply;
}

// ─── Query Rotation ────────────────────────────────────────────────────────────

function getQueryIndex() {
  const args = process.argv.slice(2);
  const idxArg = args.indexOf('--query-index');
  if (idxArg !== -1 && args[idxArg + 1]) {
    const idx = parseInt(args[idxArg + 1], 10);
    if (!isNaN(idx) && idx >= 0 && idx < QUERIES.length) return idx;
  }
  // Time-based rotation: cycle through queries across hours
  const hour = new Date().getHours();
  return hour % QUERIES.length;
}

// ─── Telegram Markdown Formatting ──────────────────────────────────────────────

function formatResultsForTelegram(query, tweets, users, topTweets) {
  const userMap = {};
  if (users) {
    for (const u of users) {
      userMap[u.id] = u;
    }
  }

  let output = '';
  output += `🔍 **TX Property Tax Twitter Monitor**\n`;
  output += `📅 ${new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' })}\n`;
  output += `🔎 Query: \`${query}\`\n`;
  output += `📊 Found: ${tweets.length} tweets, showing top ${topTweets.length}\n`;
  output += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  if (topTweets.length === 0) {
    output += `No tweets found for this query.\n`;
    return output;
  }

  topTweets.forEach((tweet, i) => {
    const user = userMap[tweet.author_id] || {};
    const username = user.username || 'unknown';
    const name = user.name || 'Unknown';
    const tweetUrl = `https://x.com/${username}/status/${tweet.id}`;
    const metrics = tweet.public_metrics || {};
    const reply = generateReply(tweet, username, i);

    output += `**#${i + 1}** — Score: ${tweet._score}\n`;
    output += `👤 ${name} (@${username})\n`;
    output += `❤️ ${metrics.like_count || 0}  🔁 ${metrics.retweet_count || 0}  💬 ${metrics.reply_count || 0}\n`;
    output += `🔗 ${tweetUrl}\n\n`;
    output += `📝 **Tweet:**\n${tweet.text}\n\n`;
    output += `✏️ **Draft Reply** (${reply.length}/280 chars):\n${reply}\n`;
    output += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  });

  return output;
}

// ─── Error Diagnosis ───────────────────────────────────────────────────────────

function diagnoseError(response) {
  const status = response.statusCode;
  const data = response.data || {};
  const detail = data.detail || '';
  const title = data.title || '';
  const errors = data.errors || [];

  if (status === 401) {
    return {
      tier: 'Unknown (Auth Failed)',
      canSearch: false,
      message:
        `❌ **Authentication Failed (401)**\n\n` +
        `OAuth signature verification failed. This typically means:\n` +
        `• API keys/tokens are invalid, expired, or revoked\n` +
        `• The Twitter app may be suspended\n` +
        `• Keys may need to be regenerated at developer.twitter.com\n\n` +
        `💡 **Fix:** Set working credentials via environment variables:\n` +
        `\`\`\`\n` +
        `export TWITTER_CONSUMER_KEY="your_key"\n` +
        `export TWITTER_CONSUMER_SECRET="your_secret"\n` +
        `export TWITTER_ACCESS_TOKEN="your_token"\n` +
        `export TWITTER_ACCESS_TOKEN_SECRET="your_token_secret"\n` +
        `\`\`\`\n` +
        `Or use a Bearer token:\n` +
        `\`\`\`\n` +
        `export TWITTER_BEARER_TOKEN="your_bearer_token"\n` +
        `\`\`\`\n\n` +
        `Raw error: ${JSON.stringify(data)}`,
    };
  }

  if (status === 403) {
    // Check for Free tier restriction
    if (
      detail.includes('not permitted') ||
      detail.includes('not allowed') ||
      detail.includes('client-not-enrolled') ||
      errors.some(e => e.message && e.message.includes('not permitted'))
    ) {
      return {
        tier: 'Free',
        canSearch: false,
        message:
          `⚠️ **Twitter API Tier: FREE**\n\n` +
          `The \`/2/tweets/search/recent\` endpoint requires **Basic tier** ($100/month) or higher.\n\n` +
          `Free tier only supports:\n` +
          `• Tweet posting (POST /2/tweets)\n` +
          `• Tweet deletion\n` +
          `• Limited user lookup\n\n` +
          `To enable search, upgrade at:\n` +
          `https://developer.twitter.com/en/portal/products\n\n` +
          `Raw error: ${detail || JSON.stringify(data)}`,
      };
    }

    return {
      tier: 'Unknown',
      canSearch: false,
      message:
        `❌ **Forbidden (403)**\n\n` +
        `Access denied. Possible causes:\n` +
        `• App permissions insufficient\n` +
        `• Endpoint not available on your tier\n` +
        `• App suspended or restricted\n\n` +
        `Raw error: ${JSON.stringify(data)}`,
    };
  }

  if (status === 429) {
    const resetTime = response.headers['x-rate-limit-reset'];
    const resetDate = resetTime
      ? new Date(parseInt(resetTime) * 1000).toLocaleString('en-US', { timeZone: 'America/Chicago' })
      : 'unknown';
    return {
      tier: 'Basic+',
      canSearch: true,
      message:
        `⏳ **Rate Limited (429)**\n\n` +
        `Rate limit exceeded. Resets at: ${resetDate}\n` +
        `Basic tier: 60 requests/15 min for search.\n` +
        `Try again after the reset window.`,
    };
  }

  if (status >= 500) {
    return {
      tier: 'Unknown',
      canSearch: null,
      message:
        `🔥 **Twitter Server Error (${status})**\n\n` +
        `Twitter API is experiencing issues. Try again later.\n` +
        `Raw: ${JSON.stringify(data)}`,
    };
  }

  return null;
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const isJson = args.includes('--json');
  const runAll = args.includes('--all');
  const isDryRun = args.includes('--dry-run');
  const queryIndex = getQueryIndex();
  const query = QUERIES[queryIndex];

  const authMethod = CREDENTIALS.bearerToken ? 'OAuth 2.0 Bearer' : 'OAuth 1.0a';
  const maskedKey = CREDENTIALS.consumerKey
    ? CREDENTIALS.consumerKey.substring(0, 4) + '...' + CREDENTIALS.consumerKey.slice(-4)
    : 'none';

  console.log(`🐝 TX Property Tax Twitter Monitor`);
  console.log(`📅 ${new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' })}`);
  console.log(`🔐 Auth: ${authMethod} (key: ${maskedKey})`);
  console.log(`🔎 Query [${queryIndex + 1}/${QUERIES.length}]: ${query}`);
  if (runAll) console.log(`📋 Running ALL ${QUERIES.length} queries`);
  console.log('');

  if (isDryRun) {
    console.log('── DRY RUN MODE ──');
    console.log('Would search for:');
    const queries = runAll ? QUERIES : [query];
    queries.forEach((q, i) => console.log(`  ${i + 1}. ${q}`));
    console.log('\nSample draft replies:');
    REPLY_TEMPLATES.slice(0, 3).forEach((t, i) => {
      const reply = t();
      console.log(`  ${i + 1}. (${reply.length}/280) ${reply}`);
    });
    return;
  }

  const queriesToRun = runAll ? QUERIES : [query];
  let allOutput = '';
  let allTopTweets = [];

  for (let qi = 0; qi < queriesToRun.length; qi++) {
    const currentQuery = queriesToRun[qi];
    if (runAll && qi > 0) {
      console.log(`\n── Query ${qi + 1}/${QUERIES.length} ──`);
    }

    try {
      const params = {
        query: currentQuery,
        max_results: '10',
        'tweet.fields': 'created_at,public_metrics,author_id',
        'user.fields': 'username,name',
        expansions: 'author_id',
      };

      console.log(`⏳ Searching...`);
      const response = await twitterGet('/2/tweets/search/recent', params);

      // ── Error handling ──
      const errorInfo = diagnoseError(response);
      if (errorInfo) {
        console.log('');
        console.log(errorInfo.message);
        allOutput += errorInfo.message + '\n';

        if (!errorInfo.canSearch) {
          // No point trying more queries
          break;
        }
        continue;
      }

      if (response.statusCode !== 200) {
        const msg = `❌ Unexpected API error (${response.statusCode}): ${JSON.stringify(response.data)}`;
        console.log(msg);
        allOutput += msg + '\n';
        continue;
      }

      // ── Parse response ──
      const data = response.data;
      const tweets = data.data || [];
      const users = (data.includes && data.includes.users) || [];
      const meta = data.meta || {};

      console.log(`✅ Found ${tweets.length} tweets (result_count: ${meta.result_count || tweets.length})`);

      if (tweets.length === 0) {
        const msg = `No tweets found for: \`${currentQuery}\`\n`;
        console.log(msg);
        allOutput += msg;
        continue;
      }

      // ── Score and rank ──
      const scored = tweets.map((t) => ({
        ...t,
        _score: scoreTweet(t),
      }));
      scored.sort((a, b) => b._score - a._score);

      const top5 = scored.slice(0, 5);
      allTopTweets.push(...top5.map((t) => ({
        ...t,
        _query: currentQuery,
      })));

      // ── Format ──
      const output = formatResultsForTelegram(currentQuery, tweets, users, top5);
      allOutput += output;

      if (!isJson) {
        console.log(output);
      }

      // Rate limit info
      const remaining = response.headers['x-rate-limit-remaining'];
      const limit = response.headers['x-rate-limit-limit'];
      const reset = response.headers['x-rate-limit-reset'];
      if (remaining !== undefined) {
        const resetDate = new Date(parseInt(reset) * 1000).toLocaleString('en-US', { timeZone: 'America/Chicago' });
        console.log(`📊 Rate limit: ${remaining}/${limit} remaining, resets at ${resetDate}`);
      }

      // Delay between queries to respect rate limits
      if (runAll && qi < queriesToRun.length - 1) {
        console.log(`⏳ Waiting 2s before next query...`);
        await new Promise((r) => setTimeout(r, 2000));
      }
    } catch (err) {
      const msg = `❌ Network error: ${err.message}`;
      console.error(msg);
      allOutput += msg + '\n';
    }
  }

  // ── JSON output ──
  if (isJson) {
    const jsonOutput = {
      timestamp: new Date().toISOString(),
      queries: queriesToRun,
      topTweets: allTopTweets,
      telegramOutput: allOutput,
    };
    console.log(JSON.stringify(jsonOutput, null, 2));
  }

  // ── Telegram output marker ──
  console.log('\n══════════════════════════════════');
  console.log('TELEGRAM_OUTPUT_START');
  console.log('══════════════════════════════════');
  console.log(allOutput);
  console.log('══════════════════════════════════');
  console.log('TELEGRAM_OUTPUT_END');
  console.log('══════════════════════════════════');

  return allOutput;
}

// ─── Run ───────────────────────────────────────────────────────────────────────
main().catch((err) => {
  console.error(`💥 Fatal error: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});
