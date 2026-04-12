function getPluginInfo(context) {
  return {
    pluginId: String(context?.plugin?.id || 'format-plugin-rocyra-review').trim() || 'format-plugin-rocyra-review',
    providerLabel: String(context?.plugin?.manifest?.name || 'OCYRA Review Package').trim() || 'OCYRA Review Package'
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

function buildImportResult(context, payload, validation) {
  const { pluginId, providerLabel } = getPluginInfo(context);
  return {
    ok: true,
    output_artifacts: [
      {
        artifactType: 'FormatImportArtifact',
        schemaVersion: '1',
        providerId: pluginId,
        providerLabel,
        formatId: 'rocyra-review-package',
        target: 'review-package',
        data: {
          payload,
          validation
        }
      }
    ]
  };
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
          formatId: 'rocyra-review-package',
          target: 'review-package',
          data: artifact
        }
      ]
      : []
  };
}

async function parseImportPayload(rawFile, helpers) {
  const parsed = await helpers.safeParseJson(rawFile?.content, 'Review package');
  return {
    type: 'review-package',
    reviewData: parsed.value,
    parseError: parsed.error
  };
}

async function validateImportPayload(payload, helpers) {
  if (payload?.parseError) {
    return {
      isValid: false,
      errors: [payload.parseError],
      warnings: []
    };
  }

  const reviewData = payload?.reviewData;
  const baseValidation = await helpers.validateProjectShape(reviewData);
  const errors = [...(Array.isArray(baseValidation?.errors) ? baseValidation.errors : [])];

  if (!reviewData?.meta?.reviewPackage?.isReview) {
    errors.push('This file is not a valid OCYRA review package.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings: []
  };
}

function serializeExport(exportData, helpers) {
  const reviewData = exportData?.reviewData;
  const filename = String(exportData?.filename || '').trim();
  return {
    content: JSON.stringify(reviewData, null, 2),
    mimeType: 'application/json',
    filename: filename || helpers.buildProjectFilename(reviewData?.meta?.name || 'Review_Package', 'rocyra', { suffix: 'review' })
  };
}

export async function run(request, context) {
  const helpers = normalizeHelpers(context);
  const rawFile = findInputArtifact(request, 'RawFileArtifact')?.data || null;
  if (rawFile) {
    const payload = await parseImportPayload(rawFile, helpers);
    const validation = await validateImportPayload(payload, helpers);
    return buildImportResult(context, payload, validation);
  }

  const exportArtifact = findInputArtifact(request, 'FormatExportArtifact')?.data || null;
  if (exportArtifact) {
    return buildExportResult(context, serializeExport(exportArtifact, helpers));
  }

  throw new Error('format-plugin-rocyra-review expected RawFileArtifact or FormatExportArtifact.');
}

