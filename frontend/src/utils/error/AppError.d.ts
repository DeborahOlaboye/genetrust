declare class AppError extends Error {
  code: string;
  statusCode: number;
  details: any;
  isOperational: boolean;
  timestamp: string;
  cause?: Error;

  constructor(
    message: string,
    options?: {
      code?: string;
      statusCode?: number;
      name?: string;
      details?: any;
      isOperational?: boolean;
      cause?: Error;
    }
  );

  static fromError(error: Error, options?: {
    message?: string;
    code?: string;
    statusCode?: number;
    name?: string;
    details?: any;
    isOperational?: boolean;
  }): AppError;

  toJSON(): {
    name: string;
    message: string;
    code: string;
    statusCode: number;
    details: any;
    timestamp: string;
    isOperational: boolean;
  };

  withContext(context: Record<string, any>): AppError;
}

export default AppError;
