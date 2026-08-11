# SPEC — AI Assistant on the site (2026-06-15)

## Goal
A chat widget that answers user questions about TLA Stats using public docs + live
data, helps users without DeFi Patriot, and can file support/feature requests directly
to him.

## What it does
1. Answers questions ("how is arbLUNA priced?", "why is my LP inactive?", "what's
   Votion?") grounded in THIS system's docs + data.
2. Helps users self-diagnose ("my portfolio looks wrong") and explains.
3. When something is a genuine feature request or bug: helps the user articulate
   it clearly, then submits it to DeFi Patriot.

## Architecture
- **Frontend:** chat widget on the site (or a tab on the Transparency Hub).
- **Context fed to the model:** the public markdown docs (MISSION, PRICING-DOCTRINE,
  SYSTEM-AUDIT, specs) + selected live JSON (system-health.json, network-and-prices,
  summary stats). All already public — no secrets.
- **Backend proxy (REQUIRED):** the Anthropic API key must NOT be client-side
  (theft = runaway bill). A tiny serverless function (Vercel/Cloudflare/etc) holds
  the key, receives the user message + assembles context, calls the API, returns
  the answer. Rate-limit per IP to cap cost.
- **Support-request submission:** the proxy (or a second function) opens a GitHub
  issue in a dedicated repo (e.g. `tla-support`) with the AI-formatted
  description, OR sends an email/webhook. GitHub issue is cleanest: free, DeFi Patriot
  gets notified, tracked, threaded.

## Constraints / decisions needed
- Backend host (Vercel functions likely, since site is on Vercel).
- API cost controls: max tokens, per-session/per-IP limits, maybe a daily cap.
- Submission target: GitHub issues vs email (recommend GitHub issues).
- Scope guardrails: keep it answering about TLA Stats, not general chit-chat.

## Why it's worth it
Self-serve help scales DeFi Patriot; surfaces good feature requests; turns confused
users into clear bug reports. The data + docs are already public, so grounding is
free. Only real lift is the backend proxy.
