export async function run(request, context) {
  if (!context?.host?.runTranslationBackend) {
    throw new Error('OCYRA plugin host context is missing host.runTranslationBackend().');
  }

  return context.host.runTranslationBackend(
    {
      providerId: 'translation-plugin-anthropic',
      providerLabel: 'Anthropic Translation'
    },
    request
  );
}

