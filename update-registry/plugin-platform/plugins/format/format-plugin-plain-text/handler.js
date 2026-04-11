function getPluginInfo(context) {
  return {
    pluginId: String(context?.plugin?.id || 'format-plugin-plain-text').trim() || 'format-plugin-plain-text',
    providerLabel: String(context?.plugin?.manifest?.name || 'Plain Text').trim() || 'Plain Text'
  };
}

function findInputArtifact(request, artifactType) {
  const artifacts = Array.isArray(request?.input_artifacts)
    ? request.input_artifacts
    : Array.isArray(request?.inputArtifacts)
      ? request.inputArtifacts
      : [];
  return artifacts.find(artifact => String(artifact?.artifactType || '').trim() === artifactType) || null;
}

function normalizeHelpers(context) {
  if (!context?.host?.getFileFormatHelpers) {
    throw new Error('OCYRA plugin host context is missing host.getFileFormatHelpers().');
  }
  return context.host.getFileFormatHelpers();
}

function buildExportResult(context, artifact) {
  const { pluginId, providerLabel } = getPluginInfo(context);
  return {
    ok: true,
    output_artifacts: artifact
      ? [
        {
          artifactType: 'RawFileArtifact',
          schemaVersion: '1',
          providerId: pluginId,
          providerLabel,
          formatId: 'plain-text',
          target: 'subtitle',
          data: artifact
        }
      ]
      : []
  };
}

function serializeExport(exportData, helpers) {
  const subtitles = helpers.sortSubtitles(exportData?.subtitles || []);
  if (subtitles.length === 0) {
    return null;
  }

  const languageCode = String(exportData?.languageCode || 'und').trim() || 'und';
  const languageData = exportData?.languageData || {};
  const projectName = String(exportData?.projectName || 'Untitled_Project').trim() || 'Untitled_Project';
  const textEntries = subtitles
    .map(subtitle => ({
      subtitle,
      text: helpers.getSubtitleText(subtitle, languageCode).trim()
    }))
    .filter(entry => entry.text);

  if (textEntries.length === 0) {
    return null;
  }

  let content = '';
  let previousEndTime = null;
  let previousText = '';
  const sentenceEndPattern = /(?:[.!?]|\.{3})['")\]]*\s*$/;

  textEntries.forEach((entry, index) => {
    const { subtitle, text } = entry;
    const gap = previousEndTime === null ? 0 : subtitle.startTime - previousEndTime;
    const needsParagraphBreak = index > 0 && gap > 2.0 && sentenceEndPattern.test(previousText);

    if (content) {
      content += needsParagraphBreak ? '\n\n' : ' ';
    }
    content += text;
    previousEndTime = subtitle.endTime;
    previousText = text;
  });

  return {
    content,
    mimeType: 'text/plain',
    filename: helpers.buildLanguageFilename(projectName, languageCode, 'txt', { suffix: 'PLAIN' }),
    successMessage: `${languageData?.name || languageCode} subtitles exported as plain text`
  };
}

export async function run(request, context) {
  const helpers = normalizeHelpers(context);
  const exportArtifact = findInputArtifact(request, 'FormatExportArtifact')?.data || null;
  if (exportArtifact) {
    return buildExportResult(context, serializeExport(exportArtifact, helpers));
  }

  throw new Error('format-plugin-plain-text supports export only and expected FormatExportArtifact.');
}

