# Code Style Guide

This document outlines the coding standards and best practices for the GeneTrust project. All code should follow these guidelines to maintain consistency and readability across the codebase.

## Table of Contents
1. [General Principles](#general-principles)
2. [JavaScript/TypeScript](#javascripttypescript)
3. [React Components](#react-components)
4. [Naming Conventions](#naming-conventions)
5. [Formatting](#formatting)
6. [Imports](#imports)
7. [Error Handling](#error-handling)
8. [Testing](#testing)
9. [Documentation](#documentation)
10. [Git Commit Messages](#git-commit-messages)

## General Principles

- **Consistency**: Follow the existing code style in the codebase.
- **Readability**: Write code that is easy to understand and maintain.
- **Simplicity**: Prefer simple, clear solutions over clever ones.
- **Performance**: Write efficient code, but not at the cost of readability.
- **Security**: Follow security best practices, especially for handling sensitive data.

## JavaScript/TypeScript

### Variable Declarations
- Use `const` by default, `let` when reassignment is needed.
- Avoid using `var`.
- Declare one variable per declaration.
- Use meaningful, descriptive names.

```typescript
// Good
const userCount = 10;
let isLoading = false;

// Bad
var count = 10;
let flag = false, name = 'test';
```

### Functions
- Use named functions for better stack traces.
- Use default parameters instead of modifying function arguments.
- Keep functions small and focused on a single responsibility.
- Use arrow functions for callbacks and methods.

```typescript
// Good
function calculateTotal(items: Item[]): number {
  return items.reduce((total, item) => total + item.price, 0);
}

// Bad
const calculateTotal = (items) => {
  let total = 0;
  items.forEach(item => {
    total += item.price;
  });
  return total;
};
```

### Types
- Always use TypeScript types/interfaces for function parameters and return types.
- Avoid using `any` type; be as specific as possible.
- Use type guards for type narrowing.

```typescript
// Good
interface User {
  id: string;
  name: string;
  email: string;
}

function getUserName(user: User): string {
  return user.name;
}

// Bad
function getUserName(user: any): any {
  return user.name;
}
```

## React Components

### Component Structure
- Use functional components with hooks.
- Keep components small and focused.
- Extract reusable logic into custom hooks.
- Use proper TypeScript types for props and state.

```typescript
// Good
interface UserProfileProps {
  user: User;
  onUpdate: (user: User) => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ user, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  
  return (
    <div className="user-profile">
      {/* Component JSX */}
    </div>
  );
};
```

### Hooks
- Follow the Rules of Hooks.
- Extract complex logic into custom hooks.
- Name custom hooks with `use` prefix.
- Keep hooks at the top level of your component.

```typescript
// Good
function useUserData(userId: string) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const data = await fetchUserData(userId);
        setUser(data);
      } catch (error) {
        console.error('Failed to fetch user:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUser();
  }, [userId]);
  
  return { user, isLoading };
}
```

## Naming Conventions

### Files and Directories
- Use kebab-case for file and directory names.
- Use PascalCase for React component files.
- Use `.tsx` for React components and `.ts` for non-React TypeScript files.

```
components/
  user-profile/
    UserProfile.tsx
    UserProfile.styles.ts
    UserProfile.test.tsx
    index.ts
```

### Variables and Functions
- Use camelCase for variables and functions.
- Use PascalCase for classes and React components.
- Use UPPER_CASE for constants.
- Prefix boolean variables with `is`, `has`, `should`, etc.

```typescript
// Good
const MAX_RETRY_COUNT = 3;
const userProfile = {};
const hasPermission = true;

class UserService {}

// Bad
const max_retry_count = 3;
const UserProfile = {};
const permission = true;
```

## Formatting

- Use 2 spaces for indentation.
- Use single quotes for strings.
- Use template literals for string interpolation.
- Always use semicolons.
- Use trailing commas in multiline object/array literals.
- Keep lines under 100 characters.
- Add a single empty line at the end of files.

```typescript
// Good
const user = {
  id: '123',
  name: 'John Doe',
  email: 'john@example.com',
};

// Bad
const user = {id: '123', name: 'John Doe', email: 'john@example.com'};
```

## Imports

- Group imports in the following order:
  1. Node.js built-in modules
  2. External modules
  3. Internal modules (absolute imports)
  4. Relative imports
  5. Type imports
- Separate each group with a blank line.
- Use absolute imports when possible.

```typescript
// Good
import fs from 'fs';
import path from 'path';

import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';

import { User } from 'types';
import { fetchUser } from 'api/user';

import { Button } from '../Button';
import styles from './UserProfile.module.css';

// Bad
import { Button } from '../Button';
import { fetchUser } from 'api/user';
import React, { useState, useEffect } from 'react';
import { User } from 'types';
import { useDispatch } from 'react-redux';
import styles from './UserProfile.module.css';
```

## Error Handling

- Always handle errors appropriately.
- Use try/catch for async/await.
- Provide meaningful error messages.
- Log errors for debugging.
- Use custom error classes when needed.

```typescript
// Good
try {
  const data = await fetchData();
  // Process data
} catch (error) {
  console.error('Failed to fetch data:', error);
  // Show user-friendly error message
  showErrorToast('Failed to load data. Please try again.');
}

// Bad
const data = await fetchData().catch(() => {});
```

## Testing

- Write unit tests for utility functions and custom hooks.
- Write integration tests for components.
- Use descriptive test names.
- Follow the Arrange-Act-Assert pattern.
- Mock external dependencies.

```typescript
describe('calculateTotal', () => {
  it('should return 0 for empty array', () => {
    // Arrange
    const items: Item[] = [];
    
    // Act
    const result = calculateTotal(items);
    
    // Assert
    expect(result).toBe(0);
  });
});
```

## Documentation

- Document public APIs with JSDoc.
- Keep comments up-to-date.
- Explain why, not what.
- Use markdown for formatting.

```typescript
/**
 * Calculates the total price of items in the cart.
 * @param items - Array of cart items with price and quantity
 * @returns The total price including tax
 */
function calculateTotal(items: CartItem[]): number {
  // Implementation
}
```

## Git Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools

### Examples
```
feat(auth): add login with Google

Add support for Google OAuth authentication.

Closes #123
```

```
fix(api): handle null response in user endpoint

Prevent null reference error when user data is not found.

Fixes #456
```

## Linting and Formatting

- Run `npm run lint` to check for linting errors.
- Run `npm run lint:fix` to automatically fix linting issues.
- Run `npm run format` to format the code.
- Configure your editor to format on save using Prettier and ESLint.

## Editor Configuration

- Install the recommended extensions from `.vscode/extensions.json`.
- Enable "Format On Save" in your editor settings.
- Install the ESLint and Prettier extensions for your editor.

## Pre-commit Hooks

Pre-commit hooks are configured to run:
- ESLint
- Prettier
- Type checking
- Tests

These will run automatically when you commit changes. Fix any issues before pushing your code.
