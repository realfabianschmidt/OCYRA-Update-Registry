# Plugin Authoring Guide

This repository is the authoring and publish surface for the OCYRA plugin platform.

The safest authoring workflow is:

1. create or change the plugin in this repository
2. start from the reusable template in `update-registry/plugin-platform/templates/plugin-template/`
3. validate the plugin locally
4. rebuild the catalog
5. verify the structure and publish surface

Use the sibling `../OCYRA` repository only when the plugin needs new desktop-runtime support such as:

- new AppBridge or backend capabilities
- new plugin permissions enforced in the host
- new install or sidecar runtime behavior
- renderer UI changes for plugin configuration or workflows

## Choose A Family

Use one family folder under `plugins/`:

- `speech`
- `translation`
- `audit`
- `format`

## Create The Plugin Folder

The normal shape is:

```text
update-registry/plugin-platform/plugins/<family>/<plugin-id>/
  plugin.json
  handler.js
  settings.schema.json        optional
  policy.json                 optional
  locales/<locale>.json       optional
  <extra data files>          optional
```

Example:

```text
update-registry/plugin-platform/plugins/translation/translation-plugin-example/
```

## Required Manifest Fields

Every `plugin.json` should define at least:

- `id`
- `plugin_api_version`
- `family`
- `role`
- `name`
- `version`
- `summary`
- `runtime`
- `consumes`
- `produces`
- `permissions`
- `dependencies`
- `compatibility`

Optional but common:

- `settings_schema`
- `presets`
- `capabilities`
- `locale_bundles`
- `data_files`

Family-specific metadata:

- audit plugins should declare `policy_id`
- format plugins should declare `format.id`

## Runtime Entry

`handler.js` is the runtime entry for `js-sandbox` plugins.

Keep it small and explicit:

- accept the host request
- validate required host helpers
- call one clear host bridge
- return one canonical artifact type
- throw clear errors when required data is missing

## Dependencies

If the plugin needs shared runtimes, models, or provider packages:

1. declare them in `plugin.json`
2. register them in `update-registry/plugin-platform/dependencies/registry.json`
3. define them in `update-registry/plugin-platform/dependencies/<dependency-id>/dependency.json`

When a dependency downloads archives or binaries, keep:

- `platform_variants.<platform>.files[].sha256`

up to date.

## Template

Start from:

- [plugin-template/README.md](./update-registry/plugin-platform/templates/plugin-template/README.md)

The template is intentionally outside `plugins/`, so it is not treated as a publishable plugin by the catalog builder.

## Locale Bundles

First-party shipped plugins may include localized display and configuration copy under:

```text
locales/en.json
locales/de.json
locales/fr.json
```

Rules:

- keep `plugin.json` as the canonical English fallback
- keep locale bundle keys aligned with the fields consumed by the app
- do not move locale bundles into the desktop app repo

## Authoring Checklist

1. Copy the template folder to the correct plugin family.
2. Rename the plugin directory and `plugin.json` identifiers.
3. Adjust `role`, `consumes`, `produces`, `permissions`, and `dependencies`.
4. Add family-specific identifiers such as `policy_id` or `format.id` when needed.
5. Implement `handler.js`.
6. Add `settings.schema.json`, `policy.json`, locale bundles, or data files if needed.
7. Run `node .\scripts\check-registry-structure.mjs`.
8. Rebuild the catalog.
9. Confirm the plugin appears correctly in `catalog.json`.
10. Verify that no desktop-app build artifacts were introduced into this repo.

## Publish Follow-Up

For the full clean publish procedure, use:

- [PUSH.md](./PUSH.md)
