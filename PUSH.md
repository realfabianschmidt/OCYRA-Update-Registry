# Clean Push Guide

This guide is the recommended workflow for publishing OCYRA plugins cleanly to:

`./OCYRA-Update-Registry`

## Repository Boundary

- desktop runtime repo:
  `../OCYRA`
- plugin registry repo:
  `./update-registry/plugin-platform`

## Rule Zero

Treat this repository as the authoritative authoring and publish surface for plugin packages, dependency manifests, locale bundles, and catalog outputs.

Use the `OCYRA` repo only when the change belongs to the desktop runtime itself:

- Tauri/Rust backend behavior
- renderer UI and AppBridge logic
- plugin host/runtime contracts
- app tests and release packaging

## What Must Exist Before Push

- `plugin-platform/catalog.json`
- `plugin-platform/catalog.sig`
- `plugin-platform/app-release.json`
- all plugin folders under `plugin-platform/plugins/...`
- all dependency manifests under `plugin-platform/dependencies/...`

## Hashes

There are two different hash layers:

### 1. Dependency download hashes

These live in dependency manifests such as:

- `plugin-platform/dependencies/<dependency-id>/dependency.json`

Typical field:

- `platform_variants.<platform>.files[].sha256`

When a downloadable binary, model, or archive URL changes, update that `sha256`.

Example:

```powershell
Get-FileHash .\downloaded-artifact.zip -Algorithm SHA256
```

Use the uppercase hex value in `dependency.json`.

### 2. Plugin package file hashes

These are generated automatically into `catalog.json` under:

- `plugins[].package_files[].sha256`

Do not maintain those by hand. They are rebuilt by the catalog build step.

## Signing

`catalog.sig` is the detached signature for `catalog.json`.

The catalog build refreshes the signature automatically when the trusted signing key pair is available to the build script. If the signature does not match the generated catalog, OCYRA will reject the remote catalog.

So the rule is:

- never hand-edit `catalog.sig`
- rebuild after every relevant plugin, dependency, or release metadata change
- publish `catalog.json` and `catalog.sig` together

## Build Step

Rebuild the catalog from the current plugin and dependency files:

```powershell
node .\scripts\check-registry-structure.mjs
node .\update-registry\plugin-platform\build-catalog.mjs
```

This does three important things:

1. verifies that the repo surface is still registry-only
2. regenerates `catalog.json`
3. embeds `app-release.json` into the catalog as `app_release`
4. refreshes `catalog.sig` when the trusted signing key pair is available

## Release Metadata

If you want OCYRA to show a new app release notification, update:

- `update-registry/plugin-platform/app-release.json`

Important fields:

- `current_version`
- `published_at`
- `title`
- `text`

## Verification Before Commit

Run at least these checks:

```powershell
node .\scripts\check-registry-structure.mjs
Get-Content .\update-registry\plugin-platform\app-release.json | ConvertFrom-Json | Out-Null
Get-Content .\update-registry\plugin-platform\catalog.json | ConvertFrom-Json | Out-Null
Get-Content .\update-registry\plugin-platform\catalog.sig | ConvertFrom-Json | Out-Null
Get-Content .\update-registry\plugin-platform\dependencies\registry.json | ConvertFrom-Json | Out-Null
Get-Content .\update-registry\plugin-platform\plugins\speech\speech-plugin-whispercpp-sherpa\plugin.json | ConvertFrom-Json | Out-Null
```

Also verify that:

- every new plugin folder is present
- every referenced runtime entry file exists
- every referenced dependency manifest exists
- every referenced dependency download URL still points to the intended release asset
- no desktop-app build outputs reappeared
- no retired publish paths reappeared

## Optional Structure Check

To make sure this publish repo stayed plugin-only, run:

```powershell
node .\scripts\check-registry-structure.mjs
```

Expected shape:

- `update-registry/README.md`
- `update-registry/plugin-platform/...`

Unexpected shape:

- `bundle/...`
- `deps/...`
- `wix/...`
- `ffmpeg.exe`
- `update-registry/heads/...`
- `update-registry/manifest.json`
- `update-registry/manifest.sig`
- `update-registry/pipeline-handlers/...`
- `update-registry/accessibility-profiles/...`
- `update-registry/file-formats/...`

## After Push

After your Git push, verify the raw GitHub URLs:

- `.../update-registry/plugin-platform/catalog.json`
- `.../update-registry/plugin-platform/catalog.sig`
- `.../update-registry/plugin-platform/app-release.json`
- `.../update-registry/plugin-platform/plugins/<family>/<plugin-id>/plugin.json`
- `.../update-registry/plugin-platform/plugins/<family>/<plugin-id>/handler.js`

If those URLs work and the catalog signature matches, OCYRA can discover and install the published plugins.

## Clean Push Checklist

1. Change plugin and dependency source files in this repository.
2. If the change also needs runtime support, land the matching app change in `../OCYRA`.
3. Update any dependency `sha256` values when download artifacts changed.
4. Update `app-release.json` if you want a new release notice.
5. Run `node .\scripts\check-registry-structure.mjs`.
6. Rebuild the catalog and signature.
7. Validate the JSON files and publish surface.
8. Commit only when `catalog.json`, `catalog.sig`, plugins, and dependencies are internally consistent.
9. Push to `main`.
10. Verify the raw GitHub URLs.
