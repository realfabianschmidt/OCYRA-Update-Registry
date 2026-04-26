# Translation Plugins

This directory contains plugin-platform translation providers.

Current plugins:

- `translation-plugin-openai`
- `translation-plugin-azure`
- `translation-plugin-anthropic`
- `translation-plugin-deepl`
- `translation-plugin-ollama`

Each translation plugin consumes `TranslationRequestArtifact` and produces
`TranslationResultArtifact` through the shared plugin host contract.

Common package shape:

```text
translation-plugin-<provider>/
  plugin.json
  handler.js
  settings.schema.json
  locales/<locale>.json          optional for first-party shipped UI copy
```

Translation plugins usually expose a credential schema and one or more presets.
Keep `plugin.json` as the canonical English fallback and place localized plugin-owned
copy in `locales/*.json`.

`translation-plugin-ollama` is the earliest first-party-maintained translation plugin in this
repository that
uses provider-managed dependencies:

- `provider-ollama-runtime`
- `model-ollama-qwen2.5-7b`
