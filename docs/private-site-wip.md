# Private site — unfinished security work

**Do not merge or enable `PRIVATE_SITE_MODE` in production.** This branch is a work-in-progress, not a security guarantee.

The prototype includes owner code + TOTP, private route gating, legacy session rejection, a closed-site contact form and a private inbox. The normal sign-in/sign-up code is preserved. Local checks cover factor matching, replay denial, some route gate decisions, and TypeScript only. They do not prove end-to-end security.

Before enabling:
- Verify the owner's exact account exists, is unblocked and has `SUPER_ADMIN`; verify recovery and backups out of band.
- Provision and test private secrets outside Git and chat: owner bcrypt password hash, TOTP seed, independent rate-limit HMAC key, unique access epoch. Do not enable if the security database or its TTL index is unavailable. Test enrollment and recovery with the actual owner's authenticator.
- Rotate the Auth.js secret at activation to invalidate old tokens permanently, with a tested rollback plan. Private mode rejects old tokens but merely turning it off could otherwise revive unexpired old tokens.
- Test MongoDB production rate limits and replay protection across instances, legacy sign-in and registration, all routes, server actions, NextAuth APIs, CORS, CSRF, cache, cron and MCP integration endpoints; ensure every retained integration has a strong independent secret. The global limits can create a denial-of-service risk and must be reviewed.
- Test MongoDB writes, retention and spam protections; verify the outgoing Resend domain and send/receive flow with the owner. Visitor counts are approximate page loads, not verified identities, and can be missed when the security database is unavailable.
- Audit direct R2/Azure/public files, CDN cache, static assets, old PWA caches, alternative domains and any public repository content. Application middleware alone cannot make already-public or downloaded files private.
- Test real login with correct/wrong codes, OTP replay, lockouts and server clock drift in a safe preview. Have a recovery path and test admin access before enforcing in production.
- Audit privacy notice, message retention, permissions, abuse and production monitoring. No assurance of complete privacy can be made before this work is finished.
