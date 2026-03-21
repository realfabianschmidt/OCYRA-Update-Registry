# Plugin Authoring Guide

This repository publishes the finished XYRA plugin platform.

The safest authoring workflow is:

1. create or change the plugin in the private app repository first
2. start from the reusable template in `update-registry/plugin-platform/templates/plugin-template/`
3. validate the plugin locally
4. rebuild the catalog
5. mirror the full `plugin-platform/` tree into this publish repository

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

- [plugin-template/README.md](H:/VisionVault/01_Projekte/19_CodingProjects/01_XYRA-Captions/XYRA-Captions-Update-Registry/update-registry/plugin-platform/templates/plugin-template/README.md)

The template is intentionally outside `plugins/`, so it is not treated as a publishable plugin by the catalog builder.

## Authoring Checklist

1. Copy the template folder to the correct plugin family.
2. Rename the plugin directory and `plugin.json` identifiers.
3. Adjust `role`, `consumes`, `produces`, `permissions`, and `dependencies`.
4. Add family-specific identifiers such as `policy_id` or `format.id` when needed.
5. Implement `handler.js`.
6. Add `settings.schema.json`, `policy.json`, or data files if needed.
7. Rebuild the catalog.
8. Confirm the plugin appears correctly in `catalog.json`.
9. Mirror the updated `plugin-platform/` tree into the publish repo.

## Publish Follow-Up

For the full clean publish procedure, use:

- [PUSH.md](H:/VisionVault/01_Projekte/19_CodingProjects/01_XYRA-Captions/XYRA-Captions-Update-Registry/PUSH.md)
