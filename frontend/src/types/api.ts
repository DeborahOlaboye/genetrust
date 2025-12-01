import { PaginationParams, PaginatedResponse } from '.';

// Request/Response types for API endpoints
export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
  statusCode: number;
}

export interface ApiRequestOptions<T = unknown> {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  data?: T;
  params?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  withCredentials?: boolean;
}

// Authentication
export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: UserProfile;
}

// User types
export interface UserProfile {
  id: string;
  email: string;
  username: string;
  avatar?: string;
  bio?: string;
  walletAddress?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileRequest {
  username?: string;
  avatar?: string;
  bio?: string;
}

// Wallet types
export interface WalletBalance {
  stx: string;
  fungibleTokens: Record<string, string>;
  nonFungibleTokens: Record<string, string[]>;
}

export interface Transaction {
  txId: string;
  sender: string;
  recipient: string;
  amount: string;
  fee: string;
  status: 'pending' | 'success' | 'failed';
  timestamp: string;
  memo?: string;
}

// Data marketplace types
export interface Dataset {
  id: string;
  name: string;
  description: string;
  owner: string;
  price: string;
  category: string;
  tags: string[];
  size: number;
  fileType: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export interface DatasetListParams extends PaginationParams {
  category?: string;
  owner?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'createdAt' | 'price' | 'size';
}

export interface DatasetListResponse extends PaginatedResponse<Dataset> {}

// Data request types
export interface DataRequest {
  id: string;
  datasetId: string;
  requester: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  purpose: string;
  price: string;
  createdAt: string;
  updatedAt: string;
  dataset?: Omit<Dataset, 'owner'>;
}

export interface CreateDataRequest {
  datasetId: string;
  purpose: string;
  price: string;
}

export interface UpdateDataRequestStatus {
  status: 'approved' | 'rejected';
  reason?: string;
}

// Analytics types
export interface AnalyticsData {
  totalUsers: number;
  totalDatasets: number;
  totalTransactions: number;
  totalVolume: string;
  recentTransactions: Transaction[];
  popularDatasets: Array<Dataset & { requestCount: number }>;
}

// API client interface
export interface IApiClient {
  request<T = unknown, D = unknown>(options: ApiRequestOptions<D>): Promise<T>;
  get<T = unknown>(
    url: string,
    params?: Record<string, string | number | boolean | undefined>,
    config?: Omit<ApiRequestOptions, 'url' | 'method' | 'params'>
  ): Promise<T>;
  post<T = unknown, D = unknown>(
    url: string,
    data?: D,
    config?: Omit<ApiRequestOptions<D>, 'url' | 'method' | 'data'>
  ): Promise<T>;
  put<T = unknown, D = unknown>(
    url: string,
    data?: D,
    config?: Omit<ApiRequestOptions<D>, 'url' | 'method' | 'data'>
  ): Promise<T>;
  delete<T = unknown>(
    url: string,
    config?: Omit<ApiRequestOptions, 'url' | 'method'>
  ): Promise<T>;
  patch<T = unknown, D = unknown>(
    url: string,
    data?: D,
    config?: Omit<ApiRequestOptions<D>, 'url' | 'method' | 'data'>
  ): Promise<T>;
}
