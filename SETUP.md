# Setup Guide - URL Payload Renderer

Quick guide to get the URL Payload Renderer running on Cloudflare Pages.

## Prerequisites

- Node.js 18+ and npm 10+
- A Cloudflare account
- Git repository connected to Cloudflare Pages

---

## 🚀 Quick Deploy (Cloudflare Dashboard)

### 1. Connect Repository

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages**
2. Click **Create application** → **Pages** → **Connect to Git**
3. Select your repository and authorize

### 2. Configure Build Settings

- **Project name:** `snipify` (or your choice)
- **Framework preset:** Next.js
- **Build command:** `npm run build`
- **Build output directory:** (leave default)
- **Root directory:** (leave default)

### 3. Deploy

Click **Save and Deploy** and wait for the build to complete.

### 4. Access Your App

Once deployed, visit:
- `https://snipify.pages.dev/payload-renderer.html`

---

## 🗄️ Enable KV Storage (Optional)

For payloads larger than ~14KB, you'll need KV storage.

### 1. Create KV Namespace

```bash
npx wrangler kv:namespace create CONTENT
```

**Save the ID from the output:**
```
{ binding = "CONTENT", id = "abc123def456..." }
```

### 2. Option A: Configure via Dashboard

1. Go to your Pages project → **Settings** → **Functions**
2. Scroll to **KV namespace bindings**
3. Click **Add binding**:
   - **Variable name:** `CONTENT`
   - **KV namespace:** Select the namespace you created
4. Click **Save**
5. Redeploy from the **Deployments** tab

### 2. Option B: Configure via wrangler.jsonc (CLI Deployments Only)

Edit `wrangler.jsonc`:

```json
{
  "kv_namespaces": [
    {
      "binding": "CONTENT",
      "id": "YOUR_NAMESPACE_ID_HERE"
    }
  ]
}
```

Then deploy via CLI:
```bash
npm run deploy
```

### 3. Test KV Storage

```bash
curl -X POST https://snipify.pages.dev/api/new \
  -H "Content-Type: application/json" \
  -d '[{"product":"Test Product","price":29.99}]'
```

You should get:
```json
{"url":"/p/abc123...","id":"abc123...","size":25,"items":1}
```

Visit the URL to see your products!

---

## 🔧 Local Development

### 1. Install Dependencies

```bash
npm install
```

### 2. Create `.dev.vars` (for KV in development)

Create a file `.dev.vars`:
```
CONTENT_NAMESPACE_ID=your_kv_namespace_id
```

### 3. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000/payload-renderer.html`

---

## 📝 Testing the Static Renderer

1. Visit `/payload-renderer.html`
2. Paste this sample JSON:

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

3. Click **Generate Link (?d=)**
4. Copy and share the URL!

---

## 🎯 Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                  Cloudflare Pages                    │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Static Assets (public/)                            │
│  └─ payload-renderer.html ──┐                       │
│                              │                       │
│  Next.js App (src/app/)      │                      │
│  ├─ api/new/route.ts ────────┼─► KV Storage        │
│  └─ p/[id]/page.tsx ─────────┘                      │
│                                                      │
│  OpenNext Worker (.open-next/)                      │
│  └─ worker.js (generated)                           │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**Flow for Static Mode (Pattern A & B):**
1. User visits `/payload-renderer.html`
2. Pastes JSON → Compresses with DEFLATE + Base64URL
3. Generates shareable URL with `?d=token` or `#token`
4. Recipient visits URL → Decompresses → Renders products

**Flow for KV Mode (Pattern C):**
1. POST JSON to `/api/new` → Stores in KV → Returns `/p/<hash>`
2. User visits `/p/<hash>` → Fetches from KV → Renders products

---

## ⚠️ Troubleshooting

### Build fails with "entry-point not found"

**Solution:** Make sure you run `npm run build` before deploying. This generates `.open-next/worker.js`.

### KV binding not found

**Error:** `env.CONTENT is undefined`

**Solution:**
1. Verify namespace created: `npx wrangler kv:namespace list`
2. Check binding in Dashboard → Settings → Functions → KV bindings
3. Make sure binding name is exactly `CONTENT`
4. Redeploy after adding binding

### URL too long (414 error)

**Solution:**
1. Use hash fragment (`#token`) instead of query param
2. Or use KV storage mode (`/api/new` → `/p/<hash>`)

### Images not loading

**Solution:** Images are loaded from external URLs. If they don't load:
1. Check the `image_url` is valid
2. Verify CORS allows loading images
3. Images with errors are automatically hidden

---

## 🔐 Security Notes

- All data in URLs is **publicly visible** - don't put secrets there
- KV storage is **not encrypted by default** - treat as public data
- For sensitive data, add authentication to API routes
- Consider adding rate limiting for `/api/new`

---

## 📚 Additional Resources

- [Full Documentation](./URL_PAYLOAD_RENDERER.md)
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Cloudflare KV Docs](https://developers.cloudflare.com/kv/)
- [OpenNext Cloudflare](https://opennext.js.org/cloudflare)

---

## ✅ Deployment Checklist

- [ ] Repository connected to Cloudflare Pages
- [ ] Build settings configured (Next.js preset)
- [ ] First deployment successful
- [ ] Static renderer accessible at `/payload-renderer.html`
- [ ] (Optional) KV namespace created
- [ ] (Optional) KV binding configured
- [ ] (Optional) API endpoint tested at `/api/new`
- [ ] (Optional) KV renderer tested at `/p/<hash>`

---

**Ready to deploy? Let's go! 🚀**
