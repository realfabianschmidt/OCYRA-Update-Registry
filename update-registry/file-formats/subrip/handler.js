'use strict';

window.FileFormatRegistry?.registerFormatHandler({
    id: 'subrip',
    name: 'Export SRT',
    description: 'SubRip format for YouTube, Vimeo and general subtitle workflows',
    target: 'subtitle',
    directions: ['import', 'export'],
    extensions: ['srt'],
    icon: 'page-edit',
    export_order: 30,
    quality_gate: 'timed-subtitle',

    parseImportFile({ content }) {
        const blocks = String(content || '')
            .replace(/\r\n/g, '\n')
            .trim()
            .split(/\n\s*\n/g);

        const subtitles = [];
        blocks.forEach((block, index) => {
            const lines = block.split('\n').map(line => line.trimEnd());
            if (lines.length < 2) return;

            const timingLineIndex = lines[0].includes('-->') ? 0 : 1;
            const timingLine = lines[timingLineIndex];
            if (!timingLine || !timingLine.includes('-->')) return;

            const timingParts = timingLine.split('-->');
            if (timingParts.length !== 2) return;

            const startTime = this._parseTimestamp(timingParts[0].trim());
            const endTime = this._parseTimestamp(timingParts[1].trim());
            const textLines = lines.slice(timingLineIndex + 1).filter(Boolean);
            const text = textLines.join('\n').trim();
            if (!text) return;

            subtitles.push({
                id: window.VTTUtils?.generateId?.() || `srt-${index + 1}`,
                startTime,
                endTime,
                text
            });
        });

        return {
            type: 'subtitle-track',
            subtitles: (window.FileFormatHelpers?.sortSubtitles?.(subtitles) || subtitles)
        };
    },

    validateImportPayload({ payload }) {
        const subtitles = Array.isArray(payload?.subtitles) ? payload.subtitles : [];
        return {
            isValid: subtitles.length > 0,
            errors: subtitles.length > 0 ? [] : ['No valid subtitles found in the SRT file.'],
            warnings: []
        };
    },

    serializeExport({ subtitles, languageCode, languageData, projectName, helpers }) {
        const sortedSubtitles = helpers.sortSubtitles(subtitles);
        if (sortedSubtitles.length === 0) {
            return null;
        }

        let content = '';
        sortedSubtitles.forEach((subtitle, index) => {
            const text = helpers.getSubtitleText(subtitle, languageCode).trim();
            content += `${index + 1}\n`;
            content += `${helpers.formatSRTTime(subtitle.startTime)} --> ${helpers.formatSRTTime(subtitle.endTime)}\n`;
            content += `${text}\n\n`;
        });

        return {
            content,
            mimeType: 'text/plain',
            filename: helpers.buildLanguageFilename(projectName, languageCode, 'srt'),
            successMessage: `${languageData?.name || languageCode} subtitles exported as SRT`
        };
    },

    _parseTimestamp(timeString) {
        const parts = String(timeString || '').split(':');
        if (parts.length !== 3) return 0;

        const hours = parseInt(parts[0], 10) || 0;
        const minutes = parseInt(parts[1], 10) || 0;
        const secondParts = parts[2].split(',');
        const seconds = parseInt(secondParts[0], 10) || 0;
        const milliseconds = parseInt(secondParts[1], 10) || 0;

        return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
    }
});
