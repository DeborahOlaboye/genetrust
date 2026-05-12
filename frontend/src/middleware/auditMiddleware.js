import { auditTrail } from '../utils/auditTrail';

export interface AuditMiddlewareOptions {
  includeHeaders?: string[];
  includeBody?: boolean;
  excludePaths?: string[];
  maxBodySize?: number;
}

export function createAuditMiddleware(options: AuditMiddlewareOptions = {}) {
  const {
    includeHeaders = ['authorization', 'content-type', 'x-request-id'],
    includeBody = false,
    excludePaths = [],
    maxBodySize = 1024,
  } = options;

  return function auditMiddleware(req: Request, res: Response, next: () => void) {
    const url = new URL(req.url, 'http://localhost');
    const path = url.pathname;
    
    if (excludePaths.some(p => path.startsWith(p))) {
      return next();
    }

    const startTime = Date.now();
    const method = req.method;
    const actor = (req as any).user?.id || 'anonymous';

    auditTrail.log({
      type: 'data-access',
      severity: 'info',
      actor,
      target: path,
      metadata: {
        method,
        userAgent: req.headers.get('user-agent'),
        timestamp: startTime,
      },
    });

    const originalEnd = res.end;
    res.end = function(chunk?: any) {
      const duration = Date.now() - startTime;
      
      auditTrail.log({
        type: 'data-access',
        severity: res.status >= 400 ? 'warning' : 'info',
        actor,
        target: `${method} ${path}`,
        metadata: {
          statusCode: res.status,
          duration,
        },
      });

      originalEnd.call(this, chunk);
    };

    next();
  };
}