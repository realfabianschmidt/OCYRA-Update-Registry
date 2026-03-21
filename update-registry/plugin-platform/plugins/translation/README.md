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
