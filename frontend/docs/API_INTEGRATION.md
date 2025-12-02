# API Integration

## Overview

The application interacts with several APIs:

1. **Blockchain API**: For wallet and smart contract interactions
2. **File Storage**: For dataset storage
3. **Authentication**: For user management

## Services

### Wallet Service
Handles all blockchain wallet interactions.

```javascript
// Example usage
import { walletService } from '../services/walletService';

// Connect wallet
const address = await walletService.connect();
```

### API Service
Handles all HTTP requests.

```javascript
// Example usage
import api from '../services/api';

// Fetch datasets
const { data } = await api.get('/datasets');
```

## Error Handling

- Use try/catch for async operations
- Display user-friendly error messages
- Log errors for debugging

## Authentication

All API requests are authenticated using JWT tokens.
