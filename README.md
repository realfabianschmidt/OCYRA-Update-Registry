# XYRA Captions Update Registry

This repository is the public publish target for the update registry consumed by the XYRA Captions desktop app.

Primary manifest URL:

`https://raw.githubusercontent.com/realfabianschmidt/XYRA-Captions-Update-Registry/main/update-registry/manifest.json`

Detached signature URL:

`https://raw.githubusercontent.com/realfabianschmidt/XYRA-Captions-Update-Registry/main/update-registry/manifest.sig`

## What belongs in this repository

- `update-registry/manifest.json`
- `update-registry/manifest.sig`
- downloadable pipeline handlers in `update-registry/pipeline-handlers/<package-id>/handler.js`
- published metadata inside `manifest.json`, including:
  - `ai_models`
  - `pipeline_packages`
  - `ai_bundles`
  - `pipeline_profiles`

## What does not belong here

- private desktop app source code
- Rust/Tauri backend changes
- package-manager logic
- handler runtime loader changes
- new security or validation boundaries

Those changes stay in the private `XYRA-Captions` app repository. This public repository only publishes the registry artifacts that the app downloads at runtime.

## Source-of-truth workflow

Treat the private app repository as the implementation source of truth and this public repository as the publish surface.

Typical maintainer flow:

1. Prepare and verify the registry-relevant changes in the private app repository.
2. Mirror the publishable files into this repository.
3. Update version metadata and artifact hashes.
4. Sign the manifest and validate the signature envelope.
5. Validate the manifest and confirm copied handler files match.
6. Commit and push to `main`.

## Registry-relevant files to mirror

When publishing a registry update, sync these items from the private app repository if they changed:

- `update-registry/manifest.json`
- `update-registry/manifest.sig`
- `update-registry/pipeline-handlers/.../handler.js`

`pipeline_packages`, `ai_bundles`, and `pipeline_profiles` are manifest sections, not separate folders in this repository.

## Rebuild boundary

You usually do not need an app rebuild for:

- package metadata changes
- bundle metadata changes
- pipeline profile changes
- updated download URLs or hashes
- `handler.js` updates that stay on the supported handler API version
- command selection among already supported backend commands

You do need an app rebuild if the change requires:

- a new Tauri command
- a new Rust pipeline stage
- a new handler API version
- install-state schema changes
- validation or security model changes

## Publishing checklist

1. Edit `update-registry/manifest.json` and any changed handler/profile files.
2. Bump `manifest_version` and `published_at`.
3. Update `update_title` and `update_text` if the app should show a visible notice.
4. Recompute the `sha256` for each changed downloadable artifact referenced by the manifest.
5. Sign the manifest with `node scripts/sign-manifest.mjs sign update-registry/manifest.json`.
6. Validate `manifest.json` and `manifest.sig`.
7. Confirm the copied files match the private app repository.
8. Commit and push to `main`.

Do not rename published IDs once clients may have installed them.

For the detailed maintainer reference, see [`update-registry/README.md`](update-registry/README.md).

For step-by-step examples of adding new AI pipelines, accessibility profiles, and file-format handlers, see [`MODULE_AUTHORING_GUIDE.md`](MODULE_AUTHORING_GUIDE.md).
