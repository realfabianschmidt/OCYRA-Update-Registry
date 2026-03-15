# XYRA Captions Update Registry

This folder contains the published update manifest for the XYRA Captions desktop app.

The app uses a fixed embedded source URL:

`https://raw.githubusercontent.com/realfabianschmidt/XYRA-Captions-Update-Registry/main/update-registry/manifest.json`

Users do not configure this URL in Settings anymore.

## `manifest.json` Schema

### Top-level fields

| Field | Type | Description |
|---|---|---|
| `schema_version` | integer | Always `1` for this schema |
| `manifest_version` | string | Date-style version, for example `"2026.03.14"` |
| `published_at` | string | ISO 8601 publish timestamp |
| `min_app_version` | string (optional) | Minimum supported app version (semver) |
| `max_app_version` | string (optional) | Maximum supported app version (semver) |
| `update_title` | string (optional) | Headline for the update notice in the UI |
| `update_text` | string or array (optional) | Release text shown in the update notice |
| `providers` | array | Optional provider metadata entries |
| `prompt_packs` | array | Prompt templates for translation |
| `ai_models` | array | Legacy compatibility list of installable AI providers |
| `pipeline_packages` | array | Thin combination packages with dependency metadata |
| `pipeline-handlers/` | folder | Downloadable runtime handler modules referenced by pipeline packages |
| `ai_bundles` | array | One-click installs that reference packages |
| `pipeline_profiles` | array | Runtime profile metadata for bundle activation |
| `accessibility_rules` | array | Subtitle accessibility rule set |
| `audit_rules` | array | Compliance audit rule set |

`update_title` and `update_text` are used by the Settings UI to show a visible update message.

### `ai_models` entries

`ai_models` remains the compatibility layer for installable provider packages. The desktop app normalizes it into `ai_packages` internally so existing registry entries keep working.

Common fields:

| Field | Type | Description |
|---|---|---|
| `id` | string | Stable unique ID |
| `name` | string | Display name in provider dropdowns |
| `type` | `"offline"` \| `"online"` | Offline download or online API |
| `role` | string | `transcription`, `translation`, or `diarization` |
| `provider_id` | string | Internal provider key, for example `whispercpp`, `openai`, `sherpa-onnx` |
| `size_bytes` | integer | Approximate total download size |
| `description` | string | One-line provider/model description |
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

- `dest_dir`: `"models"` or `"binaries"` under `%LOCALAPPDATA%/XYRA Captions/`
- `archive_format` and `archive_entry`: required for archive extraction
- `extract_siblings`: if `true`, matching sibling DLL files are extracted too
- `sha256`: strongly recommended for production
- `allow_unverified`: only use `true` for temporary or development entries

Offline bundle (`bundle`): same per-file fields as `download`, but as an array.

### `pipeline_packages` entries

Pipeline packages carry the combination-specific tuning for one reliable setup.

Typical fields:

| Field | Type | Description |
|---|---|---|
| `id` | string | Stable package ID |
| `name` | string | Display label |
| `type` | `"pipeline"` | Identifies the entry as a pipeline package |
| `role` | string | Usually `transcription` |
| `stage` | string | Usually `pipeline` |
| `provider_id` | string | Combination identifier, for example `whispercpp+sherpa-onnx` |
| `version` | string | Package version |
| `manifest_version` | string | Registry publish version |
| `dependencies` | array | Referenced provider packages |
| `bundle` | array | Downloadable handler artifacts, typically `handler.js` in `pipeline-handlers/<package-id>/` |
| `command` | string | Backend command used by the runtime dispatcher |
| `handler_entry` | string | Handler entry filename, typically `handler.js` |
| `handler_api_version` | string | Supported handler API version |
| `settings_after_install` | object | Settings written when the pipeline is activated |
| `capabilities` | array | Optional descriptive tags |
| `outputs` | array | Output artifact types |

### `ai_bundles` entries

Bundles are one-click installers that reference one or more packages.

| Field | Type | Description |
|---|---|---|
| `id` | string | Stable bundle ID |
| `name` | string | Display label |
| `version` | string | Bundle version |
| `manifest_version` | string | Registry publish version |
| `packages` | array | Root packages to install |
| `profile_id` | string | Pipeline profile activated after install |

### `pipeline_profiles` entries

Profiles are lightweight runtime metadata referenced by bundles and the package manager.

| Field | Type | Description |
|---|---|---|
| `id` | string | Stable profile ID |
| `name` | string | Display label |
| `pipeline_package` | string | Pipeline package selected for this profile |

### `providers` entries

Informational metadata for UI and registry tooling.

| Field | Type | Description |
|---|---|---|
| `id` | string | Provider key |
| `name` | string | Display label |
| `kind` | `"cloud"` \| `"local"` | Provider class |

### `prompt_packs` entries

| Field | Type | Description |
|---|---|---|
| `id` | string | Stable prompt-pack ID |
| `name` | string | Display label |
| `template` | string | Prompt template, supports `{from_lang}`, `{to_lang}`, `{text}` |

### `accessibility_rules` entries

| Field | Type | Description |
|---|---|---|
| `id` | string | Rule ID |
| `label` | string | Human-readable label |
| `value` | number | Rule threshold |
| `unit` | string | `seconds`, `cps`, `chars` |

### `audit_rules` entries

| Field | Type | Description |
|---|---|---|
| `id` | string | Rule ID |
| `label` | string | Human-readable label |
| `severity` | `"error"` \| `"warning"` | Report severity |

## Runtime behavior

1. On startup, the app fetches the manifest from the embedded URL.
2. Parsed JSON is cached to `%LOCALAPPDATA%/XYRA Captions/update-registry-cache.json`.
3. If network fetch fails, cached JSON or the embedded fallback is used.
4. The desktop app normalizes legacy `ai_models` into package-aware structures internally.
5. Settings renders role-based provider dropdowns and bundle install controls from the registry.
6. The package manager installs provider packages, pipeline packages, and bundles with dependency tracking.
7. If `manifest_version` changes, a visible update notice is shown.

## Publishing workflow

1. Edit `manifest.json`.
2. Bump `manifest_version` and `published_at`.
3. Update `update_title` and `update_text` when needed.
4. Commit and push to `main`.

Note: Never change existing `id` values after publish. IDs are used to track install state, bundle ownership, and dependency references.
