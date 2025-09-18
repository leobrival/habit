import { NextRequest, NextResponse } from 'next/server';
import { getHealthStatus, metricsCollector } from '@/lib/monitoring';

/**
 * GET /api/health - Health check and monitoring endpoint
 * Returns system health and performance metrics
 */
export async function GET(request: NextRequest) {
  try {
    const healthStatus = getHealthStatus();

    // Include detailed metrics if requested
    const url = new URL(request.url);
    const includeMetrics = url.searchParams.get('metrics') === 'true';

    if (includeMetrics) {
      const metrics = metricsCollector.exportMetrics();
      return NextResponse.json({
        ...healthStatus,
        metrics
      });
    }

    return NextResponse.json(healthStatus);

  } catch (error) {
    console.error('Health check error:', error);

    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * GET /api/health/metrics - Detailed metrics endpoint
 * Returns comprehensive monitoring data
 */
export async function POST(request: NextRequest) {
  try {
    const metrics = metricsCollector.exportMetrics();

    return NextResponse.json({
      metrics,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Metrics export error:', error);

    return NextResponse.json({
      error: 'Failed to export metrics',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}