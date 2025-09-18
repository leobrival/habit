import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'
import yaml from 'js-yaml'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

/**
 * GET /api/openapi
 * Serves the OpenAPI specification in JSON format
 */
export async function GET() {
  try {
    // Read the YAML specification file
    const specPath = join(process.cwd(), 'specs', '001-create-an-api', 'contracts', 'api-spec.yaml')
    const yamlContent = await readFile(specPath, 'utf8')

    // Parse YAML to JSON
    const spec = yaml.load(yamlContent)

    // Use environment-based server URLs
    const isDev = process.env.NODE_ENV === 'development'
    const prodUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}/api`
      : 'https://your-app.vercel.app/api'

    const updatedSpec = {
      ...spec as any,
      servers: [
        {
          url: isDev ? 'http://localhost:3000/api' : prodUrl,
          description: isDev ? 'Development server' : 'Production server'
        },
        {
          url: 'http://localhost:3000/api',
          description: 'Development server'
        }
      ]
    }

    return NextResponse.json(updatedSpec, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
      },
    })
  } catch (error) {
    console.error('Failed to load OpenAPI spec:', error)

    return NextResponse.json(
      {
        error: 'Failed to load API specification',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}