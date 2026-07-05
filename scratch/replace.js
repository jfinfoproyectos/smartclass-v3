const fs = require('fs');
const filePath = 'c:/Users/jhonf/Desktop/Info/2026/Proyectos/Completos/smartclassv2/src/features/teacher/components/QuestionManager.tsx';
let content = fs.readFileSync(filePath, 'utf8');
const search = 'options={{ minimap: { enabled: false }, fontSize: 13, wordWrap: "on" }}';
const replace = 'options={{ minimap: { enabled: false }, fontSize: 13, wordWrap: "on", scrollBeyondLastLine: false, stickyScroll: { enabled: false } }}';

if (content.includes(search)) {
    content = content.replace(search, replace);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Successfully replaced!');
} else {
    console.log('Search string not found in the file!');
}
