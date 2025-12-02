import { forwardRef } from 'react';
import { FormProvider, useFormContext } from './FormContext';
import { cn } from '../../../lib/utils';

const Form = forwardRef(({ 
  children, 
  onSubmit, 
  className,
  ...props 
}, ref) => {
  const methods = useFormContext();
  
  return (
    <FormProvider {...methods}>
      <form 
        ref={ref}
        onSubmit={onSubmit ? methods.handleSubmit(onSubmit) : undefined}
        className={cn('space-y-6', className)}
        {...props}
      >
        {children}
      </form>
    </FormProvider>
  );
});

Form.displayName = 'Form';

export { Form };
