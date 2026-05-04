export async function run(request, context) {
  if (!context?.host?.translation?.translate) {
    throw new Error('OCYRA plugin host context is missing host.translation.translate().');
  }

  return context.host.translation.translate(
    {
      providerId: 'translation-plugin-azure',
      providerLabel: 'Azure OpenAI Translation'
    },
    request
  );
}
