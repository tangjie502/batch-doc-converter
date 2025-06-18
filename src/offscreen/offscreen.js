// offscreen.js - 带有超详细日志的调试版本

if (typeof TurndownService !== 'undefined' && typeof turndownPluginGfm !== 'undefined') {
  
  const turndownService = new TurndownService({ 
    headingStyle: 'atx', 
    hr: '---', 
    bulletListMarker: '-', 
    codeBlockStyle: 'fenced', 
    linkStyle: 'inlined',
    emDelimiter: '*',
    strongDelimiter: '**',
    codeDelimiter: '`'
  });
  
  turndownService.use(turndownPluginGfm.gfm);
  
  // 移除不需要的元素
  turndownService.remove(['script', 'style', 'link', 'meta', 'iframe', 'frame', 'nav', 'aside', 'form', 'button', 'input', 'textarea', 'select', 'option']);
  
  // 自定义规则：清理锚点链接
  turndownService.addRule('cleanAnchorLinks', {
    filter: function (node) {
      return node.nodeName === 'A' && node.getAttribute('href') && node.getAttribute('href').startsWith('#');
    },
    replacement: function (content) {
      return content;
    }
  });
  
  // 自定义规则：清理空标题
  turndownService.addRule('cleanEmptyHeaders', {
    filter: function (node) {
      return node.nodeName.match(/^H[1-6]$/) && (!node.textContent || node.textContent.trim() === '');
    },
    replacement: function () {
      return '';
    }
  });
  
  // 自定义规则：修复代码块
  turndownService.addRule('fixCodeBlocks', {
    filter: function (node) {
      return node.nodeName === 'PRE' && node.firstChild && node.firstChild.nodeName === 'CODE';
    },
    replacement: function (content, node) {
      const code = node.firstChild;
      const className = code.getAttribute('class') || '';
      const language = className.replace('language-', '') || 'text';
      return '\n```' + language + '\n' + code.textContent + '\n```\n';
    }
  });

  chrome.runtime.onMessage.addListener(handleMessages);

  function handleMessages(message) {
    if (message.target !== 'offscreen' || message.type !== 'process-raw-html') {
      return;
    }
    
    console.log(`[Offscreen] 开始处理URL: ${message.url}`);
    console.log(`[Offscreen] Content-Type: ${message.contentType}`);
    
    const uint8Array = new Uint8Array(message.arrayBuffer);
    const arrayBuffer = uint8Array.buffer;
    const htmlText = smartDecode(arrayBuffer, message.contentType);

    if (!htmlText || htmlText.trim() === '') {
      console.error(`[Offscreen] 解码失败或解码后内容为空 for URL: ${message.url}`);
      chrome.runtime.sendMessage({
        type: 'process-result',
        title: `解码失败: ${message.url}`,
        markdown: `无法识别该网页的字符编码或获取到的内容为空。

**调试信息：**
- Content-Type: ${message.contentType}
- 数据大小: ${arrayBuffer.byteLength} bytes
- URL: ${message.url}

**可能的原因：**
1. 网站使用了不常见的字符编码
2. 网站返回了空内容或错误页面
3. 网站有反爬虫机制
4. 需要登录才能访问
5. 网络连接问题

**建议：**
- 尝试在浏览器中直接访问该链接
- 检查网站是否需要特殊的请求头
- 确认网站是否支持直接访问`
      });
      return;
    }

    console.log(`[Offscreen] 解码成功，HTML长度: ${htmlText.length} 字符`);
    console.log(`[Offscreen] HTML前200字符: ${htmlText.substring(0, 200)}...`);
    
    try {
      const doc = new DOMParser().parseFromString(htmlText, 'text/html');
      const title = doc.querySelector('title')?.textContent || message.url;
      
      console.log(`[Offscreen] 解析DOM成功，标题: ${title}`);
      
      // 移除不需要的元素
      doc.querySelectorAll('script, style, link, meta, noscript').forEach(el => el.remove());
      
      // 增强的内容抓取策略
      const contentNode = extractEnhancedContent(doc);
      
      const markdownContent = turndownService.turndown(contentNode);
      
      console.log(`[Offscreen] 转换为Markdown成功，长度: ${markdownContent.length} 字符`);
      
      // 后处理：清理Markdown格式问题
      const cleanedMarkdown = cleanMarkdownContent(markdownContent);
      
      chrome.runtime.sendMessage({
        type: 'process-result',
        title: title,
        markdown: cleanedMarkdown
      });
    } catch (error) {
      console.error(`[Offscreen] DOM解析或转换失败:`, error);
      chrome.runtime.sendMessage({
        type: 'process-result',
        title: `处理失败: ${message.url}`,
        markdown: `HTML解析或转换失败。

**错误信息：** ${error.message}

**原始HTML长度：** ${htmlText.length} 字符

**HTML预览：**
\`\`\`html
${htmlText.substring(0, 1000)}...
\`\`\``
      });
    }
  }

  // 新增：增强的内容提取函数
  function extractEnhancedContent(doc) {
    // 1. 尝试找到主要内容区域
    const mainSelectors = [
      'article', 'main', '[role="main"]', 
      '.content', '.post-content', '.article-content',
      '.main-content', '.page-content', '.entry-content',
      '#content', '#main', '#article'
    ];
    
    let mainContent = null;
    for (const selector of mainSelectors) {
      mainContent = doc.querySelector(selector);
      if (mainContent) break;
    }
    
    // 如果没有找到主要内容区域，使用 body
    if (!mainContent) {
      mainContent = doc.body;
    }
    
    // 2. 展开所有折叠内容
    expandCollapsedContent(mainContent);
    
    // 3. 处理懒加载内容
    processLazyLoadedContent(mainContent);
    
    // 4. 移除干扰元素
    removeNoiseElements(mainContent);
    
    return mainContent;
  }

  // 新增：展开折叠内容
  function expandCollapsedContent(container) {
    // 查找常见的折叠面板元素
    const collapsibleSelectors = [
      '.collapse', '.collapsed', '.accordion-item',
      '[data-toggle="collapse"]', '[aria-expanded="false"]',
      '.hidden', '.collapsible', '.expandable',
      '.spoiler', '.details', 'details'
    ];
    
    collapsibleSelectors.forEach(selector => {
      const elements = container.querySelectorAll(selector);
      elements.forEach(el => {
        // 移除折叠相关的类
        el.classList.remove('collapse', 'collapsed', 'hidden');
        
        // 设置展开状态
        el.setAttribute('aria-expanded', 'true');
        el.style.display = '';
        el.style.visibility = 'visible';
        el.style.opacity = '1';
        el.style.height = 'auto';
        el.style.overflow = 'visible';
        
        // 处理 details 元素
        if (el.tagName.toLowerCase() === 'details') {
          el.setAttribute('open', '');
        }
      });
    });
    
    // 查找并展开被隐藏的子元素
    const hiddenElements = container.querySelectorAll('[style*="display: none"], [style*="visibility: hidden"]');
    hiddenElements.forEach(el => {
      el.style.display = '';
      el.style.visibility = 'visible';
    });
  }

  // 新增：处理懒加载内容
  function processLazyLoadedContent(container) {
    // 处理懒加载图片
    const lazyImages = container.querySelectorAll('img[data-src], img[data-lazy], img[loading="lazy"]');
    lazyImages.forEach(img => {
      const src = img.getAttribute('data-src') || img.getAttribute('data-lazy') || img.src;
      if (src) {
        img.src = src;
        img.removeAttribute('loading');
      }
    });
    
    // 处理懒加载文本（通常通过 data 属性存储）
    const lazyTextElements = container.querySelectorAll('[data-content], [data-text]');
    lazyTextElements.forEach(el => {
      const content = el.getAttribute('data-content') || el.getAttribute('data-text');
      if (content && !el.textContent.trim()) {
        el.textContent = content;
      }
    });
  }

  // 新增：移除干扰元素
  function removeNoiseElements(container) {
    const noiseSelectors = [
      '.advertisement', '.ads', '.ad',
      '.sidebar', '.widget', '.related-posts',
      '.comments', '.comment-section',
      '.navigation', '.nav', '.menu',
      '.footer', '.header', '.toolbar',
      '.social-share', '.share-buttons',
      '.breadcrumb', '.pagination',
      '.recommendations', '.suggestions'
    ];
    
    noiseSelectors.forEach(selector => {
      const elements = container.querySelectorAll(selector);
      elements.forEach(el => el.remove());
    });
  }
}

function smartDecode(buffer, contentType) {
  console.log(`[解码流程开始] 初始Content-Type: '${contentType}', buffer大小: ${buffer.byteLength}`);

  if (buffer.byteLength < 50) {
      console.warn('[解码警告] 获取到的文件内容非常小，可能是一个空页面或错误页面。');
  }

  // 0. 检查BOM标记
  const bomCheck = checkBOM(buffer);
  if (bomCheck) {
    console.log(`步骤0: 检测到BOM标记 [${bomCheck.encoding}]，使用该编码解码...`);
    try {
      const decoder = new TextDecoder(bomCheck.encoding);
      return decoder.decode(buffer.slice(bomCheck.offset));
    } catch (e) {
      console.error(`步骤0失败: BOM编码 [${bomCheck.encoding}] 解码出错。`, e);
    }
  }

  // 1. 尝试从Content-Type头中提取charset
  let charset = contentType.match(/charset=([^;]+)/i)?.[1];
  
  if (charset) {
    try {
      const lowerCharset = charset.toLowerCase();
      if (lowerCharset === 'gb2312') charset = 'gbk';
      console.log(`步骤1: 尝试用响应头中的charset [${charset}] 解码 (非严格模式)...`);
      const decoder = new TextDecoder(charset); 
      const decodedText = decoder.decode(buffer);
      console.log(`步骤1: 使用 [${charset}] 解码成功!`);
      return decodedText;
    } catch (e) {
      console.error(`步骤1失败: 用charset [${charset}] 解码时出错。`, e);
    }
  }

  // 2. 尝试用UTF-8解码并检查meta标签
  try {
    console.log('步骤2: 尝试用 UTF-8 解码 (非严格模式)...');
    const utf8Decoder = new TextDecoder('utf-8');
    const potentialHtml = utf8Decoder.decode(buffer);
    console.log('步骤2: UTF-8 解码初步成功。');

    // 检查多种meta标签格式
    const metaCharset = potentialHtml.match(/<meta\s+.*?charset\s*=\s*['"]?([^"';\s]+)/i)?.[1] ||
                       potentialHtml.match(/<meta\s+.*?content\s*=\s*['"][^'"]*charset\s*=\s*([^"';\s]+)/i)?.[1];
    
    if (metaCharset && metaCharset.toLowerCase() !== 'utf-8') {
      console.log(`步骤2.1: 在meta标签中发现新charset [${metaCharset}]，将用它重新解码...`);
      try {
        const finalDecoder = new TextDecoder(metaCharset.toLowerCase());
        return finalDecoder.decode(buffer);
      } catch (e) {
        console.error(`步骤2.1失败: 用meta charset [${metaCharset}] 重新解码出错。将回退到UTF-8的结果。`, e);
        return potentialHtml;
      }
    }
    return potentialHtml;
  } catch (e) {
    console.error('步骤2失败: 用UTF-8解码时出错。', e);
  }

  // 3. 尝试常见的中文编码
  const chineseEncodings = ['gbk', 'gb2312', 'big5', 'gb18030'];
  for (const encoding of chineseEncodings) {
    try {
      console.log(`步骤3: 尝试用 ${encoding.toUpperCase()} 解码...`);
      const decoder = new TextDecoder(encoding);
      const decodedText = decoder.decode(buffer);
      console.log(`步骤3: 使用 [${encoding}] 解码成功!`);
      return decodedText;
    } catch (e) {
      console.error(`步骤3失败: ${encoding}解码出错。`, e);
    }
  }

  // 4. 尝试其他常见编码
  const otherEncodings = ['iso-8859-1', 'windows-1252', 'euc-jp', 'shift_jis'];
  for (const encoding of otherEncodings) {
    try {
      console.log(`步骤4: 尝试用 ${encoding.toUpperCase()} 解码...`);
      const decoder = new TextDecoder(encoding);
      const decodedText = decoder.decode(buffer);
      console.log(`步骤4: 使用 [${encoding}] 解码成功!`);
      return decodedText;
    } catch (e) {
      console.error(`步骤4失败: ${encoding}解码出错。`, e);
    }
  }

  console.error('所有解码尝试都失败了');
  return null;
}

// 检查BOM标记的辅助函数
function checkBOM(buffer) {
  const bytes = new Uint8Array(buffer);
  
  // UTF-8 BOM: EF BB BF
  if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
    return { encoding: 'utf-8', offset: 3 };
  }
  
  // UTF-16 LE BOM: FF FE
  if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE) {
    return { encoding: 'utf-16le', offset: 2 };
  }
  
  // UTF-16 BE BOM: FE FF
  if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) {
    return { encoding: 'utf-16be', offset: 2 };
  }
  
  // UTF-32 LE BOM: FF FE 00 00
  if (bytes.length >= 4 && bytes[0] === 0xFF && bytes[1] === 0xFE && bytes[2] === 0x00 && bytes[3] === 0x00) {
    return { encoding: 'utf-32le', offset: 4 };
  }
  
  // UTF-32 BE BOM: 00 00 FE FF
  if (bytes.length >= 4 && bytes[0] === 0x00 && bytes[1] === 0x00 && bytes[2] === 0xFE && bytes[3] === 0xFF) {
    return { encoding: 'utf-32be', offset: 4 };
  }
  
  return null;
}

// Markdown 内容清理函数
function cleanMarkdownContent(markdown) {
  if (!markdown) return '';
  let cleaned = markdown;

  // 1. 移除重复的标题
  const lines = cleaned.split('\n');
  const processedLines = [];
  let lastTitle = '';
  let codeBlockOpen = false;
  let codeBlockLang = '';
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    // 标题去重
    const titleMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (titleMatch) {
      const titleText = titleMatch[2].trim();
      if (titleText !== lastTitle) {
        processedLines.push(line);
        lastTitle = titleText;
      }
      continue;
    }
    // 代码块自动补全和语言标识
    const codeStart = line.match(/^```(\w*)/);
    if (codeStart) {
      codeBlockOpen = true;
      codeBlockLang = codeStart[1] || 'text';
      // 只允许常见语言
      const validLanguages = ['javascript','js','html','css','json','xml','yaml','yml','markdown','md','text','plaintext'];
      if (!validLanguages.includes(codeBlockLang.toLowerCase())) {
        codeBlockLang = 'text';
      }
      processedLines.push('```' + codeBlockLang);
      continue;
    }
    if (line.trim() === '```') {
      codeBlockOpen = false;
      codeBlockLang = '';
      processedLines.push('```');
      continue;
    }
    // 代码块内内容不做特殊处理
    processedLines.push(line);
  }
  // 如果最后有未闭合的代码块，自动补全
  if (codeBlockOpen) {
    processedLines.push('```');
  }
  cleaned = processedLines.join('\n');

  // 2. 移除所有锚点链接格式
  cleaned = cleaned.replace(/\[([^\]]+)\]\(#[^)]*\)/g, '$1');

  // 3. 清理空的代码块
  cleaned = cleaned.replace(/```\w*\n\s*```/g, '');

  // 4. 清理多余的空行
  cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n');

  // 5. 清理行首行尾空白
  cleaned = cleaned.trim();

  // 6. 清理特殊不可见字符
  cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF]/g, '');

  // 7. 确保文件以换行符结尾
  if (!cleaned.endsWith('\n')) {
    cleaned += '\n';
  }
  return cleaned;
}