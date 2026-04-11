function getPluginInfo(context) {
  return {
    pluginId: String(context?.plugin?.id || 'format-plugin-ttml').trim() || 'format-plugin-ttml',
    providerLabel: String(context?.plugin?.manifest?.name || 'TTML').trim() || 'TTML'
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
          formatId: 'ttml',
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
  const projectName = String(exportData?.projectName || 'Untitled_Project').trim() || 'Untitled_Project';
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
  let content = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  content += `<tt xml:lang="${languageCode}"\n`;
  content += `    xmlns="http://www.w3.org/ns/ttml"\n`;
  content += `    xmlns:tts="http://www.w3.org/ns/ttml#styling"\n`;
  content += `    xmlns:ttm="http://www.w3.org/ns/ttml#metadata">\n`;
  content += `  <head>\n`;
  content += `    <metadata>\n`;
  content += `      <ttm:title>${helpers.escapeXML(projectName)}</ttm:title>\n`;
  content += `      <ttm:desc>Exported by OCYRA on ${now}</ttm:desc>\n`;
  content += `    </metadata>\n`;
  content += `    <styling>\n`;
  content += `      <style xml:id="s1" tts:fontFamily="Arial,Helvetica,sans-serif"\n`;
  content += `             tts:fontSize="100%" tts:color="white"\n`;
  content += `             tts:backgroundColor="rgba(0,0,0,0.8)"\n`;
  content += `             tts:textAlign="center"/>\n`;
  content += `    </styling>\n`;
  content += `    <layout>\n`;
  content += `      <region xml:id="r1" tts:origin="10% 80%" tts:extent="80% 15%"\n`;
  content += `              tts:displayAlign="after"/>\n`;
  content += `    </layout>\n`;
  content += `  </head>\n`;
  content += `  <body>\n`;
  content += `    <div region="r1">\n`;

  subtitles.forEach((subtitle, index) => {
    const text = helpers.escapeXML(helpers.getSubtitleText(subtitle, languageCode).trim()).replace(/\n/g, '<br/>');
    content += `      <p xml:id="p${index + 1}" begin="${helpers.formatXMLTime(subtitle.startTime)}" end="${helpers.formatXMLTime(subtitle.endTime)}" style="s1">${text}</p>\n`;
  });

  content += `    </div>\n`;
  content += `  </body>\n`;
  content += `</tt>\n`;

  return {
    content,
    mimeType: 'application/ttml+xml',
    filename: helpers.buildLanguageFilename(projectName, languageCode, 'ttml'),
    successMessage: `${languageCode} subtitles exported as TTML`
  };
}

export async function run(request, context) {
  const helpers = normalizeHelpers(context);
  const exportArtifact = findInputArtifact(request, 'FormatExportArtifact')?.data || null;
  if (exportArtifact) {
    return buildExportResult(context, serializeExport(exportArtifact, helpers));
  }

  throw new Error('format-plugin-ttml supports export only and expected FormatExportArtifact.');
}

