# Security Vulnerability Review - LlamaCoder

**Repository:** Nutlope/llamacoder
**Reviewer:** Automated Security Review
**Date:** 2026-05-01
**Branch:** orchestrator/security-vulnerability-review-jx71ja9p

---

## Executive Summary

Three exploitable vulnerabilities were identified. The most critical is an unauthenticated S3 upload endpoint that allows arbitrary file uploads. A medium-severity SSRF vector exists via the screenshot URL parameter. A medium-severity prompt injection / stored XSS risk exists through AI-generated markdown rendered on public share pages.

---

## Finding 1: Unauthenticated S3 File Upload (HIGH)

**Severity:** HIGH
**Type:** Broken Access Control / Unrestricted File Upload
**File:** `app/api/s3-upload/route.ts`

### Attack Path

```
Attacker → POST /api/s3-upload (no auth) → Presigned S3 URL → Upload arbitrary file to bucket
```

### Evidence

`app/api/s3-upload/route.ts:1-2`:
```ts
// app/api/s3-upload/route.js
export { POST } from "next-s3-upload/route";
```

The S3 upload route is a bare re-export of `next-s3-upload`'s route handler with zero authentication or authorization checks. The client-side usage in `app/(main)/page.tsx:56` calls `useS3Upload()` directly:

```ts
const { uploadToS3 } = useS3Upload();
// ...
const { url } = await uploadToS3(file);
```

There is no middleware, session check, or API key validation protecting this endpoint.

### Exploitation

Any unauthenticated user (or scripted attacker) can:
1. Call `POST /api/s3-upload` to obtain a presigned upload URL
2. PUT any file content to that URL (SVG with embedded JS, HTML files, executables)
3. If the S3 bucket has public read access, the uploaded file is accessible at a predictable URL

### Impact
- **Storage abuse / Denial of Wallet:** Unlimited file uploads at the owner's expense
- **XSS via uploaded files:** If the bucket serves files publicly, an attacker can upload an SVG or HTML file with embedded JavaScript and serve it from the same domain context
- **Malware distribution:** Bucket used as hosting for malicious files

### Why Existing Defenses Fail
- No authentication middleware on the route
- `next-s3-upload` by default does not require auth — it only generates presigned URLs
- No file type validation server-side (client-side `accept="image/png, image/jpeg, image/webp"` in `page.tsx:382` is trivially bypassed)
- No file content scanning

---

## Finding 2: SSRF via Screenshot URL Parameter (MEDIUM)

**Severity:** MEDIUM
**Type:** Server-Side Request Forgery (SSRF)
**File:** `app/api/create-chat/route.ts`

### Attack Path

```
Attacker → POST /api/create-chat with malicious screenshotUrl → Together AI fetches URL → Internal network access
```

### Evidence

`app/api/create-chat/route.ts:13,62-89`:
```ts
const { prompt, model, quality, screenshotUrl } = await request.json();
// ...
if (screenshotUrl) {
  const screenshotResponse = await together.chat.completions.create({
    // ...
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: screenshotToCodePrompt },
          {
            type: "image_url",
            image_url: {
              url: screenshotUrl,  // ← User-controlled URL passed directly
            },
          },
        ],
      },
    ],
  });
}
```

The `screenshotUrl` field comes directly from the JSON body of the POST request with no validation, allowlisting, or URL scheme restriction. It is passed to the Together AI API's `image_url` parameter, which causes the AI provider's servers to fetch the provided URL.

### Exploitation

An attacker can supply URLs targeting:
- Cloud metadata endpoints: `http://169.254.169.254/latest/meta-data/` (AWS), `http://metadata.google.internal/` (GCP)
- Internal services: `http://localhost:6379`, `http://10.0.0.5:8080`
- File protocol (if supported): `file:///etc/passwd`

The AI provider (Together AI) acts as the requestor, so the attacker can probe internal network services accessible from Together AI's infrastructure.

### Why Existing Defenses Fail
- No URL validation (no scheme check, no hostname allowlist, no IP range exclusion)
- No input sanitization on `screenshotUrl`
- The client-side file upload flow sets `screenshotUrl` to an S3 URL returned by `uploadToS3`, but the API accepts any string

### Mitigating Factors
- The actual fetch is performed by Together AI's servers, not the application server, limiting direct internal network access to the app's own infrastructure
- The response from the URL is consumed by an AI vision model, not returned directly to the attacker, so classic SSRF data exfiltration is limited but not impossible (the AI could be prompted to describe sensitive content)

---

## Finding 3: Prompt Injection Leading to Stored XSS on Share Pages (MEDIUM)

**Severity:** MEDIUM
**Type:** Prompt Injection / Stored XSS
**Files:** `app/share/v2/[messageId]/page.tsx`, `app/(main)/chats/[id]/chat-log.tsx`

### Attack Path

```
Attacker → Craft malicious prompt → AI generates malicious markdown/HTML → Content stored in DB → Rendered on public share page via Streamdown
```

### Evidence

The share page at `app/share/v2/[messageId]/page.tsx:50` extracts code blocks from a message and renders them:

```tsx
const files = extractAllCodeBlocks(message.content);
```

The chat log at `app/(main)/chats/[id]/chat-log.tsx` uses `Streamdown` to render AI-generated markdown:

```tsx
<Streamdown className="prose break-words">{seg.content}</Streamdown>
```

`Streamdown` (v2.1.0 per package.json) by default includes `rehype-raw` which processes raw HTML in markdown, and uses `rehype-sanitize` with a schema that allows many HTML tags. The AI-generated content stored in `Message.content` flows through this renderer.

### Exploitation

An attacker crafts a prompt that uses prompt injection to cause the AI to generate markdown containing HTML that survives sanitization. For example:

1. The prompt asks the AI to "output the following HTML as part of your response"
2. The AI includes HTML in its markdown response
3. `Streamdown` with `rehype-raw` processes the HTML
4. While `rehype-sanitize` strips `<script>` tags and `on*` event handlers, there are known bypass techniques (e.g., SVG with `<animate>`, `<object>` tags, `<iframe>` if allowed, or `<a href="javascript:...">` if the protocol allowlist includes `javascript:`)

Streamdown's default configuration allows `http`, `https`, `irc`, `ircs`, `mailto`, `xmpp`, and `tel` protocols for links — `javascript:` is not included by default, which mitigates the simplest XSS vectors. However, complex prompt injection chains could target other rendering paths.

### Why Existing Defenses Are Insufficient
- No input validation or sanitization on the `prompt` field before it is sent to the AI
- No output sanitization on AI-generated content before storage
- `Streamdown` is used with default (permissive) settings — no custom `allowedProtocols`, `allowedLinkPrefixes`, or `allowedImagePrefixes` are configured
- The share page is publicly accessible with no authentication

### Mitigating Factors
- Streamdown does include `rehype-sanitize` by default which strips most dangerous HTML
- The AI model's own safety training may resist simple prompt injection attempts
- Code blocks in markdown are rendered as code, not as HTML, so most AI output is safe

---

## Finding 4: Unrestricted Model Parameter (LOW)

**Severity:** LOW
**Type:** Business Logic / Resource Abuse
**File:** `app/api/get-next-completion-stream-promise/route.ts`

### Evidence

`app/api/get-next-completion-stream-promise/route.ts:34-48`:
```ts
const requestSchema = z.object({
  messageId: z.string().min(1),
  model: z.string().min(1),
});

const parsed = requestSchema.safeParse(await req.json().catch(() => null));
// ...
const { messageId, model } = parsed.data;
// ...
const res = await together.chat.completions.create({
  model: resolveModel(model),  // ← User-provided model string
  // ...
});
```

The `model` parameter accepts any non-empty string. While `resolveModel()` maps known model aliases, unknown values pass through unchanged. An attacker could specify arbitrary (and potentially expensive) model identifiers.

### Impact
- API cost abuse through expensive model selection
- The `resolveModel` function in `lib/constants.ts` only maps 3 known aliases and passes everything else through

### Mitigating Factors
- The model must be valid on Together AI's platform or the call will fail
- The impact is limited to API cost, not data breach or code execution

---

## Additional Observations (Informational)

### 1. Database Connection Per Request
`app/api/get-next-completion-stream-promise/route.ts:40-42` creates a new Prisma client and connection pool on every request instead of caching it (unlike `lib/prisma.ts` which uses React's `cache()`). In high-traffic scenarios this could exhaust database connections.

### 2. Helicone API Key in Headers
`app/api/create-chat/route.ts:31` and `app/api/get-next-completion-stream-promise/route.ts:83` include the `HELICONE_API_KEY` in request headers forwarded to an external service. If the Helicone service is compromised, the key could be exfiltrated.

### 3. Console Logging of Plan Content
`app/api/create-chat/route.ts:112`: `console.log("PLAN:", initialRes.choices[0].message?.content)` logs the full AI-generated plan (which may contain user prompt data) to server logs. If logs are accessible to third parties (e.g., log aggregation services), this could leak sensitive user input.

### 4. No Rate Limiting
None of the API endpoints (`/api/create-chat`, `/api/get-next-completion-stream-promise`, `/api/s3-upload`) have rate limiting. This makes the application vulnerable to denial-of-service and API cost abuse attacks.

---

## Recommendations Summary

| Finding | Priority | Recommendation |
|---------|----------|----------------|
| Unauthenticated S3 Upload | HIGH | Add authentication middleware to `/api/s3-upload`; validate file types server-side; consider bucket lifecycle policies |
| SSRF via Screenshot URL | MEDIUM | Validate `screenshotUrl` against an allowlist of expected domains (e.g., only S3 URLs); reject non-HTTP(S) schemes; exclude private IP ranges |
| Prompt Injection / Stored XSS | MEDIUM | Configure Streamdown with restrictive `allowedProtocols`, `allowedLinkPrefixes`, and `allowedImagePrefixes`; consider adding output sanitization before storing AI responses |
| Unrestricted Model Parameter | LOW | Validate `model` against the `MODELS` constant in `lib/constants.ts` server-side |
| No Rate Limiting | LOW | Add rate limiting to all API endpoints, especially `/api/create-chat` and `/api/s3-upload` |
