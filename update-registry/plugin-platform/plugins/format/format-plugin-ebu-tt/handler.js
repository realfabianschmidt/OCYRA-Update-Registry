function getPluginInfo(context) {
  return {
    pluginId: String(context?.plugin?.id || 'format-plugin-ebu-tt').trim() || 'format-plugin-ebu-tt',
    providerLabel: String(context?.plugin?.manifest?.name || 'EBU-TT').trim() || 'EBU-TT'
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
    throw new Error('XYRA plugin host context is missing host.getFileFormatHelpers().');
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
          formatId: 'ebu-tt',
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
  const frameRateInfo = helpers.getProjectVideoFrameRate(exportData?.project, 25);
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

  let content = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  content += `<tt xml:lang="${languageCode}"\n`;
  content += `    xmlns="http://www.w3.org/ns/ttml"\n`;
  content += `    xmlns:ttp="http://www.w3.org/ns/ttml#parameter"\n`;
  content += `    xmlns:tts="http://www.w3.org/ns/ttml#styling"\n`;
  content += `    xmlns:ttm="http://www.w3.org/ns/ttml#metadata"\n`;
  content += `    xmlns:ebuttm="urn:ebu:tt:metadata"\n`;
  content += `    ttp:timeBase="media"\n`;
  content += `    ttp:frameRate="${frameRateInfo.frameRate}"\n`;
  content += `    ttp:frameRateMultiplier="${frameRateInfo.frameRateMultiplier}"\n`;
  content += `    ttp:dropMode="nonDrop">\n`;
  content += `  <head>\n`;
  content += `    <metadata>\n`;
  content += `      <ttm:title>${helpers.escapeXML(projectName)}</ttm:title>\n`;
  content += `      <ebuttm:documentMetadata>\n`;
  content += `        <ebuttm:conformsToStandard>urn:ebu:tt:distribution:2018-04</ebuttm:conformsToStandard>\n`;
  content += `        <ebuttm:authoredFrameRate>${helpers.escapeXML(frameRateInfo.authoredFrameRate)}</ebuttm:authoredFrameRate>\n`;
  content += `        <ebuttm:documentCreationDate>${now}</ebuttm:documentCreationDate>\n`;
  content += `        <ebuttm:authoringTool>XYRA Captions</ebuttm:authoringTool>\n`;
  content += `      </ebuttm:documentMetadata>\n`;
  content += `    </metadata>\n`;
  content += `    <styling>\n`;
  content += `      <style xml:id="s1"\n`;
  content += `             tts:fontFamily="monospaceSansSerif"\n`;
  content += `             tts:fontSize="160%"\n`;
  content += `             tts:lineHeight="125%"\n`;
  content += `             tts:color="#ffffff"\n`;
  content += `             tts:backgroundColor="#000000c2"\n`;
  content += `             tts:textAlign="center"\n`;
  content += `             tts:wrapOption="wrap"/>\n`;
  content += `    </styling>\n`;
  content += `    <layout>\n`;
  content += `      <region xml:id="r1"\n`;
  content += `              tts:origin="10% 80%"\n`;
  content += `              tts:extent="80% 15%"\n`;
  content += `              tts:overflow="visible"\n`;
  content += `              tts:displayAlign="after"/>\n`;
  content += `    </layout>\n`;
  content += `  </head>\n`;
  content += `  <body>\n`;
  content += `    <div region="r1">\n`;

  subtitles.forEach((subtitle, index) => {
    const text = helpers.getSubtitleText(subtitle, languageCode).trim();
    const escapedLines = text.split('\n').map(line => helpers.escapeXML(line));
    content += `      <p xml:id="p${index + 1}" begin="${helpers.formatXMLTime(subtitle.startTime)}" end="${helpers.formatXMLTime(subtitle.endTime)}" style="s1">${escapedLines.join('<br/>')}</p>\n`;
  });

  content += `    </div>\n`;
  content += `  </body>\n`;
  content += `</tt>\n`;

  return {
    content,
    mimeType: 'application/ttml+xml',
    filename: helpers.buildLanguageFilename(projectName, languageCode, 'xml', { suffix: 'EBUTT' }),
    successMessage: `${languageCode} subtitles exported as EBU-TT`
  };
}

export async function run(request, context) {
  const helpers = normalizeHelpers(context);
  const exportArtifact = findInputArtifact(request, 'FormatExportArtifact')?.data || null;
  if (exportArtifact) {
    return buildExportResult(context, serializeExport(exportArtifact, helpers));
  }

  throw new Error('format-plugin-ebu-tt supports export only and expected FormatExportArtifact.');
}
