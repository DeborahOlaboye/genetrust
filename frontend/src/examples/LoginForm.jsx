import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormField } from '../components/ui/form';
import { Button } from '../components/ui/Button';
import { emailSchema, passwordSchema } from '../lib/validations';

// Define the form schema using zod
const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  rememberMe: z.boolean().optional(),
});

const LoginForm = ({ onSubmit, isLoading }) => {
  const methods = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">Welcome back</h1>
        <p className="text-muted-foreground">Enter your credentials to sign in to your account</p>
      </div>
      
      <Form onSubmit={onSubmit} className="space-y-4">
        <FormField
          name="email"
          label="Email"
          type="email"
          placeholder="Enter your email"
          autoComplete="email"
        />
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium">Password</label>
            <a href="/forgot-password" className="text-sm text-primary hover:underline">
              Forgot password?
            </a>
          </div>
          <FormField
            name="password"
            type="password"
            placeholder="Enter your password"
            autoComplete="current-password"
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <FormField
            name="rememberMe"
            type="checkbox"
            render={({ field }) => (
              <input
                id="remember-me"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                {...field}
                value={undefined}
                checked={field.value}
                onChange={(e) => field.onChange(e.target.checked)}
              />
            )}
          />
          <label
            htmlFor="remember-me"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Remember me
          </label>
        </div>
        
        <Button 
          type="submit" 
          className="w-full"
          isLoading={isLoading}
        >
          Sign in
        </Button>
      </Form>
      
      <div className="mt-4 text-center text-sm">
        Don't have an account?{' '}
        <a href="/signup" className="font-medium text-primary hover:underline">
          Sign up
        </a>
      </div>
    </div>
  );
};

export default LoginForm;
