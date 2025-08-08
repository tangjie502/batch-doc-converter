console.log('[Offscreen] offscreen_enhanced.js 已加载');

// 初始化 Turndown 转换器
let turndownService = null;

// ========== MarkDownload 风格的 Turndown 增强（仅美化样式，保持流程不变） ==========
function isInsideTable(node) {
  let parent = node && node.parentNode;
  while (parent) {
    if (parent.nodeName === 'TABLE') return true;
    parent = parent.parentNode;
  }
  return false;
}

function visibleLength(text) {
  return (text || '')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_~`]+(.*?)[*_~`]+/g, '$1')
    .length;
}

function createMarkStyledTurndownService(options, baseURI) {
  const opts = options || (typeof defaultOptions !== 'undefined' ? defaultOptions : {});

  // 保留/关闭转义
  if (typeof TurndownService !== 'undefined') {
    if (!TurndownService.prototype.defaultEscape) {
      TurndownService.prototype.defaultEscape = TurndownService.prototype.escape;
    }
    TurndownService.prototype.escape = opts.turndownEscape === false
      ? (s => s)
      : TurndownService.prototype.defaultEscape;
  }

  const service = new TurndownService({
    headingStyle: opts.headingStyle || 'atx',
    hr: opts.hr || '---',
    bulletListMarker: opts.bulletListMarker || '-',
    codeBlockStyle: opts.codeBlockStyle || 'fenced',
    fence: opts.fence || '```',
    emDelimiter: opts.emDelimiter || '*',
    strongDelimiter: opts.strongDelimiter || '**',
    linkStyle: opts.linkStyle || 'inlined',
    linkReferenceStyle: opts.linkReferenceStyle || 'full'
  });

  // 非表格 GFM 功能
  if (typeof turndownPluginGfm !== 'undefined') {
    service.use([
      turndownPluginGfm.highlightedCodeBlock,
      turndownPluginGfm.strikethrough,
      turndownPluginGfm.taskListItems
    ]);
  }

  // 移除不需要的元素
  service.remove(['script','style','link','meta','iframe','frame','nav','aside','form','button','input','textarea','select','option']);
  // 保留一些内联标记
  service.keep(['sub','sup','u','ins','del','small','big']);

  // 清理空标题
  service.addRule('cleanEmptyHeaders', {
    filter: function (node) {
      return node.nodeName.match(/^H[1-6]$/) && (!node.textContent || node.textContent.trim() === '');
    },
    replacement: function () { return ''; }
  });

  // 围栏代码块（含语言自动识别）
  service.addRule('fencedCodeBlock', {
    filter: function (node, tdopts) {
      return (
        tdopts.codeBlockStyle === 'fenced' &&
        node.nodeName === 'PRE' &&
        node.firstChild && node.firstChild.nodeName === 'CODE'
      );
    },
    replacement: function (content, node, tdopts) {
      const codeNode = node.firstChild;
      const className = codeNode.getAttribute('class') || '';
      let language = (className.match(/language-(\w+)/) || [null, ''])[1];
      if (!language && typeof hljs !== 'undefined') {
        try {
          const result = hljs.highlightAuto(codeNode.textContent || '');
          language = result.language || '';
        } catch (_) {}
      }
      const fence = (tdopts.fence || '```').charAt(0).repeat(3);
      return `\n\n${fence}${language}\n${codeNode.textContent}\n${fence}\n\n`;
    }
  });

  // 链接（表格内可剥离）
  service.addRule('links', {
    filter: (node) => node.nodeName === 'A' && node.getAttribute('href'),
    replacement: (content, node) => {
      const stripInTable = (opts.tableFormatting && opts.tableFormatting.stripLinks === true);
      if ((stripInTable && isInsideTable(node)) || opts.linkStyle === 'stripLinks') {
        return content;
      }
      const hrefRaw = node.getAttribute('href');
      let href = hrefRaw || '';
      if (baseURI) { try { href = new URL(hrefRaw, baseURI).href; } catch (_) {} }
      const title = node.getAttribute('title');
      const titlePart = title ? ` "${title}"` : '';
      return `[${content}](${href}${titlePart})`;
    }
  });

  // 表格美化
  service.addRule('prettyTable', {
    filter: 'table',
    replacement: function (content, tableNode) {
      try {
        const stripFormatting = !!(opts.tableFormatting && opts.tableFormatting.stripFormatting);
        const prettyPrint = opts.tableFormatting ? opts.tableFormatting.prettyPrint !== false : true;
        const centerText = !!(opts.tableFormatting && opts.tableFormatting.centerText);

        const cellService = new TurndownService({
          headingStyle: 'atx', hr: '---', bulletListMarker: '-', codeBlockStyle: 'fenced', fence: '```',
          emDelimiter: opts.emDelimiter || '*', strongDelimiter: opts.strongDelimiter || '**',
          linkStyle: (opts.tableFormatting && opts.tableFormatting.stripLinks) ? 'stripLinks' : (opts.linkStyle || 'inlined'),
          linkReferenceStyle: opts.linkReferenceStyle || 'full'
        });
        if (typeof turndownPluginGfm !== 'undefined') {
          cellService.use([turndownPluginGfm.strikethrough, turndownPluginGfm.taskListItems]);
        }

        const rows = Array.from(tableNode.querySelectorAll('tr')).map(tr => {
          return Array.from(tr.querySelectorAll('th,td')).map(td => {
            const container = document.createElement('div');
            container.innerHTML = td.innerHTML;
            if (stripFormatting) {
              ['b','strong','i','em','u','mark','sub','sup'].forEach(tag => {
                Array.from(container.getElementsByTagName(tag)).forEach(el => {
                  el.replaceWith(document.createTextNode(el.textContent.trim()));
                });
              });
            }
            let text = cellService.turndown(container.innerHTML)
              .replace(/\n/g, ' ')
              .replace(/\s+/g, ' ')
              .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ') // 替换各种空格字符为标准空格
              .trim()
              .replace(/\|/g, '\\|');
            return text || ' ';
          });
        });

        if (!rows.length) return '';
        const colCount = Math.max(...rows.map(r => r.length));
        const colWidths = Array.from({ length: colCount }, (_, i) => {
          return Math.max(...rows.map(r => visibleLength(r[i] || '')), 3);
        });

        const padCell = (text, idx) => {
          const t = text || '';
          if (!prettyPrint || t.includes('\n')) return ` ${t} `;
          const width = colWidths[idx] + 2;
          const len = visibleLength(t);
          if (!centerText) return ` ${t}${' '.repeat(Math.max(0, width - len - 1))}`;
          const left = Math.floor(Math.max(0, width - len) / 2);
          const right = Math.ceil(Math.max(0, width - len) / 2);
          return `${' '.repeat(left)}${t}${' '.repeat(right)}`;
        };

        let md = '\n\n';
        const firstRowIsHeader = tableNode.querySelector('tr') && Array.from(tableNode.querySelector('tr').children).every(n => n.nodeName === 'TH');
        const header = rows[0] || [];
        const dataRows = firstRowIsHeader ? rows.slice(1) : rows;
        md += '|' + header.map((c,i) => padCell(c,i)).join('|') + '|\n';
        md += '|' + colWidths.map(w => '-'.repeat(Math.max(3, w + 2))).join('|') + '|\n';
        dataRows.forEach(r => { md += '|' + r.map((c,i) => padCell(c,i)).join('|') + '|\n'; });
        return md + '\n';
      } catch (e) {
        console.error('[Offscreen] 表格转换失败:', e);
        return content;
      }
    }
  });

  return service;
}

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
  console.log('[Offscreen] 使用 MarkDownload 风格转换器 - 版本:', Date.now());
  
  if (!turndownService) {
    initTurndownService();
  }
  
  try {
    // 首先使用 Readability 提取主要内容
    const extracted = extractReadableContent(htmlContent, url, config);
    
    // 使用 MarkDownload 风格的 Turndown 进行更美观的 Markdown 转换
    const options = (typeof defaultOptions !== 'undefined') ? defaultOptions : {};
    console.log('[Offscreen] 使用配置选项:', JSON.stringify(options, null, 2));
    const service = createMarkStyledTurndownService(options, url);
    console.log('[Offscreen] MarkDownload 风格转换器创建成功');
    let markdown = service.turndown(extracted.content);
    console.log('[Offscreen] 转换完成，Markdown 长度:', markdown.length);
    console.log('[Offscreen] Markdown 预览 (前500字符):', markdown.substring(0, 500));
    
    // 关键字符清理（参考 MarkSnip）：移除非打印特殊字符
    // 这些字符在CodeMirror中会显示为红点，导致显示问题
    markdown = markdown.replace(/[\u0000-\u0009\u000b\u000c\u000e-\u001f\u007f-\u009f\u00ad\u061c\u200b-\u200f\u2028\u2029\ufeff\ufff9-\ufffc]/g, '');
    console.log('[Offscreen] 字符清理后长度:', markdown.length);
    
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

// 中英文间距修复（先清理异常空格，再规范化间距）
function fixChineseEnglishSpacing(text) {
  let fixed = text;
  
  // 第一步：清理异常空格（参考基础版本的修复逻辑）
  // 移除中文字符间的异常空格
  fixed = fixed.replace(/([\u4e00-\u9fff])\s+([\u4e00-\u9fff])/g, '$1$2');
  
  // 特殊修复：链接文本和URL中的异常空格
  // 修复链接文本中的空格（方括号内）
  fixed = fixed.replace(/\[([^\]]*)\]/g, (match, content) => {
    const cleanContent = content.replace(/([\u4e00-\u9fff])\s+([\u4e00-\u9fff])/g, '$1$2'); // 中文字符间去空格
    return `[${cleanContent}]`;
  });
  
  // 修复URL中的空格（圆括号内）
  fixed = fixed.replace(/\(([^)]*)\)/g, (match, content) => {
    const cleanContent = content.replace(/\s+/g, ''); // URL中完全移除空格
    return `(${cleanContent})`;
  });
  
  // 修复标点符号周围的异常空格
  fixed = fixed.replace(/([\u4e00-\u9fff])\s+([，。！？：；])/g, '$1$2'); // 中文字符后的标点
  fixed = fixed.replace(/([，。！？：；])\s+([\u4e00-\u9fff])/g, '$1$2'); // 标点后的中文字符
  
  // 第二步：规范化间距（原有逻辑的简化版）
  // 中文字符正则
  const chineseChar = '[\u4e00-\u9fff]';
  
  // 注意：这里不再添加中英文间的空格，因为在这个使用场景中会造成问题
  // 如果需要，可以根据具体需求调整
  
  // 清理多余的连续空格
  fixed = fixed.replace(/\s{2,}/g, ' ');
  
  // 清理行首行尾的空格
  fixed = fixed.replace(/^\s+|\s+$/gm, '');
  
  return fixed;
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
  console.log('[Offscreen] Content-Type:', contentType);
  console.log('[Offscreen] ArrayBuffer 大小:', arrayBuffer.byteLength);
  
  try {
    // 首先尝试从 Content-Type 中获取编码
    let encoding = 'utf-8';
    if (contentType && contentType.includes('charset=')) {
      const charsetMatch = contentType.match(/charset=([^;]+)/i);
      if (charsetMatch) {
        encoding = charsetMatch[1].toLowerCase();
        console.log('[Offscreen] 从 Content-Type 检测到编码:', encoding);
      }
    }
    
    // 尝试解码
    let htmlContent = null;
    let usedEncoding = null;
    
    // 优先尝试检测到的编码
    if (encoding !== 'utf-8') {
      try {
        const decoder = new TextDecoder(encoding);
        htmlContent = decoder.decode(arrayBuffer);
        usedEncoding = encoding;
        console.log(`[Offscreen] 使用 ${encoding} 编码成功`);
      } catch (e) {
        console.warn(`[Offscreen] ${encoding} 编码失败，回退到 UTF-8:`, e);
      }
    }
    
    // 如果检测的编码失败，尝试 UTF-8
    if (!htmlContent) {
      try {
        const decoder = new TextDecoder('utf-8');
        htmlContent = decoder.decode(arrayBuffer);
        usedEncoding = 'utf-8';
        console.log('[Offscreen] 使用 UTF-8 编码成功');
      } catch (e) {
        console.warn('[Offscreen] UTF-8 编码失败:', e);
      }
    }
    
    // 如果 UTF-8 也失败，尝试其他常见编码
    if (!htmlContent) {
      const fallbackEncodings = ['gbk', 'gb2312', 'big5', 'iso-8859-1', 'windows-1252'];
      for (const fallbackEncoding of fallbackEncodings) {
        try {
          const decoder = new TextDecoder(fallbackEncoding);
          htmlContent = decoder.decode(arrayBuffer);
          usedEncoding = fallbackEncoding;
          console.log(`[Offscreen] 使用 ${fallbackEncoding} 编码成功`);
          break;
        } catch (e) {
          console.warn(`[Offscreen] ${fallbackEncoding} 编码失败:`, e);
        }
      }
    }
    
    // 检查解码结果
    if (!htmlContent || htmlContent.trim() === '') {
      throw new Error('所有编码尝试都失败，无法解码HTML内容');
    }
    
    console.log('[Offscreen] 解码后HTML长度:', htmlContent.length);
    console.log('[Offscreen] 使用的编码:', usedEncoding);
    console.log('[Offscreen] HTML预览 (前200字符):', htmlContent.substring(0, 200));
    
    // 检查HTML内容是否包含中文字符（用于验证编码是否正确）
    const chineseCharCount = (htmlContent.match(/[\u4e00-\u9fff]/g) || []).length;
    console.log('[Offscreen] 中文字符数量:', chineseCharCount);
    
    // 如果内容包含中文字符但看起来被分割了，尝试重新编码
    if (chineseCharCount > 0 && htmlContent.includes(' ')) {
      const suspiciousPattern = /[\u4e00-\u9fff]\s+[\u4e00-\u9fff]/;
      if (suspiciousPattern.test(htmlContent)) {
        console.warn('[Offscreen] 检测到中文字符被错误分割，尝试修复...');
        
        // 尝试修复分割的中文字符
        htmlContent = htmlContent.replace(/([\u4e00-\u9fff])\s+([\u4e00-\u9fff])/g, '$1$2');
        htmlContent = htmlContent.replace(/([\u4e00-\u9fff])\s+([\u4e00-\u9fff])/g, '$1$2');
        
        console.log('[Offscreen] 修复后的HTML预览 (前200字符):', htmlContent.substring(0, 200));
      }
    }
    
    // 处理HTML内容
    const result = processHtmlContent(htmlContent, url, config);
    
    console.log('[Offscreen] 原始HTML处理完成');
    console.log('[Offscreen] 最终Markdown长度:', result.markdown.length);
    console.log('[Offscreen] 最终Markdown预览 (前300字符):', result.markdown.substring(0, 300));
    
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
        
      // 新增：处理状态更新消息（来自 background）
      case 'STATE_UPDATE':
        console.log('[Offscreen] 收到状态更新消息:', message.state);
        // offscreen 不需要处理状态更新，但也不应该报错
        sendResponse({ success: true });
        break;
        
      // 新增：处理其他可能的消息类型
      case 'GET_STATE':
        console.log('[Offscreen] 收到获取状态消息');
        sendResponse({ success: true, state: { isOffscreen: true } });
        break;
        
      case 'TOGGLE_SELECTION_MODE':
      case 'SWITCH_SELECTION_MODE':
      case 'ADD_LINK':
      case 'REMOVE_LINK':
      case 'PROCESS_QUEUE':
      case 'PROCESS_SELECTED_CONTENT':
      case 'PROCESS_LINKS_QUEUE':
      case 'PROCESSING_COMPLETE':
      case 'PROCESSING_ERROR':
      case 'START_SELECTION_MODE':
      case 'EXIT_SELECTION_MODE':
      case 'CLEAR_SELECTION':
      case 'SELECTION_UPDATED':
      case 'html-process-result':
      case 'html-process-error':
        // 这些消息通常由 background 处理，offscreen 可以忽略
        console.log('[Offscreen] 收到 background 消息类型:', message.type);
        sendResponse({ success: true });
        break;
        
      default:
        console.warn('[Offscreen] 未知消息类型:', message.type);
        // 不要报错，而是静默处理
        sendResponse({ success: true });
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