/**
 * KV-backed payload storage endpoint
 * POST /api/new with JSON body
 * Returns a short link /p/<hash>
 */

import { NextRequest } from 'next/server';

export const runtime = 'edge';

interface CloudflareEnv {
  CONTENT: KVNamespace;
}

export async function POST(request: NextRequest) {
  try {
    // Get KV binding from Cloudflare env
    const env = process.env as unknown as CloudflareEnv;

    if (!env.CONTENT) {
      return Response.json(
        { error: 'KV namespace not configured' },
        { status: 500 }
      );
    }

    // Parse the JSON body
    const body = await request.json();

    // Validate that we have an array
    if (!Array.isArray(body)) {
      return Response.json(
        { error: 'Expected an array of products' },
        { status: 400 }
      );
    }

    // Stringify the data
    const text = JSON.stringify(body);

    // Generate SHA-256 hash as ID
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const id = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Store in KV (up to 25 MiB per value)
    await env.CONTENT.put(id, text, {
      // Optional: set expiration (e.g., 30 days)
      // expirationTtl: 60 * 60 * 24 * 30,
    });

    // Return the short link
    const url = `/p/${id}`;

    return Response.json(
      {
        url,
        id,
        size: text.length,
        items: body.length
      },
      {
        status: 200,
        headers: {
          'access-control-allow-origin': '*',
        }
      }
    );
  } catch (err) {
    const error = err as Error;
    return Response.json(
      {
        error: 'Failed to process request',
        message: error.message
      },
      { status: 500 }
    );
  }
}

// Handle CORS preflight
export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'Content-Type',
    },
  });
}
