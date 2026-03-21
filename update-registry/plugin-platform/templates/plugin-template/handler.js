export async function run(request, context) {
  if (!request) {
    throw new Error('Example plugin received no request payload.');
  }

  if (!context?.host?.runTranslationBackend) {
    throw new Error(
      'Replace the template handler with a real implementation or provide host.runTranslationBackend().'
    );
  }

  return context.host.runTranslationBackend(
    {
      providerId: 'translation-plugin-example',
      providerLabel: 'Example Translation Plugin'
    },
    request
  );
}
