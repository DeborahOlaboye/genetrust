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
  ...props 
}, ref) => {
  const { control, formState: { errors } } = useFormContext();
  const error = errors?.[name];

  return (
    <div className={cn('space-y-2', className)}>
      {label && <Label htmlFor={name}>{label}</Label>}
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          render ? 
            render({ field, fieldState: { error } }) :
            <input
              {...field}
              id={name}
              ref={ref}
              className={cn(
                'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
                error && 'border-destructive'
              )}
              {...props}
            />
        )}
      />
      <ErrorMessage error={error} />
    </div>
  );
});

FormField.displayName = 'FormField';

export { FormField };
