# Module Authoring Guide

This guide explains how to add new updateable modules to the XYRA Captions registry after the desktop app has already been built.

It covers the three current module families:

- AI pipeline modules
- accessibility profiles
- file-format handlers

The key rule is simple:

- if your new module fits the existing handler/profile contract, you only need a registry update
- if your new module requires new backend commands or a new core API, you need an app rebuild

## Before You Start

Use this guide only for modules that fit the current runtime contracts.

You do not need an app rebuild when you are only adding:

- a new `handler.js` that uses the current handler API
- a new declarative accessibility `profile.json`
- a new file-format handler that uses the current file-format API
- a new package, bundle, or profile entry that points to already supported runtime behavior

You do need an app rebuild when the new module requires:

- a new Tauri command
- a new Rust processing stage
- a new handler API version
- a new security model
- a new install-state schema

## Common Publish Flow

Every module family follows the same release pattern:

1. Add or update the module files in this repository.
2. Add or update the corresponding manifest entry in `update-registry/manifest.json`.
3. Recompute every changed `sha256`.
4. Sign the manifest:

```powershell
node .\scripts\sign-manifest.mjs sign .\update-registry\manifest.json
```

5. Validate:

```powershell
Get-Content .\update-registry\manifest.json | ConvertFrom-Json | Out-Null
Get-Content .\update-registry\manifest.sig | ConvertFrom-Json | Out-Null
```

6. Commit and push to `main`.

## 1. Add A New AI Pipeline Module

Use this when you want to add a new transcription combination such as:

- `pipeline-whisperx-pyannote`
- `pipeline-openai-whispercpp`
- `pipeline-customcloud-sherpa`

### Files To Add

Create:

- `update-registry/pipeline-handlers/<package-id>/handler.js`

Then add entries in `update-registry/manifest.json`:

- `pipeline_packages`
- optionally `ai_bundles`
- optionally `pipeline_profiles`

### Minimal Flow

1. Create the handler:

Example path:

`update-registry/pipeline-handlers/pipeline-example/handler.js`

2. Add a `pipeline_packages` entry:

```json
{
  "id": "pipeline-example",
  "name": "Example Pipeline",
  "type": "pipeline",
  "role": "transcription",
  "stage": "pipeline",
  "provider_id": "example-provider",
  "version": "1.0.0",
  "manifest_version": "2026.03.15",
  "dependencies": [
    { "id": "example-core" }
  ],
  "bundle": [
    {
      "url": "https://raw.githubusercontent.com/realfabianschmidt/XYRA-Captions-Update-Registry/main/update-registry/pipeline-handlers/pipeline-example/handler.js",
      "filename": "handler.js",
      "dest_dir": "pipeline-handlers",
      "sha256": "REPLACE_WITH_HANDLER_HASH"
    }
  ],
  "handler_entry": "handler.js",
  "handler_api_version": "1",
  "command": "transcribe_with_diarization",
  "settings_after_install": {
    "transcription_provider": "example-provider"
  }
}
```

3. If this should be user-installable as one click, add:

- an `ai_bundles` entry
- a `pipeline_profiles` entry

### Handler Contract

Your `handler.js` must match the currently supported pipeline handler API.

That means:

- one registered module per file
- matching `id`
- matching `handler_api_version`
- no custom backend code injection

Stay inside existing commands like:

- `transcribe_video`
- `transcribe_video_local`
- `transcribe_with_diarization`

If you need a completely new backend command, stop here and implement that in the app first.

## 2. Add A New Accessibility Profile

Use this when you want a new subtitle policy such as:

- easy reading
- broadcaster preset
- legal accessibility preset
- platform-specific reading-speed preset

### Files To Add

Always create:

- `update-registry/accessibility-profiles/<profile-id>/profile.json`

Optionally create:

- `update-registry/accessibility-profiles/<profile-id>/handler.js`

### Minimal Flow

1. Create `profile.json`:

```json
{
  "id": "example-accessibility",
  "name": "Example Accessibility",
  "capabilities": ["compliance", "transcription-autofit"],
  "quality_rules": {
    "MAX_CPS": 18,
    "MAX_LINE_LENGTH": 40,
    "MAX_LINES": 2,
    "MIN_DURATION": 1.0,
    "MAX_DURATION": 7.0,
    "MIN_GAP": 0.04
  },
  "transcription_policy": {
    "autoFit": true
  },
  "audit_rules": [],
  "audit_checklist": [],
  "report": {
    "profile_name": "Example Accessibility"
  }
}
```

2. Add an `accessibility_profiles` entry to the manifest:

```json
{
  "id": "example-accessibility",
  "name": "Example Accessibility",
  "description": "Short description for maintainers and UI.",
  "version": "1.0.0",
  "manifest_version": "2026.03.15",
  "profile_url": "https://raw.githubusercontent.com/realfabianschmidt/XYRA-Captions-Update-Registry/main/update-registry/accessibility-profiles/example-accessibility/profile.json",
  "profile_sha256": "REPLACE_WITH_PROFILE_HASH"
}
```

3. Only if needed, add a `handler.js` and reference it with:

- `handler_url`
- `handler_api_version`
- `handler_sha256`

### When To Add A Profile Handler

Use only `profile.json` when you are changing:

- timing thresholds
- reading-speed thresholds
- audit checklist items
- report labels
- transcription autofit defaults

Use optional `handler.js` only when you need special logic such as:

- custom policy transformation
- custom profile-specific evaluation behavior
- profile-specific post-processing that the core already allows

Do not add a profile handler just to store static values. Keep normal profiles data-driven.

## 3. Add A New File-Format Handler

Use this when you want to add support for a new import/export format such as:

- another subtitle exchange format
- another project wrapper
- another review-package variant

### Files To Add

Create:

- `update-registry/file-formats/<format-id>/handler.js`

Then add a `file_formats` entry in the manifest.

### Minimal Flow

1. Create the handler:

Example path:

`update-registry/file-formats/example-format/handler.js`

2. Add a `file_formats` manifest entry:

```json
{
  "id": "example-format",
  "name": "Example Format",
  "description": "Import/export support for Example Format.",
  "target": "subtitle",
  "directions": ["import", "export"],
  "extensions": ["exf"],
  "icon": "page",
  "version": "1.0.0",
  "manifest_version": "2026.03.15",
  "handler_url": "https://raw.githubusercontent.com/realfabianschmidt/XYRA-Captions-Update-Registry/main/update-registry/file-formats/example-format/handler.js",
  "handler_api_version": "1",
  "handler_sha256": "REPLACE_WITH_HANDLER_HASH"
}
```

### File-Format Handler Responsibilities

Your handler should define only format-specific behavior:

- parse import payload
- validate import payload
- serialize export payload
- optionally help content-based detection

The app already handles:

- registry loading
- trust-root checks
- hash checks
- import workflow ownership
- drag-and-drop routing

## Hash Workflow

PowerShell examples:

```powershell
Get-FileHash .\update-registry\pipeline-handlers\pipeline-example\handler.js -Algorithm SHA256
Get-FileHash .\update-registry\accessibility-profiles\example-accessibility\profile.json -Algorithm SHA256
Get-FileHash .\update-registry\file-formats\example-format\handler.js -Algorithm SHA256
```

Use uppercase hex in the manifest.

## Final Checklist

Before publishing a new module, verify:

- the new file exists in the correct registry folder
- the manifest entry points to the correct raw URL
- the `sha256` matches the file content
- `handler_api_version` matches the current app support
- `manifest.json` parses
- `manifest.sig` parses
- the manifest has been re-signed after every manifest edit

## Practical Rule Of Thumb

Ask this before publishing:

- "Am I only adding a new module that fits the current contracts?"

If yes:

- publish through the registry

If no:

- update the app first, then publish the registry artifact
