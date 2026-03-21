export async function run(request, context) {
  if (!context?.host?.runTranslationBackend) {
    throw new Error('XYRA plugin host context is missing host.runTranslationBackend().');
  }

  return context.host.runTranslationBackend(
    {
      providerId: 'translation-plugin-ollama',
      providerLabel: 'Ollama Translation'
    },
    request
  );
}
