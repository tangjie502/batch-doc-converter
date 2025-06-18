// 测试 Markdown 清理函数
function cleanMarkdownContent(markdown) {
  if (!markdown) return '';
  
  let cleaned = markdown;
  
  // 1. 移除重复的标题
  const lines = cleaned.split('\n');
  const processedLines = [];
  let lastTitle = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const titleMatch = line.match(/^(#{1,6})\s+(.+)$/);
    
    if (titleMatch) {
      const titleText = titleMatch[2].trim();
      if (titleText !== lastTitle) {
        processedLines.push(line);
        lastTitle = titleText;
      }
      // 跳过重复的标题
    } else {
      processedLines.push(line);
    }
  }
  
  cleaned = processedLines.join('\n');
  
  // 2. 清理锚点链接格式
  cleaned = cleaned.replace(/\[([^\]]+)\]\(#[^)]*\)/g, '$1');
  
  // 3. 清理空的代码块
  cleaned = cleaned.replace(/```\s*\n\s*```/g, '');
  
  // 4. 修复代码块语言标识
  cleaned = cleaned.replace(/```(\w+)?\n/g, (match, lang) => {
    if (!lang) {
      return '```text\n';
    }
    const validLanguages = ['javascript', 'js', 'html', 'css', 'json', 'xml', 'yaml', 'yml', 'markdown', 'md', 'text', 'plaintext'];
    if (validLanguages.includes(lang.toLowerCase())) {
      return match;
    } else {
      return '```text\n';
    }
  });
  
  // 5. 清理多余的空行
  cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n');
  
  // 6. 清理行首行尾空白
  cleaned = cleaned.trim();
  
  // 7. 确保文件以换行符结尾
  if (!cleaned.endsWith('\n')) {
    cleaned += '\n';
  }
  
  return cleaned;
}

// 测试用例
const testMarkdown = `# 配置 | X-EMR

# 配置

大约 7 分钟

---

### [#](#更新记录) 更新记录

-   Ver1.0-20250207 增加了 \`fieldFocusBorderColor\`, 支持用户自定义活动输入域边框色。

\`\`\`
let option = {
     license: 'xxxxxxxxxxxx', //授权码
     container:'#editor',     //编辑器容器对象ID
}
\`\`\`

[编辑此页](http://www.gitee.com/bensenplus/edit/main/../../x-emrdoc/edit/master/doc/developer/option.md)`;

console.log('原始 Markdown:');
console.log(testMarkdown);
console.log('\n' + '='.repeat(50) + '\n');

const cleaned = cleanMarkdownContent(testMarkdown);
console.log('清理后的 Markdown:');
console.log(cleaned);

// 验证清理效果
console.log('\n' + '='.repeat(50) + '\n');
console.log('验证结果:');
console.log('1. 重复标题已移除:', !cleaned.includes('# 配置\n# 配置'));
console.log('2. 锚点链接已清理:', !cleaned.includes('[#](#更新记录)'));
console.log('3. 代码块格式正确:', cleaned.includes('```javascript'));
console.log('4. 文件以换行符结尾:', cleaned.endsWith('\n')); 