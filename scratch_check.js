const fs = require('fs');
const file = 'd:/PROJECTS/civicshield/lib/ai/gemini.ts';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');
lines.forEach((line, i) => {
  if (line.includes('\\`')) console.log(`${i+1}: ${line}`);
});
