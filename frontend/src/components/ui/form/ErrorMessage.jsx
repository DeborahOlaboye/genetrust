import { forwardRef } from 'react';
import { cn } from '../../../lib/utils';

const ErrorMessage = forwardRef(({ error, className, ...props }, ref) => {
  if (!error) return null;
  
  return (
    <p
      ref={ref}
      className={cn('text-sm font-medium text-destructive', className)}
      {...props}
    >
      {error.message}
    </p>
  );
});

ErrorMessage.displayName = 'ErrorMessage';

export { ErrorMessage };
