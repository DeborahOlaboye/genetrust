import { ReactNode, ComponentType, SVGProps } from 'react';
import { WalletState } from './wallet';

// Common component props
export interface BaseProps {
  className?: string;
  children?: ReactNode;
  style?: React.CSSProperties;
  'data-testid'?: string;
}

export interface WithChildren {
  children: ReactNode;
}

export interface WithClassName {
  className?: string;
}

// Layout components
export interface LayoutProps extends WithChildren {
  header?: ReactNode;
  footer?: ReactNode;
  sidebar?: ReactNode;
  isSidebarOpen?: boolean;
  onSidebarToggle?: () => void;
}

// Button component
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends BaseProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

// Input components
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftElement?: ReactNode;
  rightElement?: ReactNode;
  containerClassName?: string;
}

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  rows?: number;
  containerClassName?: string;
}

// Form components
export interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  onSubmit: (data: FormData) => void | Promise<void>;
  onError?: (errors: Record<string, string>) => void;
  className?: string;
  children: ReactNode;
}

// Modal components
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnOverlayClick?: boolean;
  closeOnEsc?: boolean;
  hideCloseButton?: boolean;
  footer?: ReactNode;
  className?: string;
  overlayClassName?: string;
  contentClassName?: string;
}

// Card components
export interface CardProps extends BaseProps {
  variant?: 'elevated' | 'outline' | 'filled';
  hoverEffect?: boolean;
  onClick?: () => void;
}

export interface CardHeaderProps extends BaseProps {
  title: ReactNode;
  subheader?: ReactNode;
  avatar?: ReactNode;
  action?: ReactNode;
}

// Table components
export interface ColumnDefinition<T> {
  key: string;
  header: string | ReactNode;
  cell: (item: T) => ReactNode;
  sortable?: boolean;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
}

export interface TableProps<T> {
  columns: ColumnDefinition<T>[];
  data: T[];
  keyField?: string;
  isLoading?: boolean;
  emptyState?: ReactNode;
  onRowClick?: (item: T) => void;
  className?: string;
  headerClassName?: string;
  rowClassName?: string | ((item: T) => string);
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (sortBy: string, sortDirection: 'asc' | 'desc') => void;
}

// Wallet components
export interface WalletConnectButtonProps {
  onConnect?: (walletState: WalletState) => void;
  onDisconnect?: () => void;
  className?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export interface WalletBalanceProps {
  showSymbol?: boolean;
  showFiatValue?: boolean;
  className?: string;
}

// Toast notification
export interface ToastProps {
  id: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onClose?: (id: string) => void;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Icon component
export type IconProps = SVGProps<SVGSVGElement> & {
  size?: number | string;
  color?: string;
  className?: string;
};

// Lazy loading
export type LazyComponent = ComponentType<unknown>;

export interface LazyComponentProps {
  fallback?: ReactNode;
  [key: string]: unknown;
}

// Error boundary
export interface ErrorBoundaryProps extends WithChildren {
  fallback?: ReactNode | ((error: Error, resetError: () => void) => ReactNode);
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

// Loading state
export interface LoadingStateProps {
  isLoading: boolean;
  children: ReactNode;
  fallback?: ReactNode;
  className?: string;
}

// Empty state
export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}
