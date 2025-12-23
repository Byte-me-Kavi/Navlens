const fs = require('fs');
const content = fs.readFileSync('lint_report.json', 'utf16le');
const report = JSON.parse(content.charCodeAt(0) === 0xFEFF ? content.slice(1) : content);

const unescapedErrors = [];

report.forEach(fileResult => {
    const errors = fileResult.messages.filter(msg => msg.ruleId === 'react/no-unescaped-entities');
    if (errors.length > 0) {
        unescapedErrors.push({
            filePath: fileResult.filePath,
            errors: errors.map(e => ({
                line: e.line,
                message: e.message
            }))
        });
    }
});

fs.writeFileSync('unescaped_errors.json', JSON.stringify(unescapedErrors, null, 2));
