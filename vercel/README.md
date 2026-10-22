# Vercel Firewall

`firewall-rules.json` mirrors the custom WAF rules live on the `llamacoder`
Vercel project. Vercel stores firewall config on the project, not in the repo,
so this file is a record — editing it does not change anything on deploy.

Limits were picked from 7 days of per-IP production traffic: the heaviest
legitimate IPs peaked at ~19 create-chat calls / 5 min, 25 / hour and 88 / day.

| Rule | Path | Limit (per IP) |
| --- | --- | --- |
| Rate limit create-chat (minute) | `/api/create-chat` | 10 / min |
| Rate limit create-chat (hour) | `/api/create-chat` | 30 / hour, then blocked 1h |
| Rate limit generation stream (minute) | `/api/get-next-completion-stream-promise` | 30 / min |
| Rate limit chat title (minute) | `/api/generate-chat-title` | 20 / min |
| Rate limit image upload sign (minute) | `/api/s3-upload` | 10 / min |
| Rate limit image upload complete (minute) | `/api/s3-upload/complete` | 10 / min |
| Rate limit og image (minute) | `/api/og` | 60 / min |
| Rate limit server actions (minute) | any request with a `Next-Action` header | 60 / min |

These WAF rules are an outer layer. The app also enforces its own per-IP
limits (including daily caps) for every route and server action, stored in
Postgres; see `lib/rate-limit-config.ts`.

Rate-limited requests get a 429, which the frontend shows as a toast
(`lib/rate-limit.ts`). IP blocks are managed in the dashboard / CLI only.

To apply a rule from this file:

```bash
vercel firewall rules add --json '<rule object>' --yes
vercel firewall publish --yes
```
