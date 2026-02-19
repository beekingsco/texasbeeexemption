# BeeExemption — Staging → Production Workflow

## Environment Overview

| Environment | Branch | URL | Purpose |
|---|---|---|---|
| **Production** | `main` | https://beeexemption.com | Live site — customers see this |
| **Staging** | `staging` | https://staging.beeexemption.com* | Test all changes here first |

> *`staging.beeexemption.com` requires a DNS CNAME record (see setup below)

---

## How to Make Changes

### 1. Always work on `staging` first

```bash
git checkout staging
git pull origin staging
# make your changes
git add .
git commit -m "feat: describe your change"
git push origin staging
```

Vercel auto-deploys staging → `staging.beeexemption.com` within ~1 min.

### 2. Review on staging

Visit https://staging.beeexemption.com and verify everything looks right.

### 3. Push to production

Once staging is approved:

```bash
git checkout main
git merge staging
git push origin main
```

Vercel auto-deploys main → `beeexemption.com` within ~1 min.

---

## One-Time DNS Setup (SiteMax/GoDaddy)

Log in to SiteMax (sitemaxdomains.com, user: luminationstudios) → Manage Domain → DNS → Add record:

| Type | Host | Value | TTL |
|---|---|---|---|
| CNAME | staging | cname.vercel-dns.com | 1 hour |

After propagation (~5-15 min), `staging.beeexemption.com` will be live.

---

## Branch Rules

- **Never push directly to `main`** — always go through staging
- **Hotfixes** (urgent production bug): push to `main` directly, then merge back to `staging`
- **dev branch**: experimental work only — not auto-deployed; merge into staging when ready

---

## Vercel Project

- Project: `tax-calculator` (team: robees-projects)
- Production branch: `main` → beeexemption.com
- Staging branch: `staging` → staging.beeexemption.com (custom domain, no Vercel auth required)

