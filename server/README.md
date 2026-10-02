# Local answer-service migration

Not deployed. Do not publish the game frontends before the central API is configured and verified.

- `TRPUZZLE_SERVER_KEY`: 32-byte hex key, currently only in ignored `.env` (0600). Back up securely. Never commit, paste into logs, put into `netlify.toml`, or expose through a Vite/public variable.
- `TRPUZZLE_SERVER_START`: immutable YYYY-MM-DD cutover. Local preview uses 2026-10-03. At eventual deployment choose a future Turkey calendar day, after every frontend and the API are ready. Before this date old schedules and legacy saves are retained. Changing this after activation changes keyed puzzles and invalidates tokens.
- Netlify runtime environment must contain both values before activation. No runtime settings have been applied to Netlify. The key must match `server/catalog.enc`.
- The central site's function bundles `server/catalog.enc` outside `dist`. Static builds reject `server/`, `netlify/`, dotfiles, tools and tests. Failure to configure/decrypt fails closed (503), never falls back to client answers.
- All game clients use `/api/game`. The main site's existing game reverse proxies preserve this same-origin URL. The eight game configs include a same-origin API proxy for their independent Netlify domains; the service permits those exact known origins.
- Regenerate each static game's `dist` with `python3 tools/build_publish.py`; Tilkile first needs `python3 assemble.py`. Şehirle uses its existing Vite build. Then build the homepage.
- Local preview: `node tools/preview_server.mjs` (127.0.0.1:8099). It serves only built local files, with no live-game proxy. A separate QA process can set `PORT=8098 TRPUZZLE_PREVIEW_DATE=2026-10-03` to test launch boundaries; its injected clock never enters published files.
- Catalog maintenance: edit ignored `.server-private/catalog.json`, then `node tools/catalog.mjs encrypt`. For a new machine, restore the secret securely, run `node tools/catalog.mjs decrypt`, then edit. `import_legacy_catalog.mjs` is the one-time pre-migration importer and cannot be rerun after removing client tables.

## Security boundary

AES-256-GCM authenticates/encrypts resumable state; HMAC-derived private selection protects new hidden daily answers even when source repos are public. Legacy schedules already published cannot be made secret retroactively. Bağla's authored schedule is encrypted and dates are checked by the server. Answer reveal remains available at game end, including the existing give-up controls in Arala and Şehirle. Kesme's visible geometry and daily shape schedule remain public; the server verifies the actual cut/score.

No database, accounts or paid third-party service was added. One start/resume request and one request per valid move are needed. No polling or prefetch of all archives. Serverless execution still consumes provider usage; an IP rate limit is not a global spending cap. Netlify's deployed rate-limit enforcement must be checked in deploy logs when publication is eventually authorized.

Tokens are stateless. Retrying the same token + move returns the same view and does not charge a second attempt. A determined user can branch an older token, create new sessions or alter their local statistics. This is not authoritative leaderboard/anti-cheat protection; that would need server-side session storage. Never promote local stats to a trusted leaderboard.

Arala's percentage/fraction clues can mathematically reveal the answer's dictionary position; removing that inference would change its rules, which this migration deliberately does not do. Only clues currently visible are returned. Similarly, distance and letter clues permit legitimate deduction. The objective is to remove direct access to hidden/future answer schedules, not to prevent deduction or automate-proof all puzzles.

## Local verification (2026-10-02)

54 Node tests and 3 publication-boundary tests pass. All eight games were exercised in the local browser, including saved-game resume, server-scored moves and Bağla’s 3 October launch fixture. Production builds and `git diff --check` pass across the nine repositories. Source changes are committed with [skip netlify] to prevent automatic publication. No deployment or Netlify runtime configuration was performed. Provider-side function packaging and rate-limit enforcement remain deployment checks.

Kesme integration: the remote main collection (500 daily silhouettes from 2026-10-02, 300 independent practice silhouettes, archive from 2026-10-01) is included. Both renderer and server scoring account for holes and multiple contours; old completed records keep their stored shape.
