/**
 * KV-backed payload renderer
 * GET /p/<id>
 * Fetches JSON from KV and renders the products
 */

interface Env {
  CONTENT: KVNamespace;
}

interface Product {
  product?: string;
  variantId?: string;
  website?: string;
  cartLink?: string;
  price?: number;
  compare_at_price?: number;
  discount_percentage?: number;
  is_free?: boolean;
  image_url?: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ params, env }) => {
  try {
    const id = params.id as string;

    // Validate ID format (SHA-256 hex should be 64 chars)
    if (!id || !/^[a-f0-9]{64}$/i.test(id)) {
      return new Response('Invalid ID format', { status: 400 });
    }

    // Fetch from KV
    const data = await env.CONTENT.get(id, 'json');

    if (!data) {
      return new Response('Payload not found', { status: 404 });
    }

    // Ensure it's an array
    const products: Product[] = Array.isArray(data) ? data : [data];

    // Generate HTML with product cards
    const html = generateHTML(products, id);

    return new Response(html, {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'public, max-age=3600',
      },
    });
  } catch (err) {
    const error = err as Error;
    return new Response(
      `Error loading payload: ${error.message}`,
      { status: 500 }
    );
  }
};

function generateHTML(products: Product[], id: string): string {
  const clean = (s: any) => {
    if (typeof s !== 'string') return s;
    return s.replace(/^\u200d|\ufeff|\u200b/g, '');
  };

  const escapeHtml = (text: string) => {
    const div = { textContent: text };
    return div.textContent || '';
  };

  const productCards = products.map(p => {
    const price = typeof p.price === 'number' ? p.price.toFixed(2) : (p.price ?? '');
    const compare = typeof p.compare_at_price === 'number' ? p.compare_at_price.toFixed(2) : (p.compare_at_price ?? '');
    const discount = (p.discount_percentage ?? 0) + '%';
    const isFree = p.is_free ? 'Yes' : 'No';

    return `
      <div class="row">
        <img class="prod" alt="Product image" src="${p.image_url || ''}" onerror="this.style.display='none'"/>
        <div class="meta">
          <div class="title">${clean(p.product ?? 'Untitled')}</div>
          <div class="grid">
            <div><div class="k">Discount</div><div class="v">${discount}</div></div>
            <div><div class="k">Free?</div><div class="v">${isFree}</div></div>
            <div><div class="k">Price</div><div class="v">${price !== '' ? `$${price}` : ''}</div></div>
            <div><div class="k">Compare At</div><div class="v">${compare !== '' ? `$${compare}` : ''}</div></div>
            <div><div class="k">Variant ID</div><div class="v mono">${p.variantId ?? ''}</div></div>
            <div><div class="k">Website</div><div class="v"><a class="pill" href="${p.website}" target="_blank" rel="noopener">Open site</a></div></div>
          </div>
          <div class="btns">
            <a class="btn" href="${p.website}" target="_blank" rel="noopener">Visit Website</a>
            <a class="btn ok" href="${p.cartLink}" target="_blank" rel="noopener">Add to Cart</a>
          </div>
        </div>
      </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Product Payload - ${id.substring(0, 8)}</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
      color: #1f2a4d;
    }

    .container {
      max-width: 1000px;
      margin: 0 auto;
    }

    .header {
      text-align: center;
      color: white;
      margin-bottom: 30px;
    }

    .header h1 {
      font-size: 2.5rem;
      margin-bottom: 10px;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
    }

    .header p {
      font-size: 1.1rem;
      opacity: 0.95;
    }

    .card {
      background: white;
      border-radius: 12px;
      padding: 30px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      margin-bottom: 20px;
    }

    .muted {
      color: #666;
      font-size: 0.95rem;
      margin-bottom: 20px;
    }

    .row {
      margin-bottom: 18px;
      border-bottom: 2px solid #e0e0e0;
      padding-bottom: 18px;
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
    }

    .row:last-child {
      border-bottom: none;
    }

    .prod {
      width: 200px;
      height: 200px;
      object-fit: cover;
      border-radius: 8px;
      flex-shrink: 0;
    }

    .meta {
      flex: 1;
      min-width: 300px;
    }

    .title {
      font-size: 1.5rem;
      font-weight: 700;
      color: #1f2a4d;
      margin-bottom: 15px;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
      margin-bottom: 15px;
    }

    .k {
      font-size: 0.85rem;
      color: #666;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .v {
      font-size: 1rem;
      color: #1f2a4d;
    }

    .mono {
      font-family: 'Courier New', monospace;
      font-size: 0.9rem;
    }

    .pill {
      display: inline-block;
      padding: 4px 12px;
      background: #f0f0f0;
      border-radius: 20px;
      font-size: 0.85rem;
      color: #1f2a4d;
      text-decoration: none;
      transition: background 0.2s;
    }

    .pill:hover {
      background: #e0e0e0;
    }

    .btns {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .btns .btn {
      padding: 10px 20px;
      font-size: 0.95rem;
      background: #667eea;
      color: white;
      text-decoration: none;
      border-radius: 8px;
      transition: all 0.2s;
      display: inline-block;
    }

    .btns .btn.ok {
      background: #4caf50;
    }

    .btns .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }

    @media (max-width: 768px) {
      .header h1 {
        font-size: 2rem;
      }

      .row {
        flex-direction: column;
      }

      .prod {
        width: 100%;
        height: auto;
        max-height: 300px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Product Payload</h1>
      <p>Loaded from KV storage</p>
    </div>

    <div class="card">
      <div class="muted">✓ ${products.length} item${products.length === 1 ? '' : 's'} loaded (ID: ${id.substring(0, 8)}...)</div>
      ${productCards}
    </div>
  </div>
</body>
</html>`;
}
