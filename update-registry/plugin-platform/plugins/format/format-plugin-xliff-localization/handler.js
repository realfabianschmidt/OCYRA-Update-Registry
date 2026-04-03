const FORMAT_ID = 'xliff-localization';
const MIME_TYPE = 'application/xliff+xml';

function cloneJson(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function normalizeString(value) {
    return String(value || '');
}

function sanitizeFilename(value, fallback = 'localization-project') {
    const normalized = normalizeString(value).trim().replace(/[<>:"/\\|?*\x00-\x1F]+/g, ' ');
    const collapsed = normalized.replace(/\s+/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
    return collapsed || fallback;
}

function escapeXml(value) {
    return normalizeString(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function decodeXmlEntities(value) {
    return normalizeString(value)
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, '\'')
        .replace(/&amp;/g, '&')
        .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
        .replace(/&#([0-9]+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)));
}

function stripXmlTags(value) {
    return decodeXmlEntities(
        normalizeString(value)
            .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
    );
}

function parseAttributes(raw = '') {
    const attributes = {};
    const pattern = /([A-Za-z_][\w:.-]*)\s*=\s*("([^"]*)"|'([^']*)')/g;
    let match;

    while ((match = pattern.exec(normalizeString(raw))) !== null) {
        attributes[match[1]] = match[3] ?? match[4] ?? '';
    }

    return attributes;
}

function firstTag(block = '', tagName = '') {
    const match = new RegExp(`<${tagName}\\b([^>]*)>([\\s\\S]*?)<\\/${tagName}>`, 'i').exec(normalizeString(block));
    if (!match) {
        return null;
    }

    return {
        attributes: parseAttributes(match[1]),
        innerXml: match[2]
    };
}

function collectTagContents(block = '', tagName = '') {
    const values = [];
    const pattern = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'gi');
    let match;

    while ((match = pattern.exec(normalizeString(block))) !== null) {
        values.push(stripXmlTags(match[1]));
    }

    return values.filter(Boolean);
}

function extractRootMetadata(xml = '') {
    const rootMatch = /<xliff\b([^>]*)>/i.exec(normalizeString(xml));
    const rootAttributes = rootMatch ? parseAttributes(rootMatch[1]) : {};
    const version = normalizeString(rootAttributes.version || '1.2').trim() || '1.2';

    return {
        version,
        rootAttributes,
        sourceLocale: normalizeString(rootAttributes.srcLang || rootAttributes['source-language']).trim(),
        targetLocale: normalizeString(rootAttributes.trgLang || rootAttributes['target-language']).trim()
    };
}

function resolveUnitStatus(targetText = '', stateValue = '') {
    const hasTarget = Boolean(normalizeString(targetText).trim());
    if (!hasTarget) return 'untranslated';

    const normalizedState = normalizeString(stateValue).trim().toLowerCase();
    if (!normalizedState) return 'translated';
    if (normalizedState.includes('review')) return 'review';
    if (normalizedState.includes('translated')) return 'translated';
    if (normalizedState.includes('final')) return 'approved';
    if (normalizedState.includes('approved')) return 'approved';
    if (normalizedState.includes('signed-off')) return 'approved';
    return 'translated';
}

function detectSourceLocale(project = {}) {
    return normalizeString(
        project?.locales?.source
        || project?.meta?.sourceLocale
        || project?.meta?.sourceLanguage
    ).trim();
}

function detectTargetLocales(project = {}) {
    const explicitTargets = Array.isArray(project?.locales?.targets)
        ? project.locales.targets
        : [];
    const normalized = explicitTargets.map(value => normalizeString(value).trim()).filter(Boolean);
    if (normalized.length > 0) {
        return [...new Set(normalized)];
    }

    const fallback = normalizeString(project?.meta?.targetLanguage || project?.meta?.targetLocale).trim();
    return fallback ? [fallback] : [];
}

function ensureLocalizationPayload(payload = {}, fallbackName = '') {
    const sourceLocale = normalizeString(payload?.locales?.source || payload?.meta?.sourceLocale).trim();
    const targetLocales = Array.isArray(payload?.locales?.targets)
        ? payload.locales.targets.map(value => normalizeString(value).trim()).filter(Boolean)
        : [];

    return {
        ...payload,
        meta: {
            ...(payload?.meta && typeof payload.meta === 'object' && !Array.isArray(payload.meta) ? payload.meta : {}),
            name: normalizeString(payload?.meta?.name || fallbackName || 'Imported XLIFF').trim() || 'Imported XLIFF',
            workflow: normalizeString(payload?.meta?.workflow || 'xliff-import').trim() || 'xliff-import',
            projectKind: 'localization-project',
            sourceLocale,
            targetLocales
        },
        documents: Array.isArray(payload?.documents) ? payload.documents : [],
        units: Array.isArray(payload?.units) ? payload.units : [],
        locales: {
            source: sourceLocale,
            targets: [...new Set(targetLocales)]
        },
        filters: payload?.filters && typeof payload.filters === 'object' && !Array.isArray(payload.filters)
            ? payload.filters
            : {},
        statuses: payload?.statuses && typeof payload.statuses === 'object' && !Array.isArray(payload.statuses)
            ? payload.statuses
            : {},
        contextRefs: Array.isArray(payload?.contextRefs) ? payload.contextRefs : []
    };
}

function buildImportArtifact(payload, validation) {
    return {
        ok: true,
        output_artifacts: [
            {
                artifactType: 'FormatImportArtifact',
                schemaVersion: '1',
                formatId: FORMAT_ID,
                target: 'localization',
                data: {
                    payload: {
                        type: 'localization-project',
                        localizationData: payload
                    },
                    validation
                }
            }
        ],
        diagnostics: []
    };
}

function buildExportArtifact(data = {}) {
    return {
        ok: true,
        output_artifacts: [
            {
                artifactType: 'RawFileArtifact',
                schemaVersion: '1',
                data
            }
        ],
        diagnostics: []
    };
}

function getDirectChildElements(parent, localNames = []) {
    return Array.from(parent?.childNodes || [])
        .filter(node => node?.nodeType === 1)
        .filter(node => {
            const localName = normalizeString(node.localName || node.nodeName).split(':').pop().toLowerCase();
            return localNames.includes(localName);
        });
}

function getFirstDirectChild(parent, localNames = []) {
    return getDirectChildElements(parent, localNames)[0] || null;
}

function extractInnerXml(element) {
    if (!element || typeof XMLSerializer !== 'function') return '';
    const serializer = new XMLSerializer();
    return Array.from(element.childNodes || [])
        .map(node => serializer.serializeToString(node))
        .join('');
}

function collectNoteTextFromElement(element) {
    return Array.from(element?.getElementsByTagName?.('note') || [])
        .map(note => normalizeString(note.textContent).trim())
        .filter(Boolean)
        .join('\n');
}

function importWithDom(xmlString = '', filename = '') {
    if (typeof DOMParser !== 'function') {
        return null;
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, 'application/xml');
    if (doc.querySelector('parsererror')) {
        return null;
    }

    const xliffEl = doc.documentElement;
    if (!xliffEl || normalizeString(xliffEl.localName || xliffEl.nodeName).split(':').pop().toLowerCase() !== 'xliff') {
        return null;
    }

    const version = normalizeString(xliffEl.getAttribute('version') || '1.2').trim() || '1.2';
    const rootSourceLocale = normalizeString(xliffEl.getAttribute('srcLang') || xliffEl.getAttribute('source-language')).trim();
    const rootTargetLocale = normalizeString(xliffEl.getAttribute('trgLang') || xliffEl.getAttribute('target-language')).trim();
    const fileElements = getDirectChildElements(xliffEl, ['file']);
    if (fileElements.length === 0) {
        return null;
    }

    const documents = [];
    const units = [];
    const sourceLocales = new Set();
    const targetLocales = new Set();

    fileElements.forEach((fileEl, fileIndex) => {
        const documentId = normalizeString(fileEl.getAttribute('id') || `document-${fileIndex + 1}`).trim() || `document-${fileIndex + 1}`;
        const sourceLocale = normalizeString(
            fileEl.getAttribute('source-language')
            || fileEl.getAttribute('srcLang')
            || rootSourceLocale
        ).trim();
        const targetLocale = normalizeString(
            fileEl.getAttribute('target-language')
            || fileEl.getAttribute('trgLang')
            || rootTargetLocale
        ).trim();
        const documentName = normalizeString(
            fileEl.getAttribute('original')
            || fileEl.getAttribute('id')
            || `${filename || 'document'}#${fileIndex + 1}`
        ).trim() || `${filename || 'document'}#${fileIndex + 1}`;

        if (sourceLocale) sourceLocales.add(sourceLocale);
        if (targetLocale) targetLocales.add(targetLocale);

        documents.push({
            id: documentId,
            name: documentName,
            original: normalizeString(fileEl.getAttribute('original')).trim(),
            dataType: normalizeString(fileEl.getAttribute('datatype')).trim(),
            sourceLocale,
            targetLocale,
            fileId: normalizeString(fileEl.getAttribute('id')).trim()
        });

        if (version.startsWith('2')) {
            const unitElements = Array.from(fileEl.getElementsByTagName('unit'));
            unitElements.forEach((unitEl, unitIndex) => {
                const baseUnitId = normalizeString(unitEl.getAttribute('id') || `unit-${fileIndex + 1}-${unitIndex + 1}`).trim()
                    || `unit-${fileIndex + 1}-${unitIndex + 1}`;
                const key = normalizeString(unitEl.getAttribute('name') || unitEl.getAttribute('resname') || baseUnitId).trim() || baseUnitId;
                const noteText = collectNoteTextFromElement(unitEl);
                const segmentElements = getDirectChildElements(unitEl, ['segment', 'ignorable']);
                const segments = segmentElements.length > 0 ? segmentElements : [unitEl];

                segments.forEach((segmentEl, segmentIndex) => {
                    const sourceEl = getFirstDirectChild(segmentEl, ['source']) || segmentEl.getElementsByTagName('source')[0] || null;
                    const targetEl = getFirstDirectChild(segmentEl, ['target']) || segmentEl.getElementsByTagName('target')[0] || null;
                    const segmentId = normalizeString(segmentEl.getAttribute?.('id') || '').trim();
                    const unitId = segments.length > 1
                        ? `${baseUnitId}:${segmentId || segmentIndex + 1}`
                        : baseUnitId;
                    const sourceText = normalizeString(sourceEl?.textContent).trim();
                    const targetText = normalizeString(targetEl?.textContent).trim();

                    units.push({
                        id: unitId,
                        key,
                        documentId,
                        source: sourceText,
                        sourceXml: extractInnerXml(sourceEl),
                        targets: targetLocale && targetText ? { [targetLocale]: targetText } : {},
                        status: resolveUnitStatus(targetText, targetEl?.getAttribute?.('state') || segmentEl.getAttribute?.('state') || ''),
                        context: noteText,
                        notes: noteText ? [noteText] : [],
                        xliffRef: {
                            version,
                            documentId,
                            fileId: normalizeString(fileEl.getAttribute('id')).trim(),
                            unitId: baseUnitId,
                            segmentId,
                            sourceLocale,
                            targetLocale
                        }
                    });
                });
            });
            return;
        }

        const bodyEl = getFirstDirectChild(fileEl, ['body']) || fileEl;
        const transUnitElements = Array.from(bodyEl.getElementsByTagName('trans-unit'));
        transUnitElements.forEach((unitEl, unitIndex) => {
            const unitId = normalizeString(unitEl.getAttribute('id') || `unit-${fileIndex + 1}-${unitIndex + 1}`).trim()
                || `unit-${fileIndex + 1}-${unitIndex + 1}`;
            const sourceEl = getFirstDirectChild(unitEl, ['source']) || unitEl.getElementsByTagName('source')[0] || null;
            const targetEl = getFirstDirectChild(unitEl, ['target']) || unitEl.getElementsByTagName('target')[0] || null;
            const sourceText = normalizeString(sourceEl?.textContent).trim();
            const targetText = normalizeString(targetEl?.textContent).trim();
            const noteText = collectNoteTextFromElement(unitEl);

            units.push({
                id: unitId,
                key: normalizeString(unitEl.getAttribute('resname') || unitId).trim() || unitId,
                documentId,
                source: sourceText,
                sourceXml: extractInnerXml(sourceEl),
                targets: targetLocale && targetText ? { [targetLocale]: targetText } : {},
                status: resolveUnitStatus(targetText, targetEl?.getAttribute?.('state') || ''),
                context: noteText,
                notes: noteText ? [noteText] : [],
                xliffRef: {
                    version,
                    documentId,
                    fileId: normalizeString(fileEl.getAttribute('id')).trim(),
                    unitId,
                    segmentId: '',
                    sourceLocale,
                    targetLocale
                }
            });
        });
    });

    return ensureLocalizationPayload({
        meta: {
            name: normalizeString(filename || 'Imported XLIFF').replace(/\.[^.]+$/, '') || 'Imported XLIFF',
            originalFilename: filename,
            xliffVersion: version
        },
        documents,
        units,
        locales: {
            source: [...sourceLocales][0] || rootSourceLocale,
            targets: [...targetLocales]
        },
        xliffState: {
            dialect: version.startsWith('2') ? 'xliff-2.x' : 'xliff-1.2',
            version,
            originalXml: xmlString
        }
    }, filename.replace(/\.[^.]+$/, ''));
}

function importWithRegex(xmlString = '', filename = '') {
    const { version, rootAttributes, sourceLocale: rootSourceLocale, targetLocale: rootTargetLocale } = extractRootMetadata(xmlString);
    const fileMatches = [...normalizeString(xmlString).matchAll(/<file\b([^>]*)>([\s\S]*?)<\/file>/gi)];
    if (fileMatches.length === 0) {
        return null;
    }

    const documents = [];
    const units = [];
    const sourceLocales = new Set();
    const targetLocales = new Set();

    fileMatches.forEach((fileMatch, fileIndex) => {
        const fileAttributes = parseAttributes(fileMatch[1]);
        const fileBody = fileMatch[2];
        const documentId = normalizeString(fileAttributes.id || `document-${fileIndex + 1}`).trim() || `document-${fileIndex + 1}`;
        const sourceLocale = normalizeString(
            fileAttributes['source-language']
            || fileAttributes.srcLang
            || rootSourceLocale
            || rootAttributes['source-language']
        ).trim();
        const targetLocale = normalizeString(
            fileAttributes['target-language']
            || fileAttributes.trgLang
            || rootTargetLocale
            || rootAttributes['target-language']
        ).trim();
        const documentName = normalizeString(
            fileAttributes.original
            || fileAttributes.id
            || `${filename || 'document'}#${fileIndex + 1}`
        ).trim() || `${filename || 'document'}#${fileIndex + 1}`;

        if (sourceLocale) sourceLocales.add(sourceLocale);
        if (targetLocale) targetLocales.add(targetLocale);

        documents.push({
            id: documentId,
            name: documentName,
            original: normalizeString(fileAttributes.original).trim(),
            dataType: normalizeString(fileAttributes.datatype).trim(),
            sourceLocale,
            targetLocale,
            fileId: normalizeString(fileAttributes.id).trim()
        });

        if (version.startsWith('2')) {
            const unitMatches = [...normalizeString(fileBody).matchAll(/<unit\b([^>]*)>([\s\S]*?)<\/unit>/gi)];
            unitMatches.forEach((unitMatch, unitIndex) => {
                const unitAttributes = parseAttributes(unitMatch[1]);
                const unitBody = unitMatch[2];
                const baseUnitId = normalizeString(unitAttributes.id || `unit-${fileIndex + 1}-${unitIndex + 1}`).trim()
                    || `unit-${fileIndex + 1}-${unitIndex + 1}`;
                const key = normalizeString(unitAttributes.name || unitAttributes.resname || baseUnitId).trim() || baseUnitId;
                const noteText = collectTagContents(unitBody, 'note').join('\n');
                const segmentMatches = [...normalizeString(unitBody).matchAll(/<(segment|ignorable)\b([^>]*)>([\s\S]*?)<\/\1>/gi)];
                const effectiveSegments = segmentMatches.length > 0 ? segmentMatches : [[null, 'segment', '', unitBody]];

                effectiveSegments.forEach((segmentMatch, segmentIndex) => {
                    const segmentAttributes = parseAttributes(segmentMatch[2]);
                    const segmentBody = segmentMatch[3];
                    const sourceTag = firstTag(segmentBody, 'source');
                    const targetTag = firstTag(segmentBody, 'target');
                    const sourceText = stripXmlTags(sourceTag?.innerXml || '');
                    const targetText = stripXmlTags(targetTag?.innerXml || '');
                    const segmentId = normalizeString(segmentAttributes.id).trim();
                    const unitId = effectiveSegments.length > 1
                        ? `${baseUnitId}:${segmentId || segmentIndex + 1}`
                        : baseUnitId;

                    units.push({
                        id: unitId,
                        key,
                        documentId,
                        source: sourceText,
                        sourceXml: normalizeString(sourceTag?.innerXml),
                        targets: targetLocale && targetText ? { [targetLocale]: targetText } : {},
                        status: resolveUnitStatus(targetText, targetTag?.attributes?.state || segmentAttributes.state || ''),
                        context: noteText,
                        notes: noteText ? [noteText] : [],
                        xliffRef: {
                            version,
                            documentId,
                            fileId: normalizeString(fileAttributes.id).trim(),
                            unitId: baseUnitId,
                            segmentId,
                            sourceLocale,
                            targetLocale
                        }
                    });
                });
            });
            return;
        }

        const transUnitMatches = [...normalizeString(fileBody).matchAll(/<trans-unit\b([^>]*)>([\s\S]*?)<\/trans-unit>/gi)];
        transUnitMatches.forEach((unitMatch, unitIndex) => {
            const unitAttributes = parseAttributes(unitMatch[1]);
            const unitBody = unitMatch[2];
            const unitId = normalizeString(unitAttributes.id || `unit-${fileIndex + 1}-${unitIndex + 1}`).trim()
                || `unit-${fileIndex + 1}-${unitIndex + 1}`;
            const sourceTag = firstTag(unitBody, 'source');
            const targetTag = firstTag(unitBody, 'target');
            const sourceText = stripXmlTags(sourceTag?.innerXml || '');
            const targetText = stripXmlTags(targetTag?.innerXml || '');
            const noteText = collectTagContents(unitBody, 'note').join('\n');

            units.push({
                id: unitId,
                key: normalizeString(unitAttributes.resname || unitId).trim() || unitId,
                documentId,
                source: sourceText,
                sourceXml: normalizeString(sourceTag?.innerXml),
                targets: targetLocale && targetText ? { [targetLocale]: targetText } : {},
                status: resolveUnitStatus(targetText, targetTag?.attributes?.state || ''),
                context: noteText,
                notes: noteText ? [noteText] : [],
                xliffRef: {
                    version,
                    documentId,
                    fileId: normalizeString(fileAttributes.id).trim(),
                    unitId,
                    segmentId: '',
                    sourceLocale,
                    targetLocale
                }
            });
        });
    });

    return ensureLocalizationPayload({
        meta: {
            name: normalizeString(filename || 'Imported XLIFF').replace(/\.[^.]+$/, '') || 'Imported XLIFF',
            originalFilename: filename,
            xliffVersion: version
        },
        documents,
        units,
        locales: {
            source: [...sourceLocales][0] || rootSourceLocale,
            targets: [...targetLocales]
        },
        xliffState: {
            dialect: version.startsWith('2') ? 'xliff-2.x' : 'xliff-1.2',
            version,
            originalXml: xmlString
        }
    }, filename.replace(/\.[^.]+$/, ''));
}

function importXliff(xmlString = '', filename = '') {
    const domPayload = importWithDom(xmlString, filename);
    if (domPayload) {
        return domPayload;
    }
    return importWithRegex(xmlString, filename);
}

function buildImportValidation(payload = null) {
    const isValid = Boolean(payload);
    return {
        isValid,
        errors: isValid ? [] : ['No valid XLIFF 1.2 or 2.x content found.'],
        warnings: []
    };
}

function resolveExportProject(context = {}) {
    const candidates = [
        context?.project?.project,
        context?.project,
        context?.projectData,
        context?.localizationProject
    ];

    return candidates.find(candidate => candidate && typeof candidate === 'object' && !Array.isArray(candidate)) || null;
}

function resolveTargetLocale(context = {}, project = {}) {
    const explicit = normalizeString(
        context?.targetLocale
        || context?.localeCode
        || context?.languageCode
    ).trim();
    if (explicit) {
        return explicit;
    }

    return detectTargetLocales(project)[0] || '';
}

function createDomTargetElement(doc, parent, text, status) {
    const namespaceUri = parent?.namespaceURI || doc?.documentElement?.namespaceURI || null;
    const targetEl = namespaceUri
        ? doc.createElementNS(namespaceUri, 'target')
        : doc.createElement('target');
    const normalizedStatus = normalizeString(status).trim().toLowerCase();
    if (normalizedStatus === 'approved') {
        targetEl.setAttribute('state', 'final');
    } else if (normalizedStatus === 'review') {
        targetEl.setAttribute('state', 'needs-review-translation');
    } else if (normalizeString(text).trim()) {
        targetEl.setAttribute('state', 'translated');
    }
    targetEl.textContent = normalizeString(text);
    return targetEl;
}

function exportUsingDom(project = {}, targetLocale = '') {
    if (typeof DOMParser !== 'function' || typeof XMLSerializer !== 'function') {
        return '';
    }

    const originalXml = normalizeString(project?.xliffState?.originalXml).trim();
    if (!originalXml) {
        return '';
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(originalXml, 'application/xml');
    if (doc.querySelector('parsererror')) {
        return '';
    }

    const xliffEl = doc.documentElement;
    const version = normalizeString(project?.xliffState?.version || xliffEl?.getAttribute?.('version') || '1.2').trim() || '1.2';
    const sourceLocale = detectSourceLocale(project);

    if (version.startsWith('2')) {
        if (sourceLocale) xliffEl.setAttribute('srcLang', sourceLocale);
        if (targetLocale) xliffEl.setAttribute('trgLang', targetLocale);
    }

    const unitsByRef = new Map();
    (Array.isArray(project?.units) ? project.units : []).forEach(unit => {
        const ref = unit?.xliffRef || {};
        const refKey = [
            normalizeString(ref.fileId || ref.documentId).trim(),
            normalizeString(ref.unitId || unit?.id).trim(),
            normalizeString(ref.segmentId).trim()
        ].join('::');
        unitsByRef.set(refKey, unit);
    });

    const fileElements = getDirectChildElements(xliffEl, ['file']);
    fileElements.forEach((fileEl, fileIndex) => {
        const fileId = normalizeString(fileEl.getAttribute('id') || `document-${fileIndex + 1}`).trim();
        if (!version.startsWith('2')) {
            if (sourceLocale) fileEl.setAttribute('source-language', sourceLocale);
            if (targetLocale) fileEl.setAttribute('target-language', targetLocale);
        }

        if (version.startsWith('2')) {
            const unitElements = Array.from(fileEl.getElementsByTagName('unit'));
            unitElements.forEach(unitEl => {
                const unitId = normalizeString(unitEl.getAttribute('id')).trim();
                const segmentElements = getDirectChildElements(unitEl, ['segment', 'ignorable']);
                const effectiveSegments = segmentElements.length > 0 ? segmentElements : [unitEl];

                effectiveSegments.forEach((segmentEl, segmentIndex) => {
                    const segmentId = normalizeString(segmentEl.getAttribute?.('id') || '').trim();
                    const refKey = [fileId, unitId, segmentId].join('::');
                    const fallbackKey = [fileId, unitId, ''].join('::');
                    const unit = unitsByRef.get(refKey) || unitsByRef.get(fallbackKey);
                    if (!unit) return;

                    const sourceEl = getFirstDirectChild(segmentEl, ['source']) || segmentEl.getElementsByTagName('source')[0] || null;
                    if (!sourceEl) return;

                    const targetText = normalizeString(unit?.targets?.[targetLocale] || '').trim();
                    const existingTarget = getFirstDirectChild(segmentEl, ['target']) || segmentEl.getElementsByTagName('target')[0] || null;
                    if (existingTarget?.parentNode) {
                        existingTarget.parentNode.removeChild(existingTarget);
                    }
                    if (!targetText) return;

                    const targetEl = createDomTargetElement(doc, sourceEl, targetText, unit?.status);
                    sourceEl.parentNode.insertBefore(targetEl, sourceEl.nextSibling);
                    if (targetLocale) {
                        xliffEl.setAttribute('trgLang', targetLocale);
                    }
                });
            });
        } else {
            const transUnitElements = Array.from(fileEl.getElementsByTagName('trans-unit'));
            transUnitElements.forEach(unitEl => {
                const unitId = normalizeString(unitEl.getAttribute('id')).trim();
                const refKey = [fileId, unitId, ''].join('::');
                const unit = unitsByRef.get(refKey) || unitsByRef.get(['', unitId, ''].join('::'));
                if (!unit) return;

                const sourceEl = getFirstDirectChild(unitEl, ['source']) || unitEl.getElementsByTagName('source')[0] || null;
                if (!sourceEl) return;

                const targetText = normalizeString(unit?.targets?.[targetLocale] || '').trim();
                const existingTarget = getFirstDirectChild(unitEl, ['target']) || unitEl.getElementsByTagName('target')[0] || null;
                if (existingTarget?.parentNode) {
                    existingTarget.parentNode.removeChild(existingTarget);
                }
                if (!targetText) return;

                const targetEl = createDomTargetElement(doc, sourceEl, targetText, unit?.status);
                sourceEl.parentNode.insertBefore(targetEl, sourceEl.nextSibling);
            });
        }
    });

    const serializer = new XMLSerializer();
    let output = serializer.serializeToString(doc);
    if (!output.startsWith('<?xml')) {
        output = `<?xml version="1.0" encoding="UTF-8"?>\n${output}`;
    }
    return output;
}

function synthesizeXliff(project = {}, targetLocale = '') {
    const sourceLocale = detectSourceLocale(project);
    const version = normalizeString(project?.xliffState?.version || project?.meta?.xliffVersion || '1.2').trim() || '1.2';
    const documents = Array.isArray(project?.documents) && project.documents.length > 0
        ? project.documents
        : [{ id: 'document-1', name: sanitizeFilename(project?.meta?.name || 'localization-project'), original: '' }];
    const units = Array.isArray(project?.units) ? project.units : [];
    const unitsByDocument = new Map(documents.map(document => [normalizeString(document?.id).trim(), []]));

    units.forEach(unit => {
        const documentId = normalizeString(unit?.documentId).trim() || documents[0]?.id || 'document-1';
        if (!unitsByDocument.has(documentId)) {
            unitsByDocument.set(documentId, []);
        }
        unitsByDocument.get(documentId).push(unit);
    });

    if (version.startsWith('2')) {
        const fileXml = documents.map((document, index) => {
            const documentId = normalizeString(document?.id || `document-${index + 1}`).trim() || `document-${index + 1}`;
            const documentName = normalizeString(document?.original || document?.name || documentId).trim() || documentId;
            const documentUnits = unitsByDocument.get(documentId) || [];
            const unitXml = documentUnits.map((unit, unitIndex) => {
                const unitId = normalizeString(unit?.id || `unit-${unitIndex + 1}`).trim() || `unit-${unitIndex + 1}`;
                const targetText = normalizeString(unit?.targets?.[targetLocale] || '').trim();
                const noteText = normalizeString(unit?.context || '').trim();
                const notesXml = noteText ? `<notes><note>${escapeXml(noteText)}</note></notes>` : '';
                const targetXml = targetText ? `<target>${escapeXml(targetText)}</target>` : '';
                return `    <unit id="${escapeXml(unitId)}" name="${escapeXml(normalizeString(unit?.key || unitId).trim() || unitId)}">\n${notesXml ? `      ${notesXml}\n` : ''}      <segment id="1">\n        <source>${escapeXml(normalizeString(unit?.source).trim())}</source>\n${targetXml ? `        ${targetXml}\n` : ''}      </segment>\n    </unit>`;
            }).join('\n');

            return `  <file id="${escapeXml(documentId)}" original="${escapeXml(documentName)}">\n${unitXml}\n  </file>`;
        }).join('\n');

        return [
            '<?xml version="1.0" encoding="UTF-8"?>',
            `<xliff version="2.1" srcLang="${escapeXml(sourceLocale)}"${targetLocale ? ` trgLang="${escapeXml(targetLocale)}"` : ''}>`,
            fileXml,
            '</xliff>'
        ].join('\n');
    }

    const fileXml = documents.map((document, index) => {
        const documentId = normalizeString(document?.id || `document-${index + 1}`).trim() || `document-${index + 1}`;
        const documentName = normalizeString(document?.original || document?.name || documentId).trim() || documentId;
        const documentUnits = unitsByDocument.get(documentId) || [];
        const transUnitsXml = documentUnits.map((unit, unitIndex) => {
            const unitId = normalizeString(unit?.id || `unit-${unitIndex + 1}`).trim() || `unit-${unitIndex + 1}`;
            const targetText = normalizeString(unit?.targets?.[targetLocale] || '').trim();
            const noteText = normalizeString(unit?.context || '').trim();
            const status = normalizeString(unit?.status).trim().toLowerCase();
            const stateAttribute = status === 'approved'
                ? ' state="final"'
                : status === 'review'
                    ? ' state="needs-review-translation"'
                    : targetText
                        ? ' state="translated"'
                        : '';
            return [
                `      <trans-unit id="${escapeXml(unitId)}" resname="${escapeXml(normalizeString(unit?.key || unitId).trim() || unitId)}">`,
                `        <source>${escapeXml(normalizeString(unit?.source).trim())}</source>`,
                targetText ? `        <target${stateAttribute}>${escapeXml(targetText)}</target>` : '',
                noteText ? `        <note>${escapeXml(noteText)}</note>` : '',
                '      </trans-unit>'
            ].filter(Boolean).join('\n');
        }).join('\n');

        return [
            `  <file id="${escapeXml(documentId)}" original="${escapeXml(documentName)}"${sourceLocale ? ` source-language="${escapeXml(sourceLocale)}"` : ''}${targetLocale ? ` target-language="${escapeXml(targetLocale)}"` : ''}>`,
            '    <body>',
            transUnitsXml,
            '    </body>',
            '  </file>'
        ].join('\n');
    }).join('\n');

    return [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<xliff version="1.2">',
        fileXml,
        '</xliff>'
    ].join('\n');
}

function exportXliff(project = {}, targetLocale = '') {
    const domOutput = exportUsingDom(project, targetLocale);
    if (domOutput) {
        return domOutput;
    }
    return synthesizeXliff(project, targetLocale);
}

function buildExportFilename(project = {}, targetLocale = '') {
    const originalFilename = normalizeString(project?.meta?.originalFilename).trim();
    if (originalFilename) {
        return originalFilename.replace(/\.(xliff|xlf|xml)$/i, '.xlf');
    }

    const projectName = sanitizeFilename(project?.meta?.name || 'localization-project');
    return targetLocale
        ? `${projectName}_${sanitizeFilename(targetLocale, targetLocale)}.xlf`
        : `${projectName}.xlf`;
}

function handleImport(request = {}) {
    const artifact = Array.isArray(request?.input_artifacts) ? request.input_artifacts[0] : null;
    const data = artifact?.data || {};
    const content = normalizeString(data.content);
    const filename = normalizeString(data.filename || 'localization.xlf').trim() || 'localization.xlf';

    const payload = importXliff(content, filename);
    return buildImportArtifact(payload, buildImportValidation(payload));
}

function handleExport(request = {}) {
    const artifact = Array.isArray(request?.input_artifacts) ? request.input_artifacts[0] : null;
    const context = artifact?.data || {};
    const project = resolveExportProject(context);
    if (!project) {
        return buildExportArtifact({
            error: 'XLIFF export requires a localization project payload.'
        });
    }

    const targetLocale = resolveTargetLocale(context, project);
    if (!targetLocale) {
        return buildExportArtifact({
            error: 'XLIFF export requires a target locale.'
        });
    }

    const content = exportXliff(project, targetLocale);
    return buildExportArtifact({
        content,
        mimeType: MIME_TYPE,
        filename: buildExportFilename(project, targetLocale),
        successMessage: `Exported XLIFF for ${targetLocale}`
    });
}

export async function run(request = {}) {
    const firstArtifact = Array.isArray(request?.input_artifacts) ? request.input_artifacts[0] : null;
    const artifactType = normalizeString(firstArtifact?.artifactType).trim();

    if (artifactType === 'RawFileArtifact') {
        return handleImport(request);
    }

    if (artifactType === 'FormatExportArtifact') {
        return handleExport(request);
    }

    return {
        ok: false,
        output_artifacts: [],
        diagnostics: [
            {
                severity: 'error',
                code: 'UNSUPPORTED_INPUT_ARTIFACT',
                message: `XLIFF format plugin requires RawFileArtifact or FormatExportArtifact input, received "${artifactType || 'none'}".`
            }
        ]
    };
}
