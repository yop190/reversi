# Security Architecture Documentation

## Reversi Application - Production Security Hardening

### Table of Contents
1. [Overview](#overview)
2. [Authentication & Authorization](#authentication--authorization)
3. [Secrets Management](#secrets-management)
4. [CI/CD Security Pipeline](#cicd-security-pipeline)
5. [WebSocket Security](#websocket-security)
6. [Infrastructure Security](#infrastructure-security)
7. [Security Checklist](#security-checklist)

---

## Overview

This document describes the security architecture for the Reversi multiplayer game application. The system is designed to be:

- **Stateless**: No server-side sessions, JWT-based authentication
- **Secure by default**: All endpoints protected, HTTPS enforced
- **Zero-trust**: Every request authenticated and authorized
- **Secrets-free codebase**: All secrets in Azure Key Vault

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              INTERNET                                        │
│                                                                              │
│  ┌──────────────┐         ┌──────────────┐         ┌──────────────────────┐ │
│  │   Browser    │────────▶│   Cloudflare │────────▶│  Azure Container     │ │
│  │   (SPA)      │  HTTPS  │   (DNS/CDN)  │  HTTPS  │  Apps Environment    │ │
│  └──────────────┘         └──────────────┘         │                      │ │
│        │                                           │  ┌────────────────┐  │ │
│        │ OAuth                                     │  │   Frontend     │  │ │
│        ▼                                           │  │   (Nginx)      │  │ │
│  ┌──────────────┐                                  │  │   Port 80      │  │ │
│  │   Google     │                                  │  └────────┬───────┘  │ │
│  │   OAuth 2.0  │                                  │           │          │ │
│  └──────────────┘                                  │           ▼          │ │
│                                                    │  ┌────────────────┐  │ │
│                                                    │  │   Backend      │  │ │
│                                                    │  │   (NestJS)     │  │ │
│                                                    │  │   Port 3001    │  │ │
│                                                    │  │   + WebSocket  │  │ │
│                                                    │  └────────┬───────┘  │ │
│                                                    │           │          │ │
│                                                    └───────────┼──────────┘ │
│                                                                │            │
└────────────────────────────────────────────────────────────────┼────────────┘
                                                                 │
                    ┌────────────────────────────────────────────┼────────────┐
                    │                   AZURE                    │            │
                    │                                            ▼            │
                    │  ┌────────────────┐         ┌────────────────────────┐  │
                    │  │  Azure Key     │────────▶│   Google Cloud         │  │
                    │  │  Vault         │ Secrets │   Firestore            │  │
                    │  │  (Secrets)     │         │   (Score Storage)      │  │
                    │  └────────────────┘         └────────────────────────┘  │
                    │                                                         │
                    └─────────────────────────────────────────────────────────┘
```

---

## Authentication & Authorization

### Google OAuth 2.0 (ONLY authentication method)

**Why Google OAuth only?**
- No password management complexity
- No credential storage liability
- Leverages Google's security infrastructure
- Reduces attack surface

### Authentication Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │     │  Google  │     │  Backend │     │ Firestore│
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │
     │ 1. Click "Sign in with Google"  │                │
     │───────────────▶│                │                │
     │                │                │                │
     │ 2. Google Login Dialog          │                │
     │◀───────────────│                │                │
     │                │                │                │
     │ 3. User Authenticates           │                │
     │───────────────▶│                │                │
     │                │                │                │
     │ 4. ID Token (JWT)               │                │
     │◀───────────────│                │                │
     │                │                │                │
     │ 5. POST /auth/google/token      │                │
     │────────────────────────────────▶│                │
     │                │                │                │
     │                │ 6. Verify ID Token              │
     │                │◀───────────────│                │
     │                │                │                │
     │                │ 7. Token Valid │                │
     │                │───────────────▶│                │
     │                │                │                │
     │                │                │ 8. Create/Update User
     │                │                │───────────────▶│
     │                │                │                │
     │ 9. App JWT + User Info          │                │
     │◀────────────────────────────────│                │
     │                │                │                │
     │ 10. Store JWT in localStorage   │                │
     │                │                │                │
```

### JWT Token Structure

```json
{
  "sub": "user_12345",          // User ID
  "googleId": "google_user_id", // Google's user ID
  "email": "user@example.com",  // User's email
  "displayName": "John Doe",    // Display name
  "iat": 1642000000,           // Issued at
  "exp": 1642604800            // Expires in 7 days
}
```

### Authorization Rules

| Endpoint | Authentication | Authorization |
|----------|---------------|---------------|
| `POST /auth/google/token` | None | Public |
| `GET /auth/me` | JWT Required | Own profile only |
| `GET /scores/leaderboard` | JWT Required | Read-only |
| `GET /scores/me` | JWT Required | Own score only |
| WebSocket Connection | JWT Required | Authenticated users |
| WebSocket Game Events | JWT Required | Room participants |

---

## Secrets Management

### Azure Key Vault Configuration

All secrets are stored in Azure Key Vault (`kv-reversi-prod`):

| Secret Name | Description | Used By |
|-------------|-------------|---------|
| `google-oauth-client-id` | Google OAuth Client ID | Backend |
| `google-oauth-client-secret` | Google OAuth Client Secret | Backend |
| `jwt-secret` | JWT signing key | Backend |
| `firebase-service-account` | Firebase/Firestore credentials | Backend |

### Secrets Flow

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  GitHub Actions  │────▶│  Azure Key Vault │────▶│  Container App   │
│  (CI/CD)         │     │  (Secrets Store) │     │  (Runtime)       │
└──────────────────┘     └──────────────────┘     └──────────────────┘
        │                        │                        │
        │ 1. Azure Login         │                        │
        │ (Service Principal)    │                        │
        │                        │                        │
        │ 2. Fetch Secrets       │                        │
        │───────────────────────▶│                        │
        │                        │                        │
        │ 3. Secrets (masked)    │                        │
        │◀───────────────────────│                        │
        │                        │                        │
        │ 4. Inject as Env Vars  │                        │
        │────────────────────────────────────────────────▶│
        │                        │                        │
```

### No Secrets In:
- ❌ Source code
- ❌ GitHub repository
- ❌ Docker images
- ❌ Logs
- ✅ Azure Key Vault ONLY

---

## CI/CD Security Pipeline

### Security Gate (Blocking)

The deployment pipeline includes mandatory security checks that **block deployment** if any issue is detected.

```yaml
Security Gate:
  ├── Dependency Vulnerability Scan (SCA)
  │   ├── npm audit --audit-level=high (Frontend)
  │   └── npm audit --audit-level=high (Backend)
  │
  ├── Secret Scanning
  │   └── Gitleaks (detect secrets in code)
  │
  ├── Static Analysis (SAST)
  │   └── ESLint Security Plugin
  │
  ├── Container Security
  │   └── Trivy (HIGH/CRITICAL vulnerabilities)
  │
  └── Infrastructure Security
      └── Dockerfile best practices
```

### Pipeline Stages

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Security   │───▶│   Build &   │───▶│   Deploy    │───▶│   Verify    │
│    Gate     │    │    Test     │    │             │    │             │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
     │ FAIL?              │                  │                  │
     ▼                    │                  │                  │
   BLOCK                  │                  │                  │
 DEPLOYMENT               │                  │                  │
```

### Blocking Conditions

| Check | Blocks On |
|-------|-----------|
| Dependency Scan | HIGH or CRITICAL vulnerabilities |
| Secret Scan | Any detected secret |
| SAST | Critical security issues |
| Container Scan | HIGH or CRITICAL CVEs |

---

## WebSocket Security

### Connection Authentication

```javascript
// Client connects with JWT token
const socket = io(serverUrl, {
  auth: { token: jwtToken },
  query: { token: jwtToken },
});
```

### Server-side Validation

```typescript
// Backend validates on connection
handleConnection(client: Socket) {
  const token = this.extractToken(client);
  
  if (!token) {
    client.emit('error', { code: 'AUTH_REQUIRED' });
    client.disconnect(true);
    return;
  }
  
  const user = this.jwtService.verify(token);
  client.user = user; // Attach to socket
}
```

### Game State Integrity

The backend is the **single source of truth** for game state:

- ✅ Server validates all moves
- ✅ Server calculates scores
- ✅ Server determines game outcome
- ❌ Client cannot manipulate game state
- ❌ Client cannot fake moves

```typescript
// All game logic server-side
@SubscribeMessage('client:makeMove')
handleMakeMove(client: Socket, payload: MovePayload) {
  // Verify player identity
  const playerColor = this.getPlayerColor(client.id);
  
  // Validate move server-side
  const isValid = this.gameService.validateMove(
    gameState, 
    payload.row, 
    payload.col, 
    playerColor
  );
  
  if (!isValid) {
    return { error: 'Invalid move' };
  }
  
  // Apply move server-side
  const newState = this.gameService.applyMove(...);
  
  // Broadcast to all players
  this.server.to(roomId).emit('gameStateUpdate', newState);
}
```

---

## Infrastructure Security

### HTTPS Enforcement

- Azure Container Apps handles TLS termination
- All external traffic is HTTPS only
- Internal container communication uses HTTP (within Azure network)

### Container Security

```dockerfile
# Non-root user
RUN addgroup -g 1001 -S app-user && \
    adduser -S app-user -u 1001 -G app-user

USER app-user

# Health checks
HEALTHCHECK --interval=30s --timeout=3s \
    CMD wget --spider http://localhost:80/health || exit 1
```

### Network Security

- Containers run in isolated Azure Container Apps Environment
- Only exposed ports: 80 (frontend), 3001 (backend)
- Internal communication within Azure VNET

---

## Security Checklist

### Pre-Deployment

- [ ] All secrets in Azure Key Vault
- [ ] No hardcoded credentials in code
- [ ] Security pipeline passes
- [ ] Dependencies updated
- [ ] Container images scanned

### Authentication

- [ ] Google OAuth configured correctly
- [ ] JWT secret is strong (256+ bits)
- [ ] Token expiration set (7 days)
- [ ] Invalid tokens rejected

### WebSocket

- [ ] Connection requires valid JWT
- [ ] Unauthenticated clients disconnected
- [ ] Game state validated server-side
- [ ] User identity tied to socket

### Runtime

- [ ] HTTPS enforced
- [ ] CORS configured correctly
- [ ] Rate limiting enabled
- [ ] Error messages don't leak info

---

## Incident Response

### If Secrets Are Compromised

1. Immediately rotate secrets in Azure Key Vault
2. Redeploy all containers
3. Invalidate all existing JWTs
4. Review access logs
5. Notify affected users if necessary

### Security Contact

For security vulnerabilities, contact: security@lebrere.fr
