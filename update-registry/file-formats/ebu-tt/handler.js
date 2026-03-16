'use strict';

window.FileFormatRegistry?.registerFormatHandler({
    id: 'ebu-tt',
    name: 'Export EBU-TT',
    description: 'European Broadcasting Union XML subtitle format',
    target: 'subtitle',
    directions: ['export'],
    extensions: ['xml'],
    icon: 'tv',
    export_order: 50,
    quality_gate: 'timed-subtitle',

    serializeExport({ subtitles, languageCode, projectName, helpers }) {
        const sortedSubtitles = helpers.sortSubtitles(subtitles);
        if (sortedSubtitles.length === 0) {
            return null;
        }

        const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
        let content = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        content += `<tt xml:lang="${languageCode}"\n`;
        content += `    xmlns="http://www.w3.org/ns/ttml"\n`;
        content += `    xmlns:ttp="http://www.w3.org/ns/ttml#parameter"\n`;
        content += `    xmlns:tts="http://www.w3.org/ns/ttml#styling"\n`;
        content += `    xmlns:ttm="http://www.w3.org/ns/ttml#metadata"\n`;
        content += `    xmlns:ebuttm="urn:ebu:tt:metadata"\n`;
        content += `    ttp:timeBase="media"\n`;
        content += `    ttp:frameRate="25"\n`;
        content += `    ttp:frameRateMultiplier="1 1"\n`;
        content += `    ttp:dropMode="nonDrop">\n`;
        content += `  <head>\n`;
        content += `    <metadata>\n`;
        content += `      <ttm:title>${helpers.escapeXML(projectName)}</ttm:title>\n`;
        content += `      <ebuttm:documentMetadata>\n`;
        content += `        <ebuttm:conformsToStandard>urn:ebu:tt:distribution:2018-04</ebuttm:conformsToStandard>\n`;
        content += `        <ebuttm:authoredFrameRate>25</ebuttm:authoredFrameRate>\n`;
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

        sortedSubtitles.forEach((subtitle, index) => {
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
});
