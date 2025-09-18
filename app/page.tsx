import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center max-w-2xl">
        <h1 className="text-4xl font-bold mb-4">🎯 Habit Tracker API</h1>
        <p className="text-lg text-gray-600 mb-8">
          Modern API-first habit tracking system with JWT authentication and magic link flow
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md border">
            <h3 className="font-semibold text-lg mb-2">🔑 JWT Authentication</h3>
            <p className="text-gray-600 text-sm">
              Secure JWT tokens with magic link authentication and automatic refresh
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border">
            <h3 className="font-semibold text-lg mb-2">🛡️ Row Level Security</h3>
            <p className="text-gray-600 text-sm">
              Database-level user isolation with Supabase RLS policies
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border">
            <h3 className="font-semibold text-lg mb-2">🔄 Backwards Compatible</h3>
            <p className="text-gray-600 text-sm">
              Dual authentication supporting both JWT and legacy API keys
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border">
            <h3 className="font-semibold text-lg mb-2">📱 Client Ready</h3>
            <p className="text-gray-600 text-sm">
              Raycast extensions, MCP servers, and mobile app integration
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <Link
            href="/docs"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            📖 View API Documentation
          </Link>

          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Link href="/api/health" className="text-blue-600 hover:underline">
              🏥 Health Check
            </Link>
            <Link href="/api/openapi" className="text-blue-600 hover:underline">
              📋 OpenAPI Spec
            </Link>
            <span className="text-gray-400">•</span>
            <span className="text-green-600 font-medium">✅ Production Ready</span>
          </div>
        </div>
      </div>
    </main>
  )
}