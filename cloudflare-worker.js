/**
 * Cloudflare Worker to proxy Qase API requests and handle CORS
 * 
 * Deploy this to Cloudflare Workers (free tier):
 * 1. Go to https://workers.cloudflare.com/
 * 2. Create a new Worker
 * 3. Paste this code
 * 4. Deploy
 * 5. Copy your worker URL (e.g., https://qase-proxy.your-subdomain.workers.dev)
 * 6. Update VITE_CORS_PROXY_URL in your GitHub Actions secrets
 */

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  // Only allow GET requests
  if (request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 })
  }

  // Get the target URL from query parameter
  const url = new URL(request.url)
  const targetUrl = url.searchParams.get('url')
  
  if (!targetUrl) {
    return new Response('Missing url parameter', { status: 400 })
  }

  // Get the token from query parameter
  const token = url.searchParams.get('token')
  
  if (!token) {
    return new Response('Missing token parameter', { status: 400 })
  }

  try {
    // Forward the request to Qase API
    const response = await fetch(targetUrl, {
      headers: {
        'Token': token,
        'Content-Type': 'application/json',
      },
    })

    // Get the response data
    const data = await response.text()

    // Return with CORS headers
    return new Response(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  }
}

