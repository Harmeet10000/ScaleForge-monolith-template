# Security Policy

This document describes the security practices, expectations, and reporting process for the Production-Grade Authentication & Monolith Template.

## Scope

Applies to the codebase and deployment artifacts in this repository. Stack: Node.js (ESM), Express, MongoDB, Redis, Elasticsearch, AWS integrations (S3, Personalize), Docker.

## Reporting a Vulnerability

- Preferred: Open a private GitHub Security Advisory or email harmeetsinghfbd@gmail.com with "Security Vulnerability" in the subject.
- Include:
  1. Affected component/module
  2. Severity (Low, Medium, High, Critical)
  3. Proof-of-concept (code, screenshots, videos)
  4. Steps to reproduce
  5. Affected versions (if known)
  6. Potential mitigations (if any)
- Response timeline:
  - Acknowledgement: within 48 hours
  - Initial triage: within 5 business days
  - Fix/mitigation plan: communicated after triage

Do NOT post exploit details publicly until a fix or mitigation is available.

## Responsible Disclosure

- Avoid mass disclosure. Coordinate with maintainers to allow time for remediation.
- If you require PGP or alternate secure communication, request it in the initial contact.

## Supported Versions

- Only actively maintained branches and releases are covered. Pull requests addressing security will be prioritized.

## Secure Development Practices (Project-specific)

- Follow OWASP Top 10 mitigation guidance.
- Input validation: use Joi for all request validation; validate params, body, and queries.
- Use `httpError`, `asyncHandler`, and centralized `globalErrorHandler` for consistent error handling (see `/src/utils` and `/src/middlewares`).
- Use `httpResponse` for successful responses to avoid leaking internal details.
- Sanitize inputs: use express-mongo-sanitize and additional sanitizers for XSS/SQL-like payloads.
- Use Helmet and CSP headers; enforce secure cookies (HttpOnly, Secure, SameSite).

## Authentication & Secrets

- JWT secrets, DB URIs, API keys, and other secrets MUST be stored in environment variables (`.env.*`); never commit secrets.
- Rotate keys periodically. Use short-lived tokens where possible.
- Use dedicated IAM roles/policies for AWS resources (least privilege).
- For local development, use `.env.development` and add it to `.gitignore`.

## Passwords & Tokens

- Store passwords hashed with bcrypt (existing helpers use bcryptjs).
- Enforce strong password policies and rate-limit auth endpoints.
- Use refresh token rotation and session management via Redis.

## Data Protection

- Encrypt sensitive data at rest where applicable (database or storage-level encryption).
- Use TLS for all in-transit communication; require HTTPS in production.
- Backups to S3 should be encrypted and access-restricted.

## Redis & MongoDB Hardening

- Require authentication for Redis and MongoDB; bind to private network interfaces.
- Enable TLS between app and DB if supported by hosting.
- Use least-privilege DB users and network security groups.

## Elasticsearch

- Do not expose Elasticsearch directly to the public internet.
- Set vm.max_map_count and tune JVM heap as per Elastic recommendations if self-hosted.
- Enable authentication and TLS for production clusters.

## Container & Host Hardening

- Disable unnecessary services and swap on hosts running ES.
- Use non-root containers where possible.
- Scan images for vulnerabilities and keep base images updated.

## Dependency Management

- **Snyk Integration**: Automated vulnerability scanning via CI/CD with severity thresholds (high/critical fail builds)
- **Automated Security Patches**: Weekly Snyk fix PRs for vulnerable dependencies
- **Continuous Monitoring**: Real-time vulnerability alerts via Snyk dashboard
- Pin major third-party runtime dependencies and update on a schedule
- Remove unused packages (use `pnpm remove ...`) and scan for leftover imports
- Available commands: `npm run security:test`, `npm run security:fix`, `npm run security:monitor`

## CI / CD Security

- Store CI secrets in secure vaults or CI secret managers.
- Enforce PR reviews and require passing CI checks before merge.
- Run static analysis and linting in CI.

## Logging & Monitoring

- Use structured logging (`logger` utility) without logging secrets.
- Monitor auth anomalies, rate limiting, and failed login spikes.
- Integrate Prometheus metrics and alerting for critical incidents.

## Incident Response

- Triage and contain: revoke affected keys, rotate credentials, apply hotfix.
- Notify affected users and stakeholders per legal/regulatory requirements.
- Post-incident: root cause analysis and preventative measures documented.

## Automated Tools & Tests

- Use static analysis, dependency scanning, and secret detection in pre-commit / CI.
- Add unit/integration tests for security-critical flows (auth, token rotation, password reset).

## Acknowledgements

Following guidelines and patterns from the project's architecture: repository pattern, singleton connections, and centralized utilities for errors, logging, and responses.

For questions or to report issues: open a private GitHub Security Advisory or contact the project maintainers.
