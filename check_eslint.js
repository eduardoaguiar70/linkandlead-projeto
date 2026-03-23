import fs from 'fs';

try {
    const data = JSON.parse(fs.readFileSync('eslint.json', 'utf8'));
    let hasIssues = false;
    for (const file of data) {
        const undefs = file.messages.filter(msg => msg.ruleId === 'no-undef');
        if (undefs.length > 0) {
            hasIssues = true;
            console.log(`\nFile: ${file.filePath}`);
            undefs.forEach(u => console.log(`  Line ${u.line}: '${u.message}'`));
        }
    }
    if (!hasIssues) {
        console.log('No "no-undef" errors found.');
    }
} catch (e) {
    console.error('Failed to parse eslint.json:', e);
}
