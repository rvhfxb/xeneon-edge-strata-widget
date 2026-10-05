# Changelog

## 0.1.5 — 2026-10-05

- Make Stop/Uninstall safe for Ready/Disabled tasks, including a task finishing during Stop.
- Recover a stale Running task from Start when the helper is unreachable and port 5199 is free; protect occupied ports.
- Default missing/null strataUrl to port 8086, improve invalid configuration errors and normalize localhost to 127.0.0.1.
- Remove query-enabled layout diagnostics from the shipping widget and inject them only from development tests.
- Clarify that psutil belongs in Strata, document log cleanup, and use ResizeObserver with resize events (timed fallback for older browsers).
- Restore UTF-8 comments in tokens.css, document the two local font URL substitutions and pin CSS hashes to Strata v0.1.39 in CI.

## 0.1.4 — 2026-10-05

- Package the standalone local helper, configuration, installation/start/stop/removal scripts and notices together with the iCUE widget.
- Preserve the header's theme selection when iCUE sends an update with unchanged settings; apply subsequent iCUE theme changes.
- Keep the official Strata v0.1.39 Monitor's numeric values and sample graphs, including idle Prefill samples of zero.
- Document requirements, import, helper conflicts, upgrade/recovery and verification limits. Add SHA-256 manifests and repeatable release packaging.

## 0.1.3

- Equalize all four metric-card columns in the fixed 2048×576 canvas.
- Two columns: state and metrics on the left, context and recent requests on the right.
