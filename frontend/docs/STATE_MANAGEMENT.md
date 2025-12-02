# State Management

## Overview

The application uses a combination of React Context and custom hooks for state management.

## Global State

### Wallet State
- Manages wallet connection status
- Handles authentication
- Stores wallet address and balance

### App State
- Manages application-wide settings
- Handles theme and user preferences

## Local State

### Component State
- Use `useState` for local UI state
- Use `useReducer` for complex state logic
- Keep state as local as possible

## Data Fetching

- Use React Query for server state
- Implement custom hooks for data fetching
- Handle loading and error states

## Best Practices

1. Keep state as local as possible
2. Lift state up only when necessary
3. Use context for truly global state
4. Memoize expensive calculations
