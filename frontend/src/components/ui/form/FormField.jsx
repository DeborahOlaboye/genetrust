import { forwardRef } from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { Label } from './Label';
import { ErrorMessage } from './ErrorMessage';
import { cn } from '../../../lib/utils';

const FormField = forwardRef(({ 
  name,
  label,
  description,
  className,
  render,
  required = false,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  ...props 
}, ref) => {
  const { control, formState: { errors } } = useFormContext();
  const error = errors?.[name];
  
  // Generate unique IDs for accessibility
  const fieldId = props.id || name;
  const descriptionId = description ? `${fieldId}-description` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  
  // Combine aria-describedby values
  const describedBy = [descriptionId, errorId, ariaDescribedBy]
    .filter(Boolean)
    .join(' ') || undefined;

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label 
          htmlFor={fieldId}
          className={cn(required && 'after:content-["*"] after:ml-0.5 after:text-destructive')}
        >
          {label}
          {required && <span className="sr-only"> (required)</span>}
        </Label>
      )}
      {description && (
        <p 
          id={descriptionId}
          className="text-sm text-muted-foreground"
        >
          {description}
        </p>
      )}
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          render ? 
            render({ 
              field: {
                ...field,
                'aria-invalid': !!error,
                'aria-describedby': describedBy,
                'aria-label': ariaLabel,
                'aria-required': required,
              }, 
              fieldState: { error },
              fieldId,
              describedBy
            }) :
            <input
              {...field}
              id={fieldId}
              ref={ref}
              required={required}
              aria-invalid={!!error}
              aria-describedby={describedBy}
              aria-label={ariaLabel}
              aria-required={required}
              className={cn(
                'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
                error && 'border-destructive focus-visible:ring-destructive'
              )}
              {...props}
            />
        )}
      />
      <ErrorMessage error={error} id={errorId} />
    </div>
  );
});

FormField.displayName = 'FormField';

export { FormField };
