const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.tsx')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk('d:\\Wellness_backend\\admin-portal\\app\\dashboard');

let modifiedCount = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // 1. Replace background color + hover with gradient
    content = content.replace(/bg-\[#6A8BFF\]\s+hover:bg-\[#(?:5a7ae6|5a7aff)\]/g, "bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] hover:from-[#7A90FF] hover:to-[#4466FC]");
    
    // 2. Also replace buttons that only had bg-[#6A8BFF] and a shadow, but no hover
    // Actually, most primary buttons have the hover class. Let's do a wider pass for bg-[#6A8BFF] if it has text-white and shadow
    // But the first regex covers most cases. Let's see if there are any left that are primary buttons.
    content = content.replace(/bg-\[#6A8BFF\]\s+text-white\s+shadow-md\s+shadow-blue-\d{3}\/\d{2}/g, "bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] hover:from-[#7A90FF] hover:to-[#4466FC] text-white shadow-[0_4px_10px_rgba(84,118,252,0.2)]");

    // 3. Replace shadows specifically
    content = content.replace(/shadow-md\s+shadow-blue-\d{3}\/\d{2}/g, "shadow-[0_4px_10px_rgba(84,118,252,0.2)]");
    
    // 4. Update the border radius ONLY for elements that have the gradient (to avoid modifying non-button pills)
    const classRegex = /className=(?:"([^"]*bg-gradient-to-b from-\[#8AA0FF\][^"]*)"|\{`([^`]*bg-gradient-to-b from-\[#8AA0FF\][^`]*)`\})/g;
    
    content = content.replace(classRegex, (match, p1, p2) => {
        let classStr = p1 || p2;
        // replace rounded shapes
        classStr = classStr.replace(/\brounded-full\b/g, "rounded-xl");
        classStr = classStr.replace(/\brounded-\[1rem\]\b/g, "rounded-xl");
        classStr = classStr.replace(/\brounded-2xl\b/g, "rounded-xl");
        
        if (p1) return `className="${classStr}"`;
        return `className={\`${classStr}\`}`;
    });

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        modifiedCount++;
        console.log(`Updated ${file}`);
    }
});

console.log(`Modified ${modifiedCount} files.`);
