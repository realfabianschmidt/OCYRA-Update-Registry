# XYRA Captions Update Registry

This folder contains the published registry artifacts used by the XYRA Captions desktop app.

The desktop app fetches this fixed manifest URL:

`https://raw.githubusercontent.com/realfabianschmidt/XYRA-Captions-Update-Registry/main/update-registry/manifest.json`

The app also fetches and verifies the detached signature:

`https://raw.githubusercontent.com/realfabianschmidt/XYRA-Captions-Update-Registry/main/update-registry/manifest.sig`

Users do not configure this URL in Settings.

## Maintainer boundary

This public repository is for publishable registry artifacts only.

Keep these concerns in the private app repository:

- desktop app code
- runtime loader logic
- Rust/Tauri command implementations
- install-state schema changes
- handler API contract changes

Publish these concerns here:

- `manifest.json`
- `manifest.sig`
- downloadable handler files under `pipeline-handlers/<package-id>/handler.js`
- package, bundle, and profile metadata stored inside `manifest.json`

## Folder map

| Path | Purpose |
|---|---|
| `manifest.json` | Published registry manifest fetched by the app |
| `manifest.sig` | Detached RSA-SHA256 signature envelope for `manifest.json` |
| `pipeline-handlers/<package-id>/handler.js` | Downloadable runtime handler for a specific pipeline package |
| `accessibility-profiles/<profile-id>/profile.json` | Downloadable declarative accessibility profile |
| `accessibility-profiles/<profile-id>/handler.js` | Optional runtime extension for profile-specific evaluation logic |

Important: `pipeline_packages`, `ai_bundles`, and `pipeline_profiles` are arrays inside `manifest.json`. They are not separate directories in this repository.

## Current registry concepts

| Section | Purpose |
|---|---|
| `providers` | Informational provider metadata for UI and tooling |
| `prompt_packs` | Translation prompt templates |
| `ai_models` | Legacy-compatible provider package list |
| `pipeline_packages` | Combination-specific transcription packages with dependency metadata |
| `ai_bundles` | One-click install bundles that reference packages |
| `pipeline_profiles` | Lightweight runtime profiles activated after bundle install |
| `default_accessibility_profile` | Registry-defined default accessibility policy |
| `accessibility_profiles` | Thin profile index that points to file-based accessibility profiles |
| `trusted_registry_roots` | Allowed remote roots for downloadable registry artifacts |

## Publish workflow

1. Make and verify the registry-related change in the private `XYRA-Captions` app repository first.
2. Copy the publishable files into this public repository.
3. Update `manifest_version` and `published_at`.
4. Update `update_title` and `update_text` if the app should surface a visible update notice.
5. Recompute the `sha256` for every changed downloadable artifact referenced by `manifest.json`.
6. Sign `manifest.json` with `node ..\\scripts\\sign-manifest.mjs sign .\\manifest.json`.
7. Validate `manifest.json` and `manifest.sig`.
8. Confirm copied handlers and manifest content match the private source.
9. Commit and push to `main`.

## Verification commands

PowerShell examples:

```powershell
Get-Content .\manifest.json | ConvertFrom-Json | Out-Null
Get-Content .\manifest.sig | ConvertFrom-Json | Out-Null
Get-Content .\accessibility-profiles\eu-eaa-bfsg\profile.json | ConvertFrom-Json | Out-Null
Get-FileHash .\pipeline-handlers\pipeline-openai-sherpa\handler.js -Algorithm SHA256
Get-FileHash .\pipeline-handlers\pipeline-whispercpp-sherpa\handler.js -Algorithm SHA256
Get-FileHash .\accessibility-profiles\easy-reading\handler.js -Algorithm SHA256
```

For manifest comparisons across repositories, prefer a parsed or normalized comparison. Raw file hashes can differ when line endings change between LF and CRLF even if the JSON content is identical.

## Required verification before publish

- `manifest.json` parses successfully
- `manifest.sig` parses successfully
- `manifest_version` and `published_at` reflect the new publish
- every changed downloadable artifact has an updated `sha256`
- each `pipeline_packages[].bundle[].url` points to the correct raw GitHub handler path
- copied `handler.js` files match the private app repository version
- bundle/package/profile references still use the correct stable IDs

## Recommended runtime smoke test

After publishing:

1. Start the desktop app and refresh the registry.
2. Install or update the affected bundle from Settings.
3. Confirm the expected profile becomes active.
4. Confirm the handler is downloaded into `pipeline-handlers/<package-id>/handler.js`.
5. Run a transcription and verify the expected backend command executes.

## Authoring guide

For concrete recipes on adding a new AI pipeline module, accessibility profile, or file-format handler, see [`../MODULE_AUTHORING_GUIDE.md`](../MODULE_AUTHORING_GUIDE.md).

## When an app rebuild is not needed

You usually do not need a rebuild when you only change:

- model or binary downloads
- package metadata
- bundle metadata
- pipeline profiles
- `handler.js` files that still use the supported handler API version
- command selection among existing backend commands

## When an app rebuild is required

You do need a rebuild when the change requires:

- a new Tauri command
- a new Rust merge or diarization stage
- a new handler API version
- changes to install-state schema
- changes to validation or security boundaries

## Schema quick reference

### Top-level fields

| Field | Type | Description |
|---|---|---|
| `schema_version` | integer | Always `1` for this schema |
| `manifest_version` | string | Date-style publish version, for example `"2026.03.15"` |
| `published_at` | string | ISO 8601 publish timestamp |
| `min_app_version` | string (optional) | Minimum supported app version |
| `max_app_version` | string (optional) | Maximum supported app version |
| `update_title` | string (optional) | Headline for an in-app update notice |
| `update_text` | string or array (optional) | Release text shown in the update notice |
| `trusted_registry_roots` | array | Trusted HTTPS roots for remote registry assets |
| `providers` | array | Provider metadata |
| `prompt_packs` | array | Translation prompt templates |
| `ai_models` | array | Legacy-compatible installable provider packages |
| `pipeline_packages` | array | Pipeline package definitions |
| `ai_bundles` | array | Bundle definitions |
| `pipeline_profiles` | array | Active runtime profile definitions |
| `default_accessibility_profile` | string | Registry-defined default accessibility profile |
| `accessibility_profiles` | array | Accessibility profile index |

### `ai_models` entries

`ai_models` remains the compatibility layer for installable provider packages. The desktop app normalizes it internally into package-aware structures.

Common fields:

| Field | Type | Description |
|---|---|---|
| `id` | string | Stable unique ID |
| `name` | string | Display name |
| `type` | `"offline"` \| `"online"` | Offline download or online API |
| `role` | string | Usually `transcription`, `translation`, or `diarization` |
| `provider_id` | string | Internal provider key |
| `size_bytes` | integer | Approximate total download size |
| `description` | string | One-line description |
| `settings_after_install` | object | Settings written after successful install |

Offline single file (`download`):

```json
"download": {
  "url": "https://...",
  "filename": "target-filename.ext",
  "dest_dir": "models",
  "sha256": "optional-hex-hash",
  "allow_unverified": false,
  "archive_format": "zip | tar.bz2",
  "archive_entry": "path/inside/archive.ext",
  "extract_siblings": true
}
```

Offline bundle (`bundle`) uses the same per-file fields as `download`, but as an array.

### `pipeline_packages` entries

| Field | Type | Description |
|---|---|---|
| `id` | string | Stable package ID |
| `name` | string | Display label |
| `type` | `"pipeline"` | Identifies the entry as a pipeline package |
| `role` | string | Usually `transcription` |
| `stage` | string | Usually `pipeline` |
| `provider_id` | string | Combination identifier such as `openai+sherpa-onnx` |
| `version` | string | Package version |
| `manifest_version` | string | Registry publish version |
| `dependencies` | array | Referenced provider packages |
| `bundle` | array | Downloadable artifacts, typically `handler.js` |
| `command` | string | Backend command used by the runtime dispatcher |
| `handler_entry` | string | Handler entry filename, typically `handler.js` |
| `handler_api_version` | string | Supported handler API version |
| `settings_after_install` | object | Settings written when the pipeline is activated |
| `capabilities` | array | Optional descriptive tags |
| `outputs` | array | Output artifact types |

If a package ships a handler, place it at `pipeline-handlers/<package-id>/handler.js` and point the bundle URL to the raw GitHub path for that file.

### `ai_bundles` entries

| Field | Type | Description |
|---|---|---|
| `id` | string | Stable bundle ID |
| `name` | string | Display label |
| `version` | string | Bundle version |
| `manifest_version` | string | Registry publish version |
| `packages` | array | Root packages to install |
| `profile_id` | string | Pipeline profile activated after install |

### `pipeline_profiles` entries

| Field | Type | Description |
|---|---|---|
| `id` | string | Stable profile ID |
| `name` | string | Display label |
| `pipeline_package` | string | Pipeline package selected for this profile |

## Notes for maintainers

- Prefer updating an existing pipeline handler over changing core app code when the behavior stays within the supported runtime contract.
- Keep handler logic small and combination-specific.
- Keep package ownership and dependency tracking in the core package manager, not inside handlers.
- Never rename published IDs once clients may have installed them.
