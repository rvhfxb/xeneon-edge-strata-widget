# Strata Edge 0.2.0

[日本語](README.md) | [English](README.en.md)

An iCUE widget that brings Strata Web UI's Monitor to XENEON EDGE (2560×720). View model status, generation speed, GPU and memory usage, and recent requests.

[Download](https://github.com/rvhfxb/xeneon-edge-strata-widget/releases/tag/v0.2.0)

Use the ZIP with the bundled helper for a first installation. If a compatible helper is already running, update with the `.icuewidget` file alone.

## Screenshots

Browser previews at 2560×720.

**Dark**

![Strata Edge dark theme](docs/images/strata-edge-dark-preview.png)

**Light**

![Strata Edge light theme](docs/images/strata-edge-light-preview.png)

## Requirements

- Windows 11, XENEON EDGE, and iCUE 5.51 or later
- Node.js 22 or later on PATH
- Strata running on the same PC (supports DeepSeek / Qwen in v0.2.4 releases)
- `/health` and `/metrics` accessible without an API key

## Installation

1. Extract `strata-edge-0.2.0.zip` into a writable folder.
2. Set `strataUrl` in `helper.config.json` to your running Strata server. The default is `http://127.0.0.1:8086`.
3. Run `Install-Helper.cmd`. The helper starts immediately and automatically at subsequent Windows logons.
4. Open `http://127.0.0.1:5199/` in a browser and check that the model name and status appear.
5. Import the included `strata-edge-0.2.0.icuewidget` into iCUE and place it across the full XENEON EDGE display.

Example connection settings:

```json
{
  "strataUrl": "http://127.0.0.1:8080"
}
```

Only local HTTP servers are supported. Specify Strata's address and port without an API path such as `/v1`.

To preserve settings across updates, create `helper.local.json` using the same format. Its settings take precedence. Stop and restart the helper after changing the configuration.

Keep the extracted folder and Node.js location unchanged after installation.

## Start, stop, and update

| File | Action |
| --- | --- |
| `Start-Helper.cmd` | Start the helper. Also re-enables logon startup if disabled. |
| `Stop-Helper.cmd` | Stop the helper. The logon startup setting is preserved. |
| `Uninstall-Helper.cmd` | Stop the helper and remove its logon task. |

To update: Stop → replace files with the new version → Install → import the new `.icuewidget`. When moving folders, Uninstall from the old folder before running Install in the new one. Remove the widget separately in iCUE.

To temporarily disable logon startup, run the following command, then Stop. Use Start to restore it.

```powershell
Disable-ScheduledTask -TaskName 'Strata Edge Helper'
```

An existing helper can be shared if it serves `127.0.0.1:5199/api/snapshot`. To replace it, stop it and disable its logon startup first.

## Display behavior

- Uses Strata Web UI's colors, font, and cards, with dark and light themes.
- Shows speed, GPU load, VRAM, temperature, power, PCIe, CPU, RAM, disk reads, context, conversation cache, and recent requests.
- Speed numbers and graphs follow the official Monitor. Numbers show current values during processing and the last request's average while idle. Graphs show the last 60 seconds, so the Prefill graph can be zero while a speed number remains visible.
- Updates every two seconds. Failed requests and data older than 10 seconds show unavailable values. Fields Strata does not provide are shown as “–”.
- Context fill estimates input plus output token occupancy. Disk read monitoring requires psutil in Strata's Python environment.

## Troubleshooting

| Message or issue | What to check |
| --- | --- |
| `Server not reachable` | Check that Strata is running and the address and port are correct. If present, `helper.local.json` takes precedence. |
| `API key needed` | Authenticated connections are not supported. The monitoring APIs must be accessible without an API key. |
| `Model not loaded` | Load a model in Strata. |
| Helper does not start | Check `node --version`, `helper-error.log`, and `helper-output.log`. |
| Port 5199 is in use | Reuse the existing helper, or stop it before starting this one. |

Logs do not rotate automatically. Check monthly or when they exceed 1 MiB. Stop the helper before archiving or deleting unwanted logs.

Version 0.2.0 has been checked in a browser. Actual iCUE import, touch interaction, and startup after a Windows logon have not been verified.

## Development

Requires Node.js 22 or later and Chrome.

```powershell
npm ci
npm test
node scripts/test-upstream.cjs --upstream
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test-helper.ps1
npm run validate
npm run verify
npm run package
```

Check the display using an already-running helper:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/check.ps1 -OutDir C:\temp\strata-edge-check
```

## License

[MIT](LICENSE). Strata-derived code, CSS, and icons are MIT-licensed; Outfit uses SIL OFL 1.1. See [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md) for details.
