/**
 * KV-backed payload storage endpoint
 * POST /api/new with JSON body
 * Returns a short link /p/<hash>
 *
 * Usage:
 * curl -X POST https://your-domain.com/api/new \
 *   -H "Content-Type: application/json" \
 *   -d '[{"product":"Test","variantId":"123",...}]'
 */

interface Env {
  CONTENT: KVNamespace;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    // Parse the JSON body
    const body = await request.json();

    // Validate that we have an array
    if (!Array.isArray(body)) {
      return new Response(
        JSON.stringify({ error: 'Expected an array of products' }),
        {
          status: 400,
          headers: { 'content-type': 'application/json' }
        }
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

    return new Response(
      JSON.stringify({
        url,
        id,
        size: text.length,
        items: body.length
      }),
      {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'access-control-allow-origin': '*',
        }
      }
    );
  } catch (err) {
    const error = err as Error;
    return new Response(
      JSON.stringify({
        error: 'Failed to process request',
        message: error.message
      }),
      {
        status: 500,
        headers: { 'content-type': 'application/json' }
      }
    );
  }
};

// Handle CORS preflight
export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'Content-Type',
    },
  });
};
