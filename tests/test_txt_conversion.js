// 测试 Markdown 到纯文本的转换功能
function markdownToText(markdown) {
    if (!markdown) return '';
    
    let text = markdown;
    
    // 移除代码块
    text = text.replace(/```[\s\S]*?```/g, '');
    
    // 移除行内代码
    text = text.replace(/`([^`]+)`/g, '$1');
    
    // 移除链接，保留文本
    text = text.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
    
    // 移除图片
    text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, '');
    
    // 移除粗体和斜体标记
    text = text.replace(/\*\*([^*]+)\*\*/g, '$1');
    text = text.replace(/\*([^*]+)\*/g, '$1');
    text = text.replace(/__([^_]+)__/g, '$1');
    text = text.replace(/_([^_]+)_/g, '$1');
    
    // 移除删除线
    text = text.replace(/~~([^~]+)~~/g, '$1');
    
    // 移除引用标记
    text = text.replace(/^>\s*/gm, '');
    
    // 移除列表标记
    text = text.replace(/^[\s]*[-*+]\s+/gm, '');
    text = text.replace(/^[\s]*\d+\.\s+/gm, '');
    
    // 移除标题标记，保留文本
    text = text.replace(/^#{1,6}\s+(.+)$/gm, '$1');
    
    // 移除水平分割线
    text = text.replace(/^[-*_]{3,}$/gm, '');
    
    // 移除表格标记
    text = text.replace(/\|/g, ' ');
    text = text.replace(/^[\s]*[-|]+\s*$/gm, '');
    
    // 清理多余的空行
    text = text.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    // 清理行首行尾空白
    text = text.trim();
    
    // 最后再次清理列表标记（确保所有格式都被处理）
    text = text.replace(/^[\s]*[-*+]\s+/gm, '');
    text = text.replace(/^[\s]*\d+\.\s+/gm, '');
    
    return text;
}

// 测试用例
const testMarkdown = `# 配置 | X-EMR

## 基础配置

这是一个**粗体文本**和*斜体文本*的示例。

### 代码示例

\`\`\`javascript
let option = {
    license: 'xxxxxxxxxxxx',
    container:'#editor'
}
\`\`\`

### 列表示例

- 第一项
- 第二项
- 第三项

### 链接示例

[点击这里](https://example.com) 访问网站。

### 引用示例

> 这是一个引用块

### 表格示例

| 列1 | 列2 |
|-----|-----|
| 数据1 | 数据2 |

---

这是分割线后的内容。`;

console.log('原始 Markdown:');
console.log(testMarkdown);
console.log('\n' + '='.repeat(50) + '\n');

const convertedText = markdownToText(testMarkdown);
console.log('转换后的纯文本:');
console.log(convertedText);

// 验证转换效果
console.log('\n' + '='.repeat(50) + '\n');
console.log('验证结果:');
console.log('1. 代码块已移除:', !convertedText.includes('```'));
console.log('2. 粗体标记已移除:', !convertedText.includes('**'));
console.log('3. 斜体标记已移除:', !convertedText.includes('*'));
console.log('4. 链接格式已清理:', !convertedText.includes('['));
console.log('5. 标题标记已移除:', !convertedText.includes('#'));
console.log('6. 列表标记已移除:', !convertedText.includes('- '));
console.log('7. 引用标记已移除:', !convertedText.includes('>'));
console.log('8. 表格标记已清理:', !convertedText.includes('|')); 