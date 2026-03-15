'use strict';

window.AIPipelineRegistry?.register({
    id: 'pipeline-openai-sherpa',
    apiVersion: '1',
    name: 'OpenAI Whisper + Sherpa-ONNX',
    packageIds: ['pipeline-openai-sherpa'],
    priority: 180,
    matchesSettings(context) {
        return context.transcriptionProvider === 'openai'
            && context.diarizationEnabled
            && context.diarizationProvider === 'sherpa-onnx';
    },
    buildExecutionPlan(context) {
        const providerLabel = context.activePipelineName || 'OpenAI Whisper + Sherpa-ONNX';
        const detailText = context.activePipeline
            ? 'Active hybrid bundle handler. Stages include provider-specific preparation and word-level midpoint merge.'
            : 'Stages include audio extraction, speaker diarization, transcription, and word-level midpoint merge.';

        return {
            command: 'transcribe_with_diarization',
            providerLabel,
            detailText,
            introMessage: `Preparing ${providerLabel}...`
        };
    }
});
