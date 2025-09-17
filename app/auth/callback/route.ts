import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const error = url.searchParams.get('error')
  const error_description = url.searchParams.get('error_description')

  // Handle errors from Supabase
  if (error) {
    return NextResponse.json({
      error: error,
      description: error_description,
      message: 'Authentication failed'
    }, { status: 400 })
  }

  // Since Supabase sends tokens in URL fragment, we need to handle this with JavaScript
  // Return an HTML page that extracts the tokens and displays them
  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Authentication Success</title>
    <style>
        body { font-family: system-ui; max-width: 800px; margin: 50px auto; padding: 20px; }
        .success { color: #22c55e; }
        .error { color: #ef4444; }
        pre { background: #f1f5f9; padding: 15px; border-radius: 8px; overflow-x: auto; }
        .token { word-break: break-all; }
        .next-step { background: #dbeafe; padding: 15px; border-radius: 8px; margin-top: 20px; }
    </style>
</head>
<body>
    <h1 class="success">🎉 Authentication Successful!</h1>

    <div id="content">
        <p>Extracting authentication tokens...</p>
    </div>

    <script>
        // Extract tokens from URL fragment
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);

        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const expiresAt = params.get('expires_at');
        const tokenType = params.get('token_type');
        const type = params.get('type');

        const contentDiv = document.getElementById('content');

        if (accessToken) {
            contentDiv.innerHTML = \`
                <h2>Your Authentication Tokens:</h2>
                <div>
                    <h3>Access Token:</h3>
                    <pre class="token">\${accessToken}</pre>
                </div>

                <div>
                    <h3>Refresh Token:</h3>
                    <pre class="token">\${refreshToken}</pre>
                </div>

                <div>
                    <h3>Token Details:</h3>
                    <pre>Type: \${type}
Token Type: \${tokenType}
Expires At: \${new Date(parseInt(expiresAt) * 1000).toLocaleString()}</pre>
                </div>

                <div class="next-step">
                    <h3>Next Step:</h3>
                    <p>Use this access token to call the verify endpoint and get your API key:</p>
                    <pre>curl -X POST http://localhost:3000/api/auth/verify \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer \${accessToken}" \\
  -d '{"key_name": "My Test Key"}'</pre>
                </div>
            \`;
        } else {
            contentDiv.innerHTML = '<p class="error">No access token found in URL fragment.</p>';
        }
    </script>
</body>
</html>
  `;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html' }
  });
}