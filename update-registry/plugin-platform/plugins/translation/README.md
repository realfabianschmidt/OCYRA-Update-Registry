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

`translation-plugin-ollama` is the first first-party translation plugin that
uses provider-managed dependencies:

- `provider-ollama-runtime`
- `model-ollama-qwen2.5-7b`
