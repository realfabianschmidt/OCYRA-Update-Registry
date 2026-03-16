'use strict';

window.FileFormatRegistry?.registerFormatHandler({
    id: 'webvtt',
    name: 'Export VTT',
    description: 'WebVTT subtitle file with timing and metadata',
    target: 'subtitle',
    directions: ['import', 'export'],
    extensions: ['vtt'],
    icon: 'page',
    export_order: 10,
    quality_gate: 'timed-subtitle',

    parseImportFile({ content, helpers }) {
        const value = String(content || '');
        if (!value.trimStart().startsWith('WEBVTT')) {
            return {
                type: 'subtitle-track',
                subtitles: []
            };
        }

        const lines = value.split('\n');
        const subtitles = [];
        let currentSubtitle = null;
        let lineIndex = 0;

        while (lineIndex < lines.length && !lines[lineIndex].startsWith('WEBVTT')) {
            lineIndex += 1;
        }
        lineIndex += 1;

        while (lineIndex < lines.length) {
            const line = lines[lineIndex].trim();
            if (!line || line.startsWith('NOTE')) {
                lineIndex += 1;
                continue;
            }

            if (line.includes('-->')) {
                const timingParts = line.split('-->');
                if (timingParts.length === 2) {
                    const startTime = this._parseTimestamp(timingParts[0].trim());
                    const endTime = this._parseTimestamp(timingParts[1].trim());
                    currentSubtitle = {
                        id: window.VTTUtils?.generateId?.() || `subtitle-${subtitles.length + 1}`,
                        startTime,
                        endTime,
                        text: ''
                    };
                }
            } else if (currentSubtitle) {
                currentSubtitle.text = currentSubtitle.text
                    ? `${currentSubtitle.text}\n${line}`
                    : line;
                if (lineIndex + 1 >= lines.length || !lines[lineIndex + 1].trim()) {
                    if (currentSubtitle.text.trim()) {
                        subtitles.push(currentSubtitle);
                    }
                    currentSubtitle = null;
                }
            }

            lineIndex += 1;
        }

        return {
            type: 'subtitle-track',
            subtitles: helpers.sortSubtitles(subtitles)
        };
    },

    validateImportPayload({ payload }) {
        const subtitles = Array.isArray(payload?.subtitles) ? payload.subtitles : [];
        const errors = [];
        const warnings = [];

        if (subtitles.length === 0) {
            errors.push('No valid subtitles found in the WebVTT file.');
        }

        for (let index = 0; index < subtitles.length - 1; index += 1) {
            const current = subtitles[index];
            const next = subtitles[index + 1];
            if (current.endTime > next.startTime) {
                warnings.push(`Subtitle ${index + 1} overlaps with subtitle ${index + 2}.`);
            }
        }

        subtitles.forEach((subtitle, index) => {
            const duration = subtitle.endTime - subtitle.startTime;
            if (duration < 0.5) {
                warnings.push(`Subtitle ${index + 1} is very short (${duration.toFixed(1)}s).`);
            }
            if (duration > 10) {
                warnings.push(`Subtitle ${index + 1} is very long (${duration.toFixed(1)}s).`);
            }
        });

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    },

    serializeExport({ subtitles, languageCode, languageData, projectName, helpers }) {
        const sortedSubtitles = helpers.sortSubtitles(subtitles);
        if (sortedSubtitles.length === 0) {
            return null;
        }

        const now = new Date();
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const formattedDate = now.toISOString().replace('T', ' ').substring(0, 19);

        let content = 'WEBVTT\n\n';
        content += 'NOTE\n';
        content += 'Exported by: XYRA Captions\n';
        content += `Date: ${formattedDate} (${timezone})\n`;
        if (languageData?.name) {
            content += `Language: ${languageData.name} (${languageCode})\n`;
        }
        content += '\n';

        sortedSubtitles.forEach((subtitle, index) => {
            const text = helpers.getSubtitleText(subtitle, languageCode);
            content += `${index + 1}\n`;
            content += `${helpers.formatVTTTime(subtitle.startTime)} --> ${helpers.formatVTTTime(subtitle.endTime)}\n`;
            content += `${window.VTTUtils?.sanitizeVTTText?.(text) || text}\n\n`;
        });

        return {
            content,
            mimeType: 'text/vtt',
            filename: helpers.buildLanguageFilename(projectName, languageCode, 'vtt'),
            successMessage: `${languageData?.name || languageCode} subtitles exported as VTT`
        };
    },

    _parseTimestamp(timeString) {
        const parts = String(timeString || '').split(':');
        if (parts.length !== 3) return 0;

        const hours = parseInt(parts[0], 10) || 0;
        const minutes = parseInt(parts[1], 10) || 0;
        const secondParts = parts[2].split('.');
        const seconds = parseInt(secondParts[0], 10) || 0;
        const milliseconds = parseInt(secondParts[1], 10) || 0;

        return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
    }
});
