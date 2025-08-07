console.log('[Offscreen] offscreen_enhanced.js 已加载');

// 初始化 Turndown 转换器
let turndownService = null;

// 增强表格处理规则
function addEnhancedTableRules(turndownService) {
  // 自定义表格规则 - 支持表格对齐和格式化
  turndownService.addRule('enhancedTable', {
    filter: 'table',
    replacement: function (content, node) {
      // 提取表格数据
      const rows = [];
      const tableRows = node.querySelectorAll('tr');
      
      tableRows.forEach((tr, rowIndex) => {
        const cells = tr.querySelectorAll('th, td');
        const rowData = [];
        
        cells.forEach(cell => {
          // 清理单元格内容
          let cellContent = turndownService.turndown(cell.innerHTML);
          // 移除换行和多余空格
          cellContent = cellContent.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
          // 转义管道符
          cellContent = cellContent.replace(/\|/g, '\\|');
          rowData.push(cellContent || ' ');
        });
        
        rows.push(rowData);
      });
      
      if (rows.length === 0) return '';
      
      // 生成Markdown表格
      let markdown = '\n';
      
      // 表头
      if (rows.length > 0) {
        markdown += '| ' + rows[0].join(' | ') + ' |\n';
        // 分隔线
        markdown += '| ' + rows[0].map(() => '---').join(' | ') + ' |\n';
        
        // 数据行
        for (let i = 1; i < rows.length; i++) {
          markdown += '| ' + rows[i].join(' | ') + ' |\n';
        }
      }
      
      return markdown + '\n';
    }
  });
  
  // 处理表格单元格
  turndownService.addRule('tableCell', {
    filter: ['th', 'td'],
    replacement: function (content) {
      return content.trim();
    }
  });
}

// 添加代码块增强规则
function addCodeBlockRules(turndownService) {
  // 保留代码块的类名信息
  turndownService.addRule('codeBlock', {
    filter: function (node) {
      return node.nodeName === 'PRE' && node.firstChild && node.firstChild.nodeName === 'CODE';
    },
    replacement: function (content, node) {
      const code = node.firstChild;
      const className = code.className || '';
      
      // 提取语言信息
      let language = '';
      const langMatch = className.match(/language-(\w+)/);
      if (langMatch) {
        language = langMatch[1];
      }
      
      // 清理代码内容
      const codeContent = code.textContent || code.innerText || '';
      
      return '\n\n```' + language + '\n' + codeContent + '\n```\n\n';
    }
  });
}

// 初始化转换器
function initTurndownService() {
  if (typeof TurndownService !== 'undefined') {
    turndownService = new TurndownService({
      headingStyle: 'atx',           // 使用 # 标题样式
      hr: '---',                     // 分隔线样式
      bulletListMarker: '-',         // 无序列表标记
      codeBlockStyle: 'fenced',      // 使用围栏代码块
      fence: '```',                  // 代码块围栏
      emDelimiter: '*',              // 斜体分隔符
      strongDelimiter: '**',         // 粗体分隔符
      linkStyle: 'inlined',          // 链接样式
      linkReferenceStyle: 'full',    // 链接引用样式
      preformattedCode: true         // 保留预格式化代码
    });
    
    // 添加 GFM 插件
    if (typeof turndownGfm !== 'undefined') {
      turndownService.use(turndownGfm.gfm);
    }
    
    // 添加增强规则
    addEnhancedTableRules(turndownService);
    addCodeBlockRules(turndownService);
    
    // 移除不需要的标签但保留内容
    turndownService.remove(['script', 'style', 'noscript']);
    
    // 保留有用的属性
    turndownService.keep(['mark', 'del', 'ins']);
    
    console.log('[Offscreen] 增强版 TurndownService 已初始化');
  } else {
    console.error('[Offscreen] TurndownService 未定义');
  }
}

// 使用Readability提取可读内容（增强版）
function extractReadableContent(htmlContent, url, config = {}) {
  console.log('[Offscreen] 开始智能内容提取');
  
  try {
    // 创建虚拟DOM
    const doc = new DOMParser().parseFromString(htmlContent, 'text/html');
    
    // 预处理HTML内容
    if (config.contentExtraction) {
      preprocessHtmlContent(doc, config.contentExtraction);
    }
    
    // 使用 Readability 提取内容
    const article = new Readability(doc, {
      debug: false,
      charThreshold: config.contentExtraction?.smartDecoding ? 300 : 500,
      classesToPreserve: ['highlight', 'code', 'language-'] // 保留代码相关类
    }).parse();
    
    if (article && article.content) {
      console.log('[Offscreen] Readability提取成功');
      
      // 后处理提取的内容
      let processedContent = article.content;
      if (config.contentExtraction) {
        processedContent = postprocessExtractedContent(article.content, config.contentExtraction);
      }
      
      return {
        title: article.title || extractTitleFromDoc(doc) || '未知标题',
        content: processedContent,
        textContent: article.textContent || '',
        length: article.length || 0,
        excerpt: article.excerpt || extractExcerpt(processedContent)
      };
    } else {
      console.warn('[Offscreen] Readability 不可用，使用备用提取方式');
      return fallbackExtraction(doc, config);
    }
  } catch (error) {
    console.error('[Offscreen] 智能内容提取失败:', error);
    return {
      title: '提取失败',
      content: htmlContent,
      textContent: '',
      length: 0,
      excerpt: ''
    };
  }
}

// 预处理HTML内容
function preprocessHtmlContent(doc, config) {
  console.log('[Offscreen] 预处理HTML内容');
  
  // 展开折叠的内容
  if (config.expandCollapsed) {
    expandCollapsedElements(doc);
  }
  
  // 处理懒加载内容
  if (config.processLazyLoaded) {
    processLazyLoadedContent(doc);
  }
  
  // 移除噪音内容
  if (config.removeNoise) {
    removeNoiseElements(doc);
  }
  
  // 提取隐藏内容
  if (config.extractHiddenContent) {
    extractHiddenElements(doc);
  }
}

// 展开折叠元素
function expandCollapsedElements(doc) {
  // 查找并展开 details/summary 元素
  const details = doc.querySelectorAll('details');
  details.forEach(detail => {
    detail.setAttribute('open', '');
  });
  
  // 展开具有 data-collapsed 或 collapsed 类的元素
  const collapsed = doc.querySelectorAll('[data-collapsed], .collapsed, .collapse');
  collapsed.forEach(el => {
    el.removeAttribute('data-collapsed');
    el.classList.remove('collapsed', 'collapse');
    el.style.display = '';
    el.style.visibility = '';
    el.style.height = '';
  });
}

// 处理懒加载内容
function processLazyLoadedContent(doc) {
  // 处理懒加载图片
  const lazyImages = doc.querySelectorAll('img[data-src], img[data-lazy-src]');
  lazyImages.forEach(img => {
    const src = img.getAttribute('data-src') || img.getAttribute('data-lazy-src');
    if (src) {
      img.setAttribute('src', src);
    }
  });
  
  // 处理懒加载内容容器
  const lazyContainers = doc.querySelectorAll('[data-lazy], [data-lazy-load]');
  lazyContainers.forEach(container => {
    container.style.display = '';
    container.removeAttribute('data-lazy');
    container.removeAttribute('data-lazy-load');
  });
}

// 移除噪音元素
function removeNoiseElements(doc) {
  const noiseSelectors = [
    'script', 'style', 'noscript',
    '.advertisement', '.ads', '.ad',
    '.social-share', '.social-media',
    '.newsletter', '.subscription',
    '.popup', '.modal', '.overlay',
    '.sidebar', '.widget',
    '.comment-section', '.comments',
    '.related-articles', '.recommended',
    '[class*="cookie"]', '[id*="cookie"]',
    '[class*="gdpr"]', '[id*="gdpr"]'
  ];
  
  noiseSelectors.forEach(selector => {
    try {
      const elements = doc.querySelectorAll(selector);
      elements.forEach(el => el.remove());
    } catch (error) {
      console.warn('[Offscreen] 移除噪音元素失败:', selector, error);
    }
  });
}

// 提取隐藏内容
function extractHiddenElements(doc) {
  const hiddenElements = doc.querySelectorAll('[style*="display:none"], [style*="visibility:hidden"]');
  hiddenElements.forEach(el => {
    // 只显示可能包含有用内容的元素
    if (el.textContent.trim().length > 20) {
      el.style.display = '';
      el.style.visibility = '';
    }
  });
}

// 后处理提取的内容
function postprocessExtractedContent(content, config) {
  if (!config.preserveFormatting) {
    // 移除额外的格式化元素
    const tempDoc = new DOMParser().parseFromString(content, 'text/html');
    const formatElements = tempDoc.querySelectorAll('font, center, u, strike');
    formatElements.forEach(el => {
      el.outerHTML = el.innerHTML;
    });
    content = tempDoc.body.innerHTML;
  }
  
  return content;
}

// 从文档中提取标题
function extractTitleFromDoc(doc) {
  // 尝试多种方式提取标题
  const titleSelectors = [
    'title',
    'h1',
    '[property="og:title"]',
    '[name="twitter:title"]',
    '.title', '.post-title', '.article-title'
  ];
  
  for (const selector of titleSelectors) {
    try {
      const element = doc.querySelector(selector);
      if (element) {
        const title = element.getAttribute('content') || element.textContent;
        if (title && title.trim().length > 0) {
          return title.trim();
        }
      }
    } catch (error) {
      continue;
    }
  }
  
  return null;
}

// 提取摘要
function extractExcerpt(content, maxLength = 200) {
  if (!content) return '';
  
  const tempDoc = new DOMParser().parseFromString(content, 'text/html');
  const text = tempDoc.body.textContent || '';
  
  if (text.length <= maxLength) {
    return text.trim();
  }
  
  // 在单词边界截断
  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated) + '...';
}

// 备用提取方式
function fallbackExtraction(doc, config) {
  console.log('[Offscreen] 使用备用内容提取方式');
  
  // 尝试提取主要内容区域
  const contentSelectors = [
    'main', 'article', '.content', '.post', '.entry',
    '#content', '#main', '#article', '#post'
  ];
  
  let content = '';
  let title = extractTitleFromDoc(doc) || '未知标题';
  
  for (const selector of contentSelectors) {
    try {
      const element = doc.querySelector(selector);
      if (element && element.textContent.trim().length > 100) {
        content = element.innerHTML;
        break;
      }
    } catch (error) {
      continue;
    }
  }
  
  if (!content) {
    content = doc.body.innerHTML;
  }
  
  return {
    title: title,
    content: content,
    textContent: doc.body.textContent || '',
    length: content.length,
    excerpt: extractExcerpt(content)
  };
}

// 处理代码块语言检测
function enhanceCodeBlocks(markdown) {
  console.log('[Offscreen] 增强代码块语言检测');
  
  try {
    // 如果 highlight.js 可用，进行代码语言检测
    if (typeof hljs !== 'undefined') {
      // 查找代码块并尝试检测语言
      return markdown.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
        if (!lang || lang.trim() === '') {
          // 尝试自动检测语言
          const result = hljs.highlightAuto(code.trim());
          if (result.language && result.relevance > 5) {
            console.log(`[Offscreen] 检测到代码语言: ${result.language}`);
            return `\`\`\`${result.language}\n${code}\`\`\``;
          }
        }
        return match;
      });
    }
    return markdown;
  } catch (error) {
    console.error('[Offscreen] 代码块处理失败:', error);
    return markdown;
  }
}

// 处理图片 - 转换为Markdown格式并记录
function processImages(markdown, url) {
  console.log('[Offscreen] 处理图片链接');
  
  const images = [];
  
  try {
    // 提取图片信息
    const imgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    let match;
    
    while ((match = imgRegex.exec(markdown)) !== null) {
      const [fullMatch, alt, src] = match;
      
      // 处理相对路径
      let fullSrc = src;
      if (url && !src.startsWith('http') && !src.startsWith('data:')) {
        try {
          fullSrc = new URL(src, url).href;
        } catch (e) {
          console.warn('[Offscreen] 无法解析图片URL:', src);
        }
      }
      
      images.push({
        alt: alt || '图片',
        src: fullSrc,
        originalSrc: src
      });
    }
    
    // 替换图片链接为完整URL
    const enhancedMarkdown = markdown.replace(imgRegex, (match, alt, src) => {
      let fullSrc = src;
      if (url && !src.startsWith('http') && !src.startsWith('data:')) {
        try {
          fullSrc = new URL(src, url).href;
        } catch (e) {
          // 保持原样
        }
      }
      return `![${alt}](${fullSrc})`;
    });
    
    console.log(`[Offscreen] 发现 ${images.length} 个图片`);
    return {
      markdown: enhancedMarkdown,
      images: images
    };
  } catch (error) {
    console.error('[Offscreen] 图片处理失败:', error);
    return {
      markdown: markdown,
      images: []
    };
  }
}

// 处理HTML内容转换为Markdown
function processHtmlContent(htmlContent, url = '', config = {}) {
  console.log('[Offscreen] 处理HTML内容');
  
  if (!turndownService) {
    initTurndownService();
  }
  
  try {
    // 首先使用 Readability 提取主要内容
    const extracted = extractReadableContent(htmlContent, url, config);
    
    // 使用Turndown转换HTML为Markdown
    let markdown = turndownService.turndown(extracted.content);
    
    // 添加标题
    if (extracted.title && extracted.title !== '未知标题') {
      markdown = `# ${extracted.title}\n\n${markdown}`;
    }
    
    // 增强代码块
    markdown = enhanceCodeBlocks(markdown);
    
    // 处理图片
    const imageResult = processImages(markdown, url);
    markdown = imageResult.markdown;
    
    // 表格格式化处理
    markdown = formatTables(markdown, config);
    
    // 中文优化处理
    markdown = optimizeChineseContent(markdown, config);
    
    // 添加元数据
    const metadata = {
      title: extracted.title,
      length: extracted.length,
      excerpt: extracted.excerpt,
      url: url,
      images: imageResult.images,
      imageCount: imageResult.images.length,
      processedAt: new Date().toISOString()
    };
    
    console.log('[Offscreen] HTML转换完成，内容长度:', markdown.length);
    return {
      markdown: markdown,
      metadata: metadata
    };
  } catch (error) {
    console.error('[Offscreen] HTML转换失败:', error);
    return {
      markdown: `转换失败: ${error.message}`,
      metadata: { error: error.message }
    };
  }
}

// 中文优化处理函数
function optimizeChineseContent(markdown, config = {}) {
  console.log('[Offscreen] 开始中文优化处理');
  
  if (!config.chineseOptimization) {
    return markdown;
  }
  
  try {
    let optimized = markdown;
    
    // 1. 标点符号转换
    if (config.chineseOptimization.convertPunctuation) {
      optimized = convertPunctuation(optimized);
    }
    
    // 2. 中英文间距修复
    if (config.chineseOptimization.fixSpacing) {
      optimized = fixChineseEnglishSpacing(optimized);
    }
    
    // 3. 换行优化
    if (config.chineseOptimization.optimizeLineBreaks) {
      optimized = optimizeLineBreaks(optimized);
    }
    
    console.log('[Offscreen] 中文优化处理完成');
    return optimized;
  } catch (error) {
    console.error('[Offscreen] 中文优化处理失败:', error);
    return markdown;
  }
}

// 标点符号转换
function convertPunctuation(text) {
  const punctuationMap = {
    // 全角转半角
    '，': ',',
    '。': '.',
    '？': '?',
    '！': '!',
    '；': ';',
    '：': ':',
    '（': '(',
    '）': ')',
    '［': '[',
    '］': ']',
    '｛': '{',
    '｝': '}',
    '｜': '|',
    '＋': '+',
    '－': '-',
    '＊': '*',
    '／': '/',
    '＝': '=',
    '＜': '<',
    '＞': '>',
    '％': '%',
    '＠': '@',
    '＃': '#',
    '＄': '$',
    '＾': '^',
    '＆': '&',
    '～': '~'
  };
  
  // 中文引号特殊处理 - 保持中文引号用于中文内容
  return text.replace(/[，。？！；：（）［］｛｝｜＋－＊／＝＜＞％＠＃＄＾＆～]/g, (match) => {
    return punctuationMap[match] || match;
  });
}

// 中英文间距修复
function fixChineseEnglishSpacing(text) {
  // 中文字符正则
  const chineseChar = '[\u4e00-\u9fff\u3400-\u4dbf\u20000-\u2a6df\u2a700-\u2b73f\u2b740-\u2b81f\u2b820-\u2ceaf]';
  // 英文字符和数字正则
  const englishChar = '[a-zA-Z0-9]';
  
  return text
    // 中文后面跟英文/数字，添加空格
    .replace(new RegExp(`(${chineseChar})([a-zA-Z0-9])`, 'g'), '$1 $2')
    // 英文/数字后面跟中文，添加空格
    .replace(new RegExp(`([a-zA-Z0-9])(${chineseChar})`, 'g'), '$1 $2')
    // 中文后面跟英文标点，添加空格
    .replace(new RegExp(`(${chineseChar})([.,!?;:])`, 'g'), '$1 $2')
    // 清理多余的连续空格
    .replace(/\s{2,}/g, ' ')
    // 清理行首行尾的空格
    .replace(/^\s+|\s+$/gm, '');
}

// 换行优化
function optimizeLineBreaks(text) {
  return text
    // 移除多余的空行（保留最多一个空行）
    .replace(/\n{3,}/g, '\n\n')
    // 优化列表项之间的换行
    .replace(/^(\s*[-*+]\s+.+)\n\n(\s*[-*+]\s+)/gm, '$1\n$2')
    // 优化有序列表项之间的换行
    .replace(/^(\s*\d+\.\s+.+)\n\n(\s*\d+\.\s+)/gm, '$1\n$2')
    // 标题前确保有空行
    .replace(/\n(#{1,6}\s+)/g, '\n\n$1')
    // 代码块前后确保有空行
    .replace(/\n(```)/g, '\n\n$1')
    .replace(/(```)\n/g, '$1\n\n')
    // 清理文档开头的多余换行
    .replace(/^\n+/, '')
    // 清理文档结尾的多余换行
    .replace(/\n+$/, '\n');
}

// 表格格式化处理函数
function formatTables(markdown, config = {}) {
  console.log('[Offscreen] 开始表格格式化处理');
  
  if (!config.tableFormatting || !config.tableFormatting.prettyPrint) {
    return markdown;
  }
  
  try {
    // 查找所有表格
    const tableRegex = /(\|[^\n]+\|\n)+(\|[\s\-:]*\|\n)(\|[^\n]+\|\n)+/g;
    
    return markdown.replace(tableRegex, (match) => {
      return prettifyTable(match, config.tableFormatting);
    });
  } catch (error) {
    console.error('[Offscreen] 表格格式化失败:', error);
    return markdown;
  }
}

// 美化单个表格
function prettifyTable(tableText, config) {
  const lines = tableText.trim().split('\n');
  if (lines.length < 3) return tableText; // 至少需要头部、分隔线、数据行
  
  // 解析表格行
  const rows = lines.map(line => {
    return line.split('|').slice(1, -1).map(cell => cell.trim());
  });
  
  if (rows.length === 0) return tableText;
  
  // 计算每列的最大宽度
  const colCount = Math.max(...rows.map(row => row.length));
  const colWidths = [];
  
  for (let col = 0; col < colCount; col++) {
    let maxWidth = 0;
    for (let row = 0; row < rows.length; row++) {
      if (rows[row][col]) {
        const cellContent = config.stripLinks ? 
          stripLinksFromCell(rows[row][col]) : 
          rows[row][col];
        maxWidth = Math.max(maxWidth, cellContent.length);
      }
    }
    colWidths[col] = Math.max(maxWidth, 3); // 最小宽度为3
  }
  
  // 格式化表格
  const formattedRows = [];
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const formattedCells = [];
    
    for (let j = 0; j < colCount; j++) {
      let cell = row[j] || '';
      
      // 处理链接
      if (config.stripLinks) {
        cell = stripLinksFromCell(cell);
      }
      
      // 处理格式
      if (config.stripFormatting) {
        cell = stripFormattingFromCell(cell);
      }
      
      // 对齐文本
      if (config.alignColumns) {
        if (i === 1) { // 分隔行
          cell = createSeparatorCell(colWidths[j], config.centerText);
        } else {
          cell = padCell(cell, colWidths[j], config.centerText);
        }
      }
      
      formattedCells.push(cell);
    }
    
    formattedRows.push('| ' + formattedCells.join(' | ') + ' |');
  }
  
  return formattedRows.join('\n') + '\n';
}

// 移除单元格中的链接
function stripLinksFromCell(cell) {
  // 移除Markdown链接，保留链接文本
  return cell.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
             .replace(/\[([^\]]+)\]\[[^\]]*\]/g, '$1');
}

// 移除单元格中的格式
function stripFormattingFromCell(cell) {
  return cell.replace(/\*\*([^*]+)\*\*/g, '$1')  // 粗体
             .replace(/\*([^*]+)\*/g, '$1')       // 斜体
             .replace(/`([^`]+)`/g, '$1')         // 行内代码
             .replace(/~~([^~]+)~~/g, '$1');      // 删除线
}

// 填充单元格内容
function padCell(content, width, center = false) {
  if (content.length >= width) return content;
  
  const padding = width - content.length;
  if (center) {
    const leftPad = Math.floor(padding / 2);
    const rightPad = padding - leftPad;
    return ' '.repeat(leftPad) + content + ' '.repeat(rightPad);
  } else {
    return content + ' '.repeat(padding);
  }
}

// 创建分隔行单元格
function createSeparatorCell(width, center = false) {
  if (center) {
    return ':' + '-'.repeat(Math.max(width - 2, 1)) + ':';
  } else {
    return '-'.repeat(width);
  }
}

// 处理原始HTML数据
function processRawHtml(arrayBuffer, contentType, url, config = {}) {
  console.log('[Offscreen] 处理原始HTML:', url);
  
  try {
    // 将ArrayBuffer转换为文本
    const decoder = new TextDecoder('utf-8');
    const htmlContent = decoder.decode(arrayBuffer);
    
    // 处理HTML内容
    const result = processHtmlContent(htmlContent, url, config);
    
    console.log('[Offscreen] 原始HTML处理完成');
    return result;
  } catch (error) {
    console.error('[Offscreen] 原始HTML处理失败:', error);
    return {
      markdown: `处理失败: ${error.message}`,
      metadata: { error: error.message }
    };
  }
}

// 消息监听器
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Offscreen] 收到消息:', message);

  if (!message || !message.type) {
    sendResponse({ success: false, error: '无效消息' });
    return false;
  }

  try {
    switch (message.type) {
      case 'process-html-content':
        console.log('[Offscreen] 处理HTML内容消息');
        const result = processHtmlContent(message.htmlContent, message.url, message.config);
        
        // 发送结果回background
        chrome.runtime.sendMessage({
          type: 'html-process-result',
          markdown: result.markdown,
          metadata: result.metadata
        });
        
        sendResponse({ success: true });
        break;
        
      case 'process-raw-html':
        console.log('[Offscreen] 处理原始HTML消息');
        const rawResult = processRawHtml(
          new Uint8Array(message.arrayBuffer), 
          message.contentType, 
          message.url,
          message.config
        );
        
        // 发送结果回background
        chrome.runtime.sendMessage({
          type: 'PROCESSING_COMPLETE',
          url: message.url,
          markdown: rawResult.markdown,
          metadata: rawResult.metadata
        });
        
        sendResponse({ success: true });
        break;
        
      case 'PROCESS_URL':
        // 保持向后兼容
        sendResponse({ success: true, data: `已处理: ${message.url}` });
        break;
        
      case 'REPROCESS_HTML_TO_MARKDOWN':
        const { html, config } = message;
        const md = processHtmlContent(html, config);
        sendResponse({ markdown: md });
        return true;
        
      default:
        console.warn('[Offscreen] 未知消息类型:', message.type);
        sendResponse({ success: false, error: '未知消息类型' });
    }
  } catch (error) {
    console.error('[Offscreen] 消息处理失败:', error);
    sendResponse({ success: false, error: error.message });
  }
  
  return true; // 表示异步响应
});

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  console.log('[Offscreen] DOM加载完成，初始化转换器');
  initTurndownService();
});

console.log('[Offscreen] 消息监听器已设置');