# OCYRA Plugin Platform - Active Registry Layout

This directory is the active source-of-truth layout for the OCYRA plugin platform.

Only plugin-platform artifacts belong here.

## Structure Overview

```text
plugin-platform/
  catalog.json                      <- Published plugin catalog root used by the remote loader
  catalog.sig                       <- Detached RSA-SHA256 signature for catalog.json
  app-release.json                  <- App release metadata merged into the signed catalog
  build-catalog.mjs                 <- Catalog builder used before publishing
  templates/
    plugin-template/                <- Reusable starting point for new plugin authoring
  plugins/
    speech/                         <- Speech domain plugins
    translation/                    <- Translation domain plugins
    audit/                          <- Audit and accessibility domain plugins
    format/                         <- File format domain plugins
  dependencies/
    registry.json                   <- Dependency registry (all available dependencies)
    <dependency-id>/
      dependency.json
  locks/
    README.md                       <- Runtime lock state notes
  cache/
    README.md                       <- Runtime cache notes
```

## Design Principles

1. `Plugin = folder.` Each published plugin is a self-contained folder.
2. `Domains as categories.` `speech/`, `translation/`, `audit/`, and `format/` are the top-level plugin domains.
3. `Dependencies are central.` Shared runtimes and models live in `dependencies/`.
4. `Templates stay out of plugins.` Authoring templates belong in `templates/`, not in `plugins/`.
5. `Catalogs are generated.` `catalog.json` and `catalog.sig` are build outputs, not hand-maintained files.

Family-specific metadata stays explicit:

- audit plugins declare `policy_id`
- format plugins declare `format.id`

## Template Workflow

To create a new plugin:

1. copy `templates/plugin-template/`
2. rename the folder to the real plugin id
3. move it under the correct family in `plugins/`
4. update `plugin.json`, `handler.js`, and optional schema or policy files
5. rebuild the catalog

The template stays outside `plugins/` on purpose so the catalog builder ignores it.

## Remote Publish Surface

The desktop app prefers the published plugin catalog at:

`https://raw.githubusercontent.com/realfabianschmidt/OCYRA-Update-Registry/main/update-registry/plugin-platform/catalog.json`

It verifies the detached signature from:

`https://raw.githubusercontent.com/realfabianschmidt/OCYRA-Update-Registry/main/update-registry/plugin-platform/catalog.sig`

Before publishing, regenerate `catalog.json` from the current plugin and dependency folders.
The build also refreshes `catalog.sig` automatically when a trusted signing key pair is available:

```powershell
node .\update-registry\plugin-platform\build-catalog.mjs
```

The generated catalog embeds `app-release.json`, so release notes and plugin metadata share the same signed distribution surface.

## Hidden Catalog Source Config

Catalog source URLs are intentionally not configured in the frontend.

The app looks for a hidden JSON config in this order:

1. app data override: `plugin-platform/plugin-catalog-sources.json`
2. bundled app config: `config/plugin-catalog-sources.json`
3. workspace fallback: `config/plugin-catalog-sources.json`

Each catalog source points directly to a `catalog.json` URL and is merged by priority.

That makes it easy for companies to ship their own private or internal catalog without exposing catalog management in the UI.

## Enterprise Catalog Governance

For self-hosted or company-private catalogs, keep the same object model and trust chain:

- host one `catalog.json` plus matching `catalog.sig`
- keep the expected `plugin-platform/` folder layout behind the published URLs
- sign the catalog with an approved publisher key before publishing
- prefer adding a new catalog source over forking the runtime or inventing a second loader model

The desktop runtime treats public and private catalogs as the same platform concept with different trust sources.

## Repository And Branch Strategy

Keep one canonical registry branch, normally `main`.

Do not create one Git branch per plugin family such as speech, translation, audit, format, import, or export.

Prefer this structure instead:

- one registry repo
- one published catalog on `main`
- domain folders under `plugins/`
- optional `stable`, `beta`, `internal`, or `private` channels inside the catalog
- separate catalogs or repos later only when you truly need different publishers or trust boundaries

For company-specific requirements, add a new catalog source entry instead of a new branch per domain.


