# WIT API Reference

## Interactive Documentation

The canonical API reference is auto-generated from source code:

- **Swagger UI**: [/docs](https://wit.anulectra.com/docs)
- **ReDoc**: [/redoc](https://wit.anulectra.com/redoc)
- **OpenAPI JSON**: [/openapi.json](https://wit.anulectra.com/openapi.json)

## Authentication

All endpoints require a JWT bearer token unless noted otherwise.

```
Authorization: Bearer <token>
```

Obtain a token via `POST /api/auth/register` or `POST /api/auth/login`.

API tokens (created at `POST /api/profile/tokens`) can also be used as bearer tokens.

## Rate Limiting

All endpoints are rate-limited to **60 requests per minute** per IP address.
The `/health` endpoint is exempt.

## Base URL

All API routes are prefixed with `/api` (e.g., `/api/auth/login`, `/api/workspaces`).

## WebSocket

Real-time board updates are available via WebSocket at `/ws/board/{project_id}?token=<jwt>`.
