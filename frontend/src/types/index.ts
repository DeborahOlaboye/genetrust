// Core application types
export * from './wallet';
export * from './api';
export * from './components';

// Utility types
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type Dictionary<T> = Record<string, T>;

// API Response types
export interface ApiResponse<T> {
  data: T;
  error?: {
    code: number;
    message: string;
    details?: unknown;
  };
  success: boolean;
}

// Pagination types
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Error handling
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// State management
export type Action<T, P = unknown> = {
  type: T;
  payload?: P;
};

export type Reducer<S, A extends Action<string, unknown>> = (
  state: S,
  action: A
) => S;
