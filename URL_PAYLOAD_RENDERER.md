# URL-Payload Renderer on Cloudflare Pages

A single-page static app that **compresses JSON into the URL** and **decompresses it client-side** to render product cards. Includes optional **Pages Functions + KV** pattern for arbitrarily large payloads.

---

## 📋 Table of Contents
- [Goals](#goals)
- [Quick Start](#quick-start)
- [Data Shape](#data-shape)
- [Three Transport Patterns](#three-transport-patterns)
- [Size Budget & Compression Notes](#size-budget--compression-notes)
- [Project Structure](#project-structure)
- [Cloudflare Pages Setup](#cloudflare-pages-setup)
- [KV Binding Setup](#kv-binding-setup)
- [Usage Examples](#usage-examples)
- [Security & Hardening](#security--hardening)
- [Troubleshooting](#troubleshooting)
- [Future Enhancements](#future-enhancements)

---

## 🎯 Goals
- Allow a **shareable URL** that encodes product JSON
- Decode on page load and render **all products**, not just the first
- Keep it **static** for the simple mode; optionally use **KV** for larger payloads

---

## 🚀 Quick Start

### Prerequisites

This project uses **Next.js 15** with **OpenNext for Cloudflare Workers**. Make sure you have:
- Node.js 18+
- npm 10+
- A Cloudflare account

### Option 1: Static Mode (No KV Required)

The static payload renderer works without any backend setup:

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build and deploy:**
   ```bash
   npm run build
   npm run deploy
   ```

3. **Access the app:**
   - Visit `https://your-domain.pages.dev/payload-renderer.html`
   - Paste your JSON and click "Generate Link (?d=)"
   - Share the generated URL!

### Option 2: KV-Backed Mode (For Large Payloads)

For payloads that exceed URL size limits, use KV storage:

1. **Create a KV namespace:**
   ```bash
   npx wrangler kv:namespace create CONTENT
   ```

   This will output something like:
   ```
   { binding = "CONTENT", id = "abc123def456..." }
   ```

2. **Update wrangler.jsonc with your KV namespace ID:**
   ```json
   "kv_namespaces": [
     {
       "binding": "CONTENT",
       "id": "abc123def456..."  // Replace with your actual ID
     }
   ]
   ```

3. **Build and deploy:**
   ```bash
   npm run build
   npm run deploy
   ```

4. **Use the API:**
   ```bash
   curl -X POST https://your-domain.pages.dev/api/new \
     -H "Content-Type: application/json" \
     -d '[{"product":"Test Product","price":29.99,...}]'

   # Returns: {"url":"/p/abc123...","id":"abc123..."}
   ```

---

## 📊 Data Shape

We operate on an **array of product objects**:

```json
[
  {
    "product": "Mini Peptide + Ceramide Repairing Moisturizer (100% off)",
    "variantId": "49240310415606",
    "website": "https://drzenovia.com",
    "cartLink": "https://drzenovia.com/cart/49240310415606:1",
    "price": 0.0,
    "compare_at_price": 0.0,
    "discount_percentage": 100.0,
    "is_free": true,
    "image_url": "https://cdn.shopify.com/s/files/1/0334/6336/9868/files/image.jpg"
  }
]
```

**Field Types:**
- `product`, `variantId`, `website`, `cartLink`, `image_url`: strings
- `price`, `compare_at_price`, `discount_percentage`: numbers
- `is_free`: boolean

---

## 🔀 Three Transport Patterns

### Pattern A: Query param `?d=` (Deflate + Base64URL)
**How it works:**
- Encode JSON using **DEFLATE**, then **Base64URL** (no `=`, `+` → `-`, `/` → `_`)
- Place the token in `?d=<token>`
- The static page reads `?d`, inflates back to JSON, and renders

**Pros:** Simple, works with a single static HTML file
**Cons:** URL length limit (~16 KB at Cloudflare)

**Example:**
```
https://your-domain.pages.dev/payload-renderer.html?d=eJyLjg...
```

### Pattern B: Hash fragment `#...` (client-only)
**How it works:**
- Same token, but after `#`
- The **fragment isn't sent to the server**, so it bypasses edge URL limits
- The page uses `location.hash` to decode

**Pros:** Large payloads without KV
**Cons:** Poor SEO/link previews; very long visible URLs

**Example:**
```
https://your-domain.pages.dev/payload-renderer.html#eJyLjg...
```

### Pattern C: KV-backed `/p/<hash>` links
**How it works:**
- Store raw JSON in **Cloudflare KV**; link only a short ID or SHA-256 hash
- Route like `/p/<id>` retrieves the JSON server-side and renders

**Pros:** No URL size concerns; stable links
**Cons:** Needs Pages Functions + KV binding

**Example:**
```
POST /api/new → {"url":"/p/abc123..."}
GET  /p/abc123... → Renders products
```

---

## 📏 Size Budget & Compression Notes

- Cloudflare enforces ~**16 KB** limit for URL path + query
- Budget ~**14 KB** for the `d` token to be safe
- Base64 adds ~33% overhead of the DEFLATE result
- Typical minified JSON compresses to **30–60%** with DEFLATE

**Rule of thumb:** Expect **~20–35 KB** of original minified JSON to fit in `?d=`

**If you exceed that:**
- Switch to **hash fragment** `#<token>`, or
- Use **KV** (`/p/<hash>`) to store and fetch the full JSON

---

## 📁 Project Structure

```
/ (repo root)
├─ public/
│  └─ payload-renderer.html      # Static encoder/decoder + renderer (Pattern A & B)
├─ src/
│  └─ app/
│     ├─ api/
│     │  └─ new/
│     │     └─ route.ts          # POST JSON → store → returns /p/<hash> URL (Pattern C)
│     └─ p/
│        └─ [id]/
│           └─ page.tsx          # GET /p/<id> → fetch JSON from KV → render (Pattern C)
├─ wrangler.jsonc                # Cloudflare Workers configuration (KV bindings)
└─ package.json                  # Dependencies and scripts
```

**Key Architecture:**
- **Next.js 15 App Router** for routing and server-side rendering
- **OpenNext** for Cloudflare Workers deployment
- **Edge Runtime** for fast, globally distributed API routes
- **KV Namespace** for persistent storage (optional)

---

## ☁️ Cloudflare Pages Setup

### Deploy via Cloudflare Dashboard (Recommended)

1. **Connect your GitHub repository:**
   - Go to **Cloudflare Dashboard** → **Pages** → **Create a project**
   - Select your repository
   - Configure build settings:
     - **Framework preset:** Next.js
     - **Build command:** `npm run build`
     - **Build output directory:** (leave default or `.open-next`)

2. **Configure environment variables** (if needed):
   - Go to **Settings** → **Environment variables**
   - Add any custom variables

3. **Deploy:**
   - Click **Save and Deploy**
   - Wait for the build to complete

### Deploy via CLI (Alternative)

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build the project:**
   ```bash
   npm run build
   ```

   This runs `next build` and generates the `.open-next/` directory with the Worker bundle.

3. **Deploy to Cloudflare:**
   ```bash
   npm run deploy
   ```

   This runs `opennextjs-cloudflare build && opennextjs-cloudflare deploy`.

4. **Access your app:**
   - Static renderer: `https://snipify.pages.dev/payload-renderer.html`
   - API endpoint: `https://snipify.pages.dev/api/new`
   - KV renderer: `https://snipify.pages.dev/p/<hash>`

---

## 🗄️ KV Binding Setup

### Create KV Namespace

```bash
# Create production namespace
npx wrangler kv:namespace create CONTENT

# Note the ID shown in output, e.g.:
# { binding = "CONTENT", id = "abc123def456..." }
```

### Configure Binding (Choose One Method)

#### Method 1: Via wrangler.jsonc (Recommended for CLI Deployments)

Update `wrangler.jsonc` with your KV namespace ID:

```json
{
  "kv_namespaces": [
    {
      "binding": "CONTENT",
      "id": "abc123def456..."  // Replace with your actual namespace ID
    }
  ]
}
```

Then deploy:
```bash
npm run deploy
```

#### Method 2: Via Cloudflare Dashboard (For Git-based Deployments)

1. Go to **Cloudflare Dashboard** → **Workers & Pages** → **Your Project**
2. Navigate to **Settings** → **Functions** → **KV namespace bindings**
3. Click **Add binding**:
   - **Variable name:** `CONTENT`
   - **KV namespace:** Select your created namespace
4. **Save** and **Redeploy** your project

### Verify Binding

```bash
# Test the API endpoint
curl -X POST https://your-domain.pages.dev/api/new \
  -H "Content-Type: application/json" \
  -d '[{"product":"Test","price":9.99}]'

# Should return: {"url":"/p/abc123...","id":"abc123...","size":25,"items":1}

# Then visit the returned URL
open https://your-domain.pages.dev/p/abc123...
```

---

## 💡 Usage Examples

### Example 1: Generate URL from JSON (Static Mode)

1. **Visit:** `https://your-domain.pages.dev/payload-renderer.html`
2. **Paste your JSON:**
   ```json
   [
     {
       "product": "Sample Product",
       "variantId": "12345",
       "website": "https://example.com",
       "cartLink": "https://example.com/cart/12345:1",
       "price": 29.99,
       "compare_at_price": 39.99,
       "discount_percentage": 25,
       "is_free": false,
       "image_url": "https://via.placeholder.com/200"
     }
   ]
   ```
3. **Click:** "Generate Link (?d=)"
4. **Copy and share** the generated URL

### Example 2: Use Hash Fragment for Large Payloads

1. Same as above, but click **"Generate Link (#)"**
2. The URL will use `#token` instead of `?d=token`
3. Bypasses server-side URL limits

### Example 3: Store in KV (API Mode)

```bash
# Store your products
curl -X POST https://your-domain.pages.dev/api/new \
  -H "Content-Type: application/json" \
  -d @products.json

# Response: {"url":"/p/sha256hash","id":"sha256hash","size":1234,"items":5}

# Visit the URL
open https://your-domain.pages.dev/p/sha256hash
```

### Example 4: Programmatic URL Generation

```javascript
import { deflateSync } from 'fflate';

function encodePayload(data) {
  const json = JSON.stringify(data);
  const bytes = new TextEncoder().encode(json);
  const compressed = deflateSync(bytes, { level: 9 });
  const base64 = btoa(String.fromCharCode(...compressed));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

const products = [{ product: "Test", price: 9.99 }];
const token = encodePayload(products);
const url = `https://your-domain.pages.dev/payload-renderer.html?d=${token}`;
console.log(url);
```

---

## 🔒 Security & Hardening

### Input Validation
- **Sanitize** decoded content before injecting into HTML (avoid XSS)
- Use `textContent` when possible; for URLs, validate origins/domains
- Treat URL-supplied data as **untrusted**

### Domain Allowlisting
If you expect third-party links, consider allow-listing domains:

```javascript
const ALLOWED_DOMAINS = ['example.com', 'trusted-shop.com'];

function isValidUrl(url) {
  try {
    const parsed = new URL(url);
    return ALLOWED_DOMAINS.some(domain => parsed.hostname.endsWith(domain));
  } catch {
    return false;
  }
}
```

### KV Security
- For private data, use **signed IDs** or **authentication**
- Consider setting **expiration TTL** on KV entries:
  ```typescript
  await env.CONTENT.put(id, text, {
    expirationTtl: 60 * 60 * 24 * 30, // 30 days
  });
  ```

### Content Security Policy
Add CSP headers to prevent XSS:

```typescript
headers: {
  'content-security-policy': "default-src 'self'; img-src *; style-src 'unsafe-inline'"
}
```

---

## 🐛 Troubleshooting

### Only one product shows
**Issue:** Renderer only displays first product
**Fix:** Ensure you're iterating the array:
```javascript
const items = Array.isArray(data) ? data : [data];
items.forEach(product => { /* render */ });
```

### Broken images
**Issue:** `image_url` returns 404
**Fix:** Add `onerror` handler:
```html
<img onerror="this.style.display='none'" src="${url}" />
```

### URL too long / 414 errors
**Issue:** Compressed payload exceeds ~16 KB
**Solutions:**
1. Use hash fragment (`#token`) instead of query param
2. Use KV-backed pattern (`/p/<hash>`)
3. Reduce JSON size (remove unnecessary fields, shorten strings)

### Weird characters in product names
**Issue:** Zero-width characters from CSV import
**Fix:** Strip during JSON generation:
```javascript
const clean = (s) => s.replace(/^\u200d|\ufeff|\u200b/g, '');
```

### KV binding not found
**Issue:** `env.CONTENT is undefined`
**Fix:**
1. Verify KV namespace created: `wrangler kv:namespace list`
2. Check binding in Dashboard → Settings → Functions → KV bindings
3. Redeploy after adding binding

### CORS errors
**Issue:** Cannot POST to `/api/new` from external site
**Fix:** Already handled in `functions/api/new.ts` with:
```typescript
headers: {
  'access-control-allow-origin': '*',
}
```

---

## 🚀 Future Enhancements

### Planned Features
- [ ] Client-side **search/sort** (filter by `is_free`, `discount_percentage`)
- [ ] Tiny **CSV→JSON parser** UI (paste raw CSV, generate JSON)
- [ ] **Dark/light theme** toggle
- [ ] **Social previews** for KV pattern (server-render OpenGraph tags)
- [ ] **Bulk import** from Shopify API
- [ ] **Analytics** tracking for shared links
- [ ] **QR code generation** for shareable links
- [ ] **Expiring links** with TTL configuration

### Contributing
Want to add a feature? Open an issue or submit a PR!

---

## 📚 Additional Resources

- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Cloudflare KV Documentation](https://developers.cloudflare.com/kv/)
- [fflate Library](https://github.com/101arrowz/fflate)
- [Base64URL Encoding Spec](https://datatracker.ietf.org/doc/html/rfc4648#section-5)

---

## 📝 License

MIT

---

## 🙏 Credits

Built with:
- [fflate](https://github.com/101arrowz/fflate) - Fast compression/decompression
- [Cloudflare Pages](https://pages.cloudflare.com/) - Hosting & Functions
- [Cloudflare KV](https://www.cloudflare.com/products/workers-kv/) - Storage

---

**Questions or issues?** Open an issue on GitHub or contact the maintainers.

**Happy sharing! 🎉**
