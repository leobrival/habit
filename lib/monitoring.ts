/**
 * Production Monitoring and Logging for JWT Migration
 * Provides metrics, alerting, and structured logging
 */

import { NextRequest } from 'next/server';

// Types for monitoring
export interface AuthMetrics {
  authType: 'api_key' | 'jwt' | 'none';
  success: boolean;
  responseTime: number;
  endpoint: string;
  userId?: string;
  errorCode?: string;
  timestamp: number;
}

export interface SystemMetrics {
  memoryUsage: NodeJS.MemoryUsage;
  timestamp: number;
  activeConnections?: number;
  requestsPerMinute?: number;
}

// In-memory metrics storage (replace with Redis/DB in production)
class MetricsCollector {
  private authMetrics: AuthMetrics[] = [];
  private systemMetrics: SystemMetrics[] = [];
  private readonly maxMetrics = 1000; // Keep last 1000 metrics

  // Record authentication attempt
  recordAuth(metrics: AuthMetrics) {
    this.authMetrics.push(metrics);
    if (this.authMetrics.length > this.maxMetrics) {
      this.authMetrics.shift();
    }

    // Log critical events
    if (!metrics.success) {
      console.error('🔐 Auth Failure:', {
        type: metrics.authType,
        endpoint: metrics.endpoint,
        error: metrics.errorCode,
        responseTime: metrics.responseTime
      });
    }

    // Alert on high failure rate
    this.checkAuthFailureRate();
  }

  // Record system metrics
  recordSystem(metrics: SystemMetrics) {
    this.systemMetrics.push(metrics);
    if (this.systemMetrics.length > this.maxMetrics) {
      this.systemMetrics.shift();
    }

    // Monitor memory usage
    const memoryMB = metrics.memoryUsage.heapUsed / 1024 / 1024;
    if (memoryMB > 500) {
      console.warn('💾 High Memory Usage:', memoryMB.toFixed(2), 'MB');
    }
  }

  // Get authentication stats
  getAuthStats(timeWindow = 300000) { // 5 minutes default
    const now = Date.now();
    const recentMetrics = this.authMetrics.filter(
      m => (now - m.timestamp) < timeWindow
    );

    const total = recentMetrics.length;
    const successful = recentMetrics.filter(m => m.success).length;
    const byType = recentMetrics.reduce((acc, m) => {
      acc[m.authType] = (acc[m.authType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const avgResponseTime = recentMetrics.length > 0
      ? recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / recentMetrics.length
      : 0;

    return {
      total,
      successful,
      successRate: total > 0 ? (successful / total) * 100 : 100,
      byType,
      avgResponseTime: Math.round(avgResponseTime),
      timeWindow: timeWindow / 1000 // seconds
    };
  }

  // Check for auth failure alerts
  private checkAuthFailureRate() {
    const stats = this.getAuthStats(60000); // 1 minute window

    if (stats.total >= 10 && stats.successRate < 90) {
      this.triggerAlert('auth_failure_rate', {
        successRate: stats.successRate,
        totalRequests: stats.total,
        timeWindow: '1 minute'
      });
    }
  }

  // Trigger alerts (replace with actual alerting system)
  private triggerAlert(alertType: string, data: any) {
    console.error('🚨 ALERT:', alertType, data);

    // In production, send to:
    // - Slack webhook
    // - Email notifications
    // - PagerDuty
    // - Monitoring dashboard
  }

  // Export metrics for monitoring dashboard
  exportMetrics() {
    return {
      auth: this.getAuthStats(),
      system: this.systemMetrics.slice(-10), // Last 10 system metrics
      timestamp: new Date().toISOString()
    };
  }
}

// Global metrics collector
export const metricsCollector = new MetricsCollector();

// Middleware wrapper for monitoring
export function withMonitoring<T extends any[]>(
  handler: (...args: T) => Promise<Response>,
  endpoint: string
) {
  return async (...args: T): Promise<Response> => {
    const startTime = performance.now();
    const request = args[0] as NextRequest;

    let authType: AuthMetrics['authType'] = 'none';
    let userId: string | undefined;
    let success = false;
    let errorCode: string | undefined;

    try {
      // Detect auth type
      const authHeader = request.headers.get('authorization');
      if (authHeader?.includes('Bearer ey')) {
        authType = 'jwt';
      } else if (authHeader?.includes('Bearer ')) {
        authType = 'api_key';
      }

      // Execute handler
      const response = await handler(...args);

      success = response.ok;
      if (!success) {
        errorCode = `HTTP_${response.status}`;
      }

      // Record metrics
      const responseTime = performance.now() - startTime;
      metricsCollector.recordAuth({
        authType,
        success,
        responseTime,
        endpoint,
        userId,
        errorCode,
        timestamp: Date.now()
      });

      return response;

    } catch (error) {
      success = false;
      errorCode = error instanceof Error ? error.constructor.name : 'UNKNOWN_ERROR';

      // Record failed metrics
      const responseTime = performance.now() - startTime;
      metricsCollector.recordAuth({
        authType,
        success,
        responseTime,
        endpoint,
        userId,
        errorCode,
        timestamp: Date.now()
      });

      throw error;
    }
  };
}

// System monitoring
export function startSystemMonitoring() {
  const interval = setInterval(() => {
    metricsCollector.recordSystem({
      memoryUsage: process.memoryUsage(),
      timestamp: Date.now()
    });
  }, 30000); // Every 30 seconds

  // Cleanup on process exit
  process.on('SIGTERM', () => clearInterval(interval));
  process.on('SIGINT', () => clearInterval(interval));

  console.log('📊 System monitoring started');
  return interval;
}

// Structured logging
export const logger = {
  info: (message: string, data?: any) => {
    console.log(JSON.stringify({
      level: 'info',
      message,
      data,
      timestamp: new Date().toISOString()
    }));
  },

  error: (message: string, error?: any, data?: any) => {
    console.error(JSON.stringify({
      level: 'error',
      message,
      error: error?.message || error,
      stack: error?.stack,
      data,
      timestamp: new Date().toISOString()
    }));
  },

  warn: (message: string, data?: any) => {
    console.warn(JSON.stringify({
      level: 'warn',
      message,
      data,
      timestamp: new Date().toISOString()
    }));
  },

  debug: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(JSON.stringify({
        level: 'debug',
        message,
        data,
        timestamp: new Date().toISOString()
      }));
    }
  }
};

// Health check endpoint data
export function getHealthStatus() {
  const authStats = metricsCollector.getAuthStats();
  const memoryUsage = process.memoryUsage();

  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || 'unknown',
    uptime: process.uptime(),
    memory: {
      used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      rss: Math.round(memoryUsage.rss / 1024 / 1024)
    },
    auth: {
      successRate: authStats.successRate,
      avgResponseTime: authStats.avgResponseTime,
      totalRequests: authStats.total
    },
    environment: process.env.NODE_ENV || 'unknown'
  };
}