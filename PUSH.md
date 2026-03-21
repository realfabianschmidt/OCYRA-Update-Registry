# Clean Push Guide

This guide is the recommended workflow for publishing XYRA plugins cleanly to:

`H:\VisionVault\01_Projekte\19_CodingProjects\01_XYRA-Captions\XYRA-Captions-Update-Registry`

## Source And Target

- implementation source:
  `H:\VisionVault\01_Projekte\19_CodingProjects\01_XYRA-Captions\XYRA-Captions\update-registry\plugin-platform`
- publish target:
  `H:\VisionVault\01_Projekte\19_CodingProjects\01_XYRA-Captions\XYRA-Captions-Update-Registry\update-registry\plugin-platform`

## Rule Zero

Do not manually maintain plugin metadata in two places.

Edit the private app repository first, then mirror the finished `plugin-platform/` tree into this publish repository.

## Source Of Truth

Treat this repository as the public publish mirror.

The authoritative working tree for plugin and dependency authoring is:

- `H:\VisionVault\01_Projekte\19_CodingProjects\01_XYRA-Captions\XYRA-Captions\update-registry\plugin-platform`

That means:

1. build or change plugins in the private app repo
2. rebuild the catalog there
3. mirror the finished `plugin-platform/` tree into this repo
4. validate
5. commit and push from this repo

## What Must Exist Before Push

- `plugin-platform/catalog.json`
- `plugin-platform/catalog.sig`
- `plugin-platform/app-release.json`
- all plugin folders under `plugin-platform/plugins/...`
- all dependency manifests under `plugin-platform/dependencies/...`

## Mirror Step

Mirror the full plugin tree from the private app repo into this repo.

Recommended PowerShell pattern:

```powershell
$source = Resolve-Path 'H:\VisionVault\01_Projekte\19_CodingProjects\01_XYRA-Captions\XYRA-Captions\update-registry\plugin-platform'
$target = Resolve-Path 'H:\VisionVault\01_Projekte\19_CodingProjects\01_XYRA-Captions\XYRA-Captions-Update-Registry\update-registry\plugin-platform'
robocopy $source $target /MIR /NFL /NDL /NJH /NJS /NP
if ($LASTEXITCODE -ge 8) { throw "robocopy failed with exit code $LASTEXITCODE" }
```

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

The catalog build refreshes the signature automatically when the trusted signing key pair is available to the build script. If the signature does not match the generated catalog, XYRA will reject the remote catalog.

So the rule is:

- never hand-edit `catalog.sig`
- rebuild after every relevant plugin, dependency, or release metadata change
- publish `catalog.json` and `catalog.sig` together

## Build Step

Rebuild the catalog from the current plugin and dependency files:

```powershell
node .\update-registry\plugin-platform\build-catalog.mjs
```

This does three important things:

1. regenerates `catalog.json`
2. embeds `app-release.json` into the catalog as `app_release`
3. refreshes `catalog.sig` when the trusted signing key pair is available

## Release Metadata

If you want XYRA to show a new app release notification, update:

- `update-registry/plugin-platform/app-release.json`

Important fields:

- `current_version`
- `published_at`
- `title`
- `text`

## Verification Before Commit

Run at least these checks:

```powershell
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
- no legacy top-level publish paths reappeared

## Optional Structure Check

To make sure this publish repo stayed plugin-only, run:

```powershell
rg --files .\update-registry | sort
```

Expected shape:

- `update-registry/README.md`
- `update-registry/plugin-platform/...`

Unexpected shape:

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

If those URLs work and the catalog signature matches, XYRA can discover and install the published plugins.

## Clean Push Checklist

1. Change plugin and dependency source files in the private app repo.
2. Update any dependency `sha256` values when download artifacts changed.
3. Update `app-release.json` if you want a new release notice.
4. Rebuild the catalog and signature.
5. Mirror the complete `plugin-platform/` tree into this publish repo.
6. Confirm no retired legacy paths came back.
7. Validate JSON files parse.
8. Commit only when `catalog.json`, `catalog.sig`, plugins, and dependencies are internally consistent.
9. Push to `main`.
10. Verify the raw GitHub URLs.
