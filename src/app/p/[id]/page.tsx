/**
 * KV-backed payload renderer
 * GET /p/<id>
 * Fetches JSON from KV and renders the products
 */

import { notFound } from 'next/navigation';
import styles from './page.module.css';

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

function clean(s: unknown): string {
  if (typeof s !== 'string') return String(s ?? '');
  return s.replace(/^\u200d|\ufeff|\u200b/g, '');
}

function ProductCard({ product: p }: { product: Product }) {
  const price = typeof p.price === 'number' ? p.price.toFixed(2) : (p.price ?? '');
  const compare = typeof p.compare_at_price === 'number' ? p.compare_at_price.toFixed(2) : (p.compare_at_price ?? '');
  const discount = (p.discount_percentage ?? 0) + '%';
  const isFree = p.is_free ? 'Yes' : 'No';

  return (
    <div className={styles.row}>
      {p.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className={styles.prod}
          alt="Product image"
          src={p.image_url}
        />
      )}
      <div className={styles.meta}>
        <div className={styles.title}>{clean(p.product ?? 'Untitled')}</div>
        <div className={styles.grid}>
          <div><div className={styles.k}>Discount</div><div className={styles.v}>{discount}</div></div>
          <div><div className={styles.k}>Free?</div><div className={styles.v}>{isFree}</div></div>
          <div><div className={styles.k}>Price</div><div className={styles.v}>{price !== '' ? `$${price}` : ''}</div></div>
          <div><div className={styles.k}>Compare At</div><div className={styles.v}>{compare !== '' ? `$${compare}` : ''}</div></div>
          <div><div className={styles.k}>Variant ID</div><div className={`${styles.v} ${styles.mono}`}>{p.variantId ?? ''}</div></div>
          <div>
            <div className={styles.k}>Website</div>
            <div className={styles.v}>
              {p.website && (
                <a className={styles.pill} href={p.website} target="_blank" rel="noopener noreferrer">
                  Open site
                </a>
              )}
            </div>
          </div>
        </div>
        <div className={styles.btns}>
          {p.website && (
            <a className={styles.btn} href={p.website} target="_blank" rel="noopener noreferrer">
              Visit Website
            </a>
          )}
          {p.cartLink && (
            <a className={`${styles.btn} ${styles.btnOk}`} href={p.cartLink} target="_blank" rel="noopener noreferrer">
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
      <div style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        minHeight: '100vh',
        padding: '20px',
        color: '#1f2a4d'
      }}>
        <div className={styles.errorContainer}>
          <h1>Configuration Error</h1>
          <p>KV namespace not configured. Please add CONTENT binding in Cloudflare Pages settings.</p>
        </div>
      </div>
    );
  }

  // Fetch from KV
  let data: unknown;
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
  const products: Product[] = Array.isArray(data) ? data : (data ? [data as Product] : []);

  return (
    <div style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh',
      padding: '20px',
      color: '#1f2a4d'
    }}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Product Payload</h1>
          <p>Loaded from KV storage</p>
        </div>

        <div className={styles.card}>
          <div className={styles.muted}>
            ✓ {products.length} item{products.length === 1 ? '' : 's'} loaded (ID: {id.substring(0, 8)}...)
          </div>
          {products.map((product, idx) => (
            <ProductCard key={idx} product={product} />
          ))}
        </div>
      </div>
    </div>
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  return {
    title: `Product Payload - ${id.substring(0, 8)}`,
    description: 'Product information loaded from URL payload',
  };
}
