/**
 * KV-backed payload renderer
 * GET /p/<id>
 * Fetches JSON from KV and renders the products
 */

import { notFound } from 'next/navigation';

export const runtime = 'edge';

interface CloudflareEnv {
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

interface PageProps {
  params: Promise<{ id: string }>;
}

function clean(s: any): any {
  if (typeof s !== 'string') return s;
  return s.replace(/^\u200d|\ufeff|\u200b/g, '');
}

function ProductCard({ product: p }: { product: Product }) {
  const price = typeof p.price === 'number' ? p.price.toFixed(2) : (p.price ?? '');
  const compare = typeof p.compare_at_price === 'number' ? p.compare_at_price.toFixed(2) : (p.compare_at_price ?? '');
  const discount = (p.discount_percentage ?? 0) + '%';
  const isFree = p.is_free ? 'Yes' : 'No';

  return (
    <div className="row">
      {p.image_url && (
        <img
          className="prod"
          alt="Product image"
          src={p.image_url}
        />
      )}
      <div className="meta">
        <div className="title">{clean(p.product ?? 'Untitled')}</div>
        <div className="grid">
          <div><div className="k">Discount</div><div className="v">{discount}</div></div>
          <div><div className="k">Free?</div><div className="v">{isFree}</div></div>
          <div><div className="k">Price</div><div className="v">{price !== '' ? `$${price}` : ''}</div></div>
          <div><div className="k">Compare At</div><div className="v">{compare !== '' ? `$${compare}` : ''}</div></div>
          <div><div className="k">Variant ID</div><div className="v mono">{p.variantId ?? ''}</div></div>
          <div>
            <div className="k">Website</div>
            <div className="v">
              {p.website && (
                <a className="pill" href={p.website} target="_blank" rel="noopener noreferrer">
                  Open site
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="btns">
          {p.website && (
            <a className="btn" href={p.website} target="_blank" rel="noopener noreferrer">
              Visit Website
            </a>
          )}
          {p.cartLink && (
            <a className="btn ok" href={p.cartLink} target="_blank" rel="noopener noreferrer">
              Add to Cart
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default async function ProductPayloadPage({ params }: PageProps) {
  const { id } = await params;

  // Validate ID format (SHA-256 hex should be 64 chars)
  if (!id || !/^[a-f0-9]{64}$/i.test(id)) {
    notFound();
  }

  // Get KV binding from Cloudflare env
  const env = process.env as unknown as CloudflareEnv;

  if (!env.CONTENT) {
    return (
      <div className="error-container">
        <h1>Configuration Error</h1>
        <p>KV namespace not configured. Please add CONTENT binding in Cloudflare Pages settings.</p>
      </div>
    );
  }

  // Fetch from KV
  let data: any;
  try {
    const jsonString = await env.CONTENT.get(id);
    if (!jsonString) {
      notFound();
    }
    data = JSON.parse(jsonString);
  } catch (err) {
    console.error('Error fetching from KV:', err);
    notFound();
  }

  // Ensure it's an array
  const products: Product[] = Array.isArray(data) ? data : [data];

  return (
    <>
      <style jsx global>{`
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

        .error-container {
          background: white;
          padding: 40px;
          border-radius: 12px;
          text-align: center;
          max-width: 600px;
          margin: 100px auto;
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
      `}</style>

      <div className="container">
        <div className="header">
          <h1>Product Payload</h1>
          <p>Loaded from KV storage</p>
        </div>

        <div className="card">
          <div className="muted">
            ✓ {products.length} item{products.length === 1 ? '' : 's'} loaded (ID: {id.substring(0, 8)}...)
          </div>
          {products.map((product, idx) => (
            <ProductCard key={idx} product={product} />
          ))}
        </div>
      </div>
    </>
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  return {
    title: `Product Payload - ${id.substring(0, 8)}`,
    description: 'Product information loaded from URL payload',
  };
}
