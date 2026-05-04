export async function run(request, context) {
  if (!context?.host?.speech?.transcribe) {
    throw new Error('OCYRA plugin host context is missing host.speech.transcribe().');
  }

  return context.host.speech.transcribe(
    {
      command: 'transcribe_with_diarization',
      providerId: 'speech-plugin-whispercpp-sherpa',
      providerLabel: 'whisper.cpp + Sherpa-ONNX',
      diarizationEnabled: true
    },
    request
  );
}
