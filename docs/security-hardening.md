# Security Hardening (Render + Edge)

Checklist operationnelle rapide pour durcir le deploiement en production.

## 1) Edge / WAF

- Activer un WAF (Cloudflare ou equivalent) devant l'application.
- Activer Bot Fight / challenge sur endpoints sensibles:
  - `/api/auth/login`
  - `/api/auth/verify-2fa`
  - `/api/messages`
  - `/api/comments`
  - `/api/subscribe`
- Ajouter un rate limit edge supplementaire (en plus du backend).

## 2) Secrets & Access

- Rotation reguliere des secrets:
  - `JWT_ACCESS_SECRET`
  - `JWT_REFRESH_SECRET`
  - `JWT_MFA_SECRET`
  - `MFA_ENCRYPTION_KEY`
  - `MFA_RECOVERY_PEPPER`
  - `RECAPTCHA_SECRET_KEY`
  - `BREVO_API_KEY`
- Interdire toute valeur par defaut en production.
- Restreindre les acces Render (MFA obligatoire pour comptes team).

## 3) Configuration Backend

- Verifier `TRUST_PROXY` en production (souvent `1` derriere proxy).
- Configurer `TRUSTED_ORIGINS`, `FRONTEND_URL`, `CORS_ORIGINS`.
- Garder `RATE_LIMIT_REDIS_URL` actif pour limiter distribue.
- Verifier les seuils d'alertes:
  - `SECURITY_ALERT_CRITICAL_EVENTS_MIN`
  - `SECURITY_ALERT_AUTH_FAILURES_MIN`
  - `SECURITY_ALERT_BLOCKED_ORIGINS_MIN`
  - `SECURITY_ALERT_RATE_LIMIT_HITS_MIN`

## 4) Monitoring & Incident Response

- Surveiller `/api/admin/security/summary` (ou dashboard admin).
- Alerter en cas de pic:
  - `criticalEvents`
  - `authFailures`
  - `blockedOrigins`
  - `rateLimitHits`
- Definir un runbook incident:
  - rotation de secrets
  - blocage IP / ASN / pays au niveau edge
  - communication interne

## 5) CI Security Hygiene

- Lancer regulierement:
  - `npm run security:solid`
  - `npm run security:audit`
  - `npm run security:check`
- Bloquer un merge si audit high/critical non traite.
