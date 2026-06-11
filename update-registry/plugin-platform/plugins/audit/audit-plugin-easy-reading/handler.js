const PROVIDER_ID = 'audit-plugin-easy-reading';
const PROVIDER_LABEL = 'Easy Reading';

function findArtifact(request, artifactType) {
  const artifacts = Array.isArray(request?.input_artifacts) ? request.input_artifacts : [];
  return artifacts.find(artifact => artifact?.artifactType === artifactType) || null;
}

function resolveSeverity(policy, ruleId, fallback) {
  const entries = Array.isArray(policy?.audit_rules) ? policy.audit_rules : [];
  const match = entries.find(entry => String(entry?.rule_id || '').trim() === ruleId);
  const severity = String(match?.severity || '').trim().toLowerCase();
  return severity === 'error' || severity === 'warning' || severity === 'info' ? severity : fallback;
}

function statusFromScore(score) {
  if (score >= 90) return 'pass';
  if (score >= 70) return 'warn';
  return 'fail';
}

function checkSegmentMeasurements(measurements, policy) {
  const rules = policy?.quality_rules && typeof policy.quality_rules === 'object' ? policy.quality_rules : {};
  const checks = [];
  const m = measurements || {};

  if (!m.hasText) {
    checks.push({ rule: 'EMPTY_TEXT', severity: 'error', message: 'Subtitle segment has no visible text.' });
    return checks;
  }
  if (m.duration === null || m.duration === undefined || m.cps === null || m.cps === undefined) {
    checks.push({ rule: 'INVALID_TIMING', severity: 'error', message: 'Segment timing is invalid; rate rules cannot be evaluated.' });
    return checks;
  }
  if (Number.isFinite(rules.MIN_DURATION) && m.duration < rules.MIN_DURATION) {
    checks.push({
      rule: 'MIN_DURATION',
      severity: resolveSeverity(policy, 'MIN_DURATION', 'error'),
      message: `Duration ${m.duration.toFixed(2)}s is below the minimum of ${rules.MIN_DURATION.toFixed(2)}s.`
    });
  }
  if (Number.isFinite(rules.MAX_DURATION) && m.duration > rules.MAX_DURATION) {
    checks.push({
      rule: 'MAX_DURATION',
      severity: resolveSeverity(policy, 'MAX_DURATION', 'warning'),
      message: `Duration ${m.duration.toFixed(2)}s exceeds the maximum of ${rules.MAX_DURATION.toFixed(2)}s.`
    });
  }
  if (Number.isFinite(rules.MAX_CPS) && m.cps > rules.MAX_CPS) {
    checks.push({
      rule: 'MAX_CPS',
      severity: resolveSeverity(policy, 'MAX_CPS', 'error'),
      message: `${m.cps.toFixed(1)} CPS exceeds the limit of ${rules.MAX_CPS}.`
    });
  }
  if (Number.isFinite(rules.MAX_LINES) && m.lineCount > rules.MAX_LINES) {
    checks.push({
      rule: 'MAX_LINES',
      severity: resolveSeverity(policy, 'MAX_LINES', 'error'),
      message: `${m.lineCount} lines exceed the limit of ${rules.MAX_LINES}.`
    });
  }
  if (Number.isFinite(rules.MAX_LINE_LENGTH) && m.maxLineLength > rules.MAX_LINE_LENGTH) {
    checks.push({
      rule: 'MAX_LINE_LENGTH',
      severity: resolveSeverity(policy, 'MAX_LINE_LENGTH', 'error'),
      message: `Line length ${m.maxLineLength} exceeds the limit of ${rules.MAX_LINE_LENGTH} characters.`
    });
  }
  if (m.gapToNext !== null && m.gapToNext !== undefined) {
    if (m.gapToNext < 0) {
      checks.push({
        rule: 'OVERLAP',
        severity: resolveSeverity(policy, 'OVERLAP', 'error'),
        message: `Segment overlaps the next subtitle by ${Math.abs(m.gapToNext).toFixed(2)}s.`
      });
    } else if (Number.isFinite(rules.MIN_GAP) && m.gapToNext < rules.MIN_GAP) {
      checks.push({
        rule: 'MIN_GAP',
        severity: resolveSeverity(policy, 'MIN_GAP', 'warning'),
        message: `Gap ${m.gapToNext.toFixed(2)}s is below the minimum of ${rules.MIN_GAP.toFixed(2)}s.`
      });
    }
  }

  return checks;
}

function evaluateSubtitleScope(policy, facts) {
  const languages = Array.isArray(facts?.languages) ? facts.languages : [];

  const perLanguage = languages.map(language => {
    const segments = Array.isArray(language?.segments) ? language.segments : [];
    const issues = [];

    segments.forEach(segment => {
      const checks = checkSegmentMeasurements(segment?.measurements, policy);
      if (checks.length === 0) {
        return;
      }
      issues.push({
        ref: {
          segmentId: String(segment?.id || ''),
          index: Number(segment?.index || 0),
          startTime: Number(segment?.startTime),
          endTime: Number(segment?.endTime)
        },
        preview: String(segment?.text || '').replace(/\s+/g, ' ').trim().slice(0, 80),
        checks
      });
    });

    const totalItems = segments.length;
    const failCount = issues.length;
    const passCount = Math.max(0, totalItems - failCount);
    const score = totalItems === 0 ? 100 : Math.max(0, Math.round((passCount / totalItems) * 100));

    return {
      code: String(language?.code || ''),
      label: String(language?.label || language?.code || ''),
      totalItems,
      passCount,
      failCount,
      score,
      issues
    };
  });

  return summarize(perLanguage);
}

function evaluateLocalizationScope(policy, facts) {
  const locales = Array.isArray(facts?.locales) ? facts.locales : [];

  const perLanguage = locales.map(locale => {
    const units = Array.isArray(locale?.units) ? locale.units : [];
    const issues = units
      .filter(unit => !unit?.hasTarget)
      .map(unit => ({
        ref: {
          unitId: String(unit?.id || ''),
          key: String(unit?.key || ''),
          documentId: String(unit?.documentId || '')
        },
        preview: String(unit?.key || unit?.id || ''),
        checks: [{
          rule: 'MISSING_TARGET',
          severity: resolveSeverity(policy, 'MISSING_TARGET', 'warning'),
          message: `Unit "${unit?.key || unit?.id || ''}" has no ${locale?.code || ''} translation.`
        }]
      }));

    const totalItems = units.length;
    const failCount = issues.length;
    const passCount = Math.max(0, totalItems - failCount);
    const score = totalItems === 0 ? 100 : Math.max(0, Math.round((passCount / totalItems) * 100));

    return {
      code: String(locale?.code || ''),
      label: String(locale?.label || locale?.code || ''),
      totalItems,
      passCount,
      failCount,
      score,
      issues
    };
  });

  return summarize(perLanguage);
}

function summarize(perLanguage) {
  const totalItems = perLanguage.reduce((sum, entry) => sum + entry.totalItems, 0);
  const failCount = perLanguage.reduce((sum, entry) => sum + entry.failCount, 0);
  const passCount = Math.max(0, totalItems - failCount);
  const score = totalItems === 0 ? 100 : Math.max(0, Math.round((passCount / totalItems) * 100));
  return {
    perLanguage,
    summary: {
      score,
      status: statusFromScore(score),
      totalItems,
      passCount,
      failCount
    }
  };
}

function evaluateChecklist(policy, facts, summary) {
  const scope = String(facts?.scope || '').trim();
  const items = Array.isArray(policy?.audit_checklist) ? policy.audit_checklist : [];
  const languages = Array.isArray(facts?.languages) ? facts.languages : [];
  const hasSegments = languages.some(language => Number(language?.segmentCount || 0) > 0);
  const languageCodes = languages
    .map(language => String(language?.code || '').trim().toUpperCase())
    .filter(Boolean);

  return items.map(item => {
    const evaluation = String(item?.evaluation || '').trim();
    const base = {
      id: String(item?.id || ''),
      title: String(item?.title || ''),
      level: String(item?.level || ''),
      evaluation
    };

    if (scope === 'localization-units') {
      // Timing- and caption-based rules target video subtitle projects.
      return { ...base, status: 'na', note: 'Video subtitle rule - not applicable to document localization projects.' };
    }

    if (evaluation === 'subtitle_presence') {
      return hasSegments
        ? { ...base, status: 'pass', note: 'Subtitle tracks present' }
        : { ...base, status: 'fail', note: 'No subtitle tracks found' };
    }
    if (evaluation === 'captions_prerecorded') {
      return hasSegments
        ? { ...base, status: 'pass', note: `Tracks: ${languageCodes.join(', ')}` }
        : { ...base, status: 'fail', note: 'No caption tracks found' };
    }
    if (evaluation === 'subtitle_quality' || evaluation === 'easy_reading_comfort') {
      const status = statusFromScore(summary.score);
      const note = summary.failCount > 0
        ? `${summary.failCount} segment(s) exceed the profile limits - see detail pages`
        : 'All segments pass the profile quality rules';
      return { ...base, status, note };
    }
    if (evaluation === 'not_applicable_live') {
      return { ...base, status: 'na', note: 'N/A - Pre-recorded content only' };
    }
    if (evaluation.startsWith('manual')) {
      return { ...base, status: 'manual', note: 'Requires manual verification' };
    }
    return { ...base, status: 'manual', note: 'Requires manual verification' };
  });
}

function buildAuditReportArtifact(policy, facts) {
  const scope = String(facts?.scope || '').trim();
  const evaluated = scope === 'localization-units'
    ? evaluateLocalizationScope(policy, facts)
    : evaluateSubtitleScope(policy, facts);
  const checklist = evaluateChecklist(policy, facts, evaluated.summary);

  return {
    artifactType: 'AuditReportArtifact',
    schemaVersion: '1',
    providerId: PROVIDER_ID,
    providerLabel: PROVIDER_LABEL,
    profile: {
      id: String(policy?.id || ''),
      name: String(policy?.report?.profile_name || policy?.name || ''),
      version: String(policy?.report?.profile_version || ''),
      standardsReference: String(policy?.report?.standards_reference || '')
    },
    scope,
    evaluatedAt: Date.now(),
    summary: evaluated.summary,
    checklist,
    perLanguage: evaluated.perLanguage
  };
}

export async function run(request, context) {
  if (!context?.host?.readPluginJsonFile) {
    throw new Error('OCYRA plugin host context is missing host.readPluginJsonFile().');
  }

  const policyFile = String(context?.plugin?.manifest?.policy_file || 'policy.json').trim() || 'policy.json';
  const policy = await context.host.readPluginJsonFile(policyFile);

  const contextArtifact = findArtifact(request, 'AccessibilityContextArtifact');
  const requestKind = String(contextArtifact?.data?.request_kind || 'resolve-policy').trim();

  if (requestKind === 'evaluate-audit') {
    const factsArtifact = findArtifact(request, 'ContentAuditFactsArtifact');
    const facts = factsArtifact?.data;
    if (!facts || !String(facts.scope || '').trim()) {
      throw new Error('evaluate-audit request is missing a ContentAuditFactsArtifact with a scope.');
    }

    return {
      ok: true,
      output_artifacts: [buildAuditReportArtifact(policy, facts)],
      diagnostics: [
        {
          pluginId: PROVIDER_ID,
          severity: 'info',
          code: 'AUDIT_EVALUATED',
          message: `Evaluated ${facts.scope} against the ${PROVIDER_LABEL} profile.`
        }
      ]
    };
  }

  return {
    ok: true,
    output_artifacts: [
      {
        artifactType: 'PolicyConstraintsArtifact',
        schemaVersion: '1',
        providerId: PROVIDER_ID,
        providerLabel: PROVIDER_LABEL,
        policy
      }
    ],
    diagnostics: [
      {
        pluginId: PROVIDER_ID,
        severity: 'info',
        code: 'AUDIT_POLICY_LOADED',
        message: `Loaded accessibility policy from ${PROVIDER_ID}.`
      }
    ]
  };
}
