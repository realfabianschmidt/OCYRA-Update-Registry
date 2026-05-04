export async function run(request, context) {
  if (!request) {
    throw new Error('Example plugin received no request payload.');
  }

  if (!context?.host?.translation?.translate) {
    throw new Error(
      'Replace the template handler with a real implementation or provide host.translation.translate().'
    );
  }

  return context.host.translation.translate(
    {
      providerId: 'translation-plugin-example',
      providerLabel: 'Example Translation Plugin'
    },
    request
  );
}
