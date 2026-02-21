import { forwardRef } from 'react';
import { cn } from '../../../lib/utils';

const ErrorMessage = forwardRef(({ error, className, id, ...props }, ref) => {
  if (!error) return null;
  
  return (
    <p
      ref={ref}
      id={id}
      role="alert"
      aria-live="polite"
      className={cn('text-sm font-medium text-destructive', className)}
      {...props}
    >
      {error.message}
    </p>
  );
});

ErrorMessage.displayName = 'ErrorMessage';

export { ErrorMessage };
