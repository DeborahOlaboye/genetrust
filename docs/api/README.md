# GeneTrust API Documentation

This directory contains the OpenAPI/Swagger documentation for the GeneTrust API.

## Viewing the Documentation

### Online Documentation

The interactive API documentation is available at [https://docs.genetrust.com](https://docs.genetrust.com).

### Local Development

To view the API documentation locally, you can use any OpenAPI viewer. Here's how to set it up:

1. Install a local HTTP server if you don't have one:
   ```bash
   npm install -g http-server
   ```

2. Navigate to the docs directory and start the server:
   ```bash
   cd /path/to/genetrust/docs
   http-server -p 8080
   ```

3. Open your browser and go to:
   ```
   http://localhost:8080/api-docs
   ```

## API Structure

The API is organized into the following sections:

1. **Genetic Data** - Manage genetic data registration and access
2. **Marketplace** - List and discover genetic data
3. **Verification** - Zero-knowledge proof verification
4. **Compliance** - Consent and regulatory compliance

## Authentication

Most endpoints require authentication using Stacks Connect. Include the JWT token in the `Authorization` header:

```
Authorization: Bearer <your-jwt-token>
```

## Error Handling

API errors follow the standard HTTP status codes. Error responses include a JSON body with details:

```json
{
  "error": "Error description",
  "details": [
    {
      "field": "fieldName",
      "message": "Error message"
    }
  ]
}
```

## Rate Limiting

API requests are rate limited to prevent abuse. The current limits are:

- 100 requests per minute per IP address
- 1000 requests per hour per authenticated user

## Versioning

The API is versioned. The current version is `v1`.

## Support

For support, please contact [support@genetrust.com](mailto:support@genetrust.com).
