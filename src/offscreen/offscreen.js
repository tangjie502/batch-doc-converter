// offscreen.js - 带有超详细日志的调试版本（集成 MarkDownload 样式的 Turndown 规则）

if (typeof TurndownService !== 'undefined' && typeof turndownPluginGfm !== 'undefined') {
  // 记录默认 escape 方法，便于根据配置开启/关闭转义
  if (!TurndownService.prototype.defaultEscape) {
    TurndownService.prototype.defaultEscape = TurndownService.prototype.escape;
  }

  // 判断节点是否在表格内
  function isInsideTable(node) {
    let parent = node && node.parentNode;
    while (parent) {
      if (parent.nodeName === 'TABLE') return true;
      parent = parent.parentNode;
    }
    return false;
  }

  // 计算可见文本长度（去除 Markdown 语法后）
  function visibleLength(text) {
    return (text || '')
      .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1') // 链接/图片
      .replace(/[*_~`]+(.*?)[*_~`]+/g, '$1')          // 样式符号
      .length;
  }

  // 创建按选项配置的 TurndownService（参考 MarkDownload）
  function createTurndownService(options, baseURI) {
    const opts = options || (typeof defaultOptions !== 'undefined' ? defaultOptions : {});

    // 控制转义
    TurndownService.prototype.escape = opts.turndownEscape === false
      ? (s => s)
      : TurndownService.prototype.defaultEscape;

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

    // 仅启用非表格的 GFM 功能，然后自定义表格规则
    service.use([
      turndownPluginGfm.highlightedCodeBlock,
      turndownPluginGfm.strikethrough,
      turndownPluginGfm.taskListItems
    ]);

    // 移除不需要的元素
    service.remove(['script', 'style', 'link', 'meta', 'iframe', 'frame', 'nav', 'aside', 'form', 'button', 'input', 'textarea', 'select', 'option']);

    // 保留一些有用内联标记
    service.keep(['sub', 'sup', 'u', 'ins', 'del', 'small', 'big']);

    // 清理空标题
    service.addRule('cleanEmptyHeaders', {
      filter: function (node) {
        return node.nodeName.match(/^H[1-6]$/) && (!node.textContent || node.textContent.trim() === '');
      },
      replacement: function () { return ''; }
    });

    // fenced code（带语言）
    service.addRule('fencedCodeBlock', {
      filter: function (node, tdopts) {
        return (
          tdopts.codeBlockStyle === 'fenced' &&
          node.nodeName === 'PRE' &&
          node.firstChild &&
          node.firstChild.nodeName === 'CODE'
        );
      },
      replacement: function (content, node, tdopts) {
        const codeNode = node.firstChild;
        const className = codeNode.getAttribute('class') || '';
        let language = (className.match(/language-(\w+)/) || [null, ''])[1];
        // 若无语言且 hljs 可用，则尝试自动识别
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

    // 链接：表格内可按需去除链接，仅保留文本；其余位置规范输出（参考MarkSnip优化）
    service.addRule('links', {
      filter: (node) => node.nodeName === 'A' && node.getAttribute('href'),
      replacement: (content, node) => {
        const stripInTable = (opts.tableFormatting && opts.tableFormatting.stripLinks === true);
        if ((stripInTable && isInsideTable(node)) || opts.linkStyle === 'stripLinks') {
          return content;
        }
        const hrefRaw = node.getAttribute('href');
        let href = hrefRaw || '';
        
        // 更好的URL处理
        if (baseURI && href) {
          try { 
            href = new URL(hrefRaw, baseURI).href; 
          } catch (_) {
            // 如果URL解析失败，保持原始链接
            href = hrefRaw;
          }
        }
        
        const title = node.getAttribute('title');
        const titlePart = title ? ` "${title.replace(/"/g, '\\"')}"` : '';
        
        // 清理content中可能的异常字符
        const cleanContent = content.replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ').trim();
        
        return `[${cleanContent}](${href}${titlePart})`;
      }
    });

    // 表格：美化对齐，按列宽填充
    service.addRule('prettyTable', {
      filter: 'table',
      replacement: function (content, tableNode) {
        try {
          const stripFormatting = !!(opts.tableFormatting && opts.tableFormatting.stripFormatting);
          const prettyPrint = opts.tableFormatting ? opts.tableFormatting.prettyPrint !== false : true;
          const centerText = !!(opts.tableFormatting && opts.tableFormatting.centerText);

          // cell 专用 turndown（可配置去除链接/格式）
          const cellService = new TurndownService({
            headingStyle: 'atx',
            hr: '---',
            bulletListMarker: '-',
            codeBlockStyle: 'fenced',
            fence: '```',
            emDelimiter: opts.emDelimiter || '*',
            strongDelimiter: opts.strongDelimiter || '**',
            linkStyle: (opts.tableFormatting && opts.tableFormatting.stripLinks) ? 'stripLinks' : (opts.linkStyle || 'inlined'),
            linkReferenceStyle: opts.linkReferenceStyle || 'full'
          });
          cellService.use([turndownPluginGfm.strikethrough, turndownPluginGfm.taskListItems]);

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
                .replace(/\n/g, ' ') // 单元格内不换行
                .replace(/\s+/g, ' ') // 合并空白
                .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ') // 替换各种空格字符为标准空格
                .trim()
                .replace(/\|/g, '\\|'); // 转义 |
              return text || ' ';
            });
          });

          if (!rows.length) return '';

          // 计算列宽（按可见字符）
          const colCount = Math.max(...rows.map(r => r.length));
          const colWidths = Array.from({ length: colCount }, (_, i) => {
            return Math.max(...rows.map(r => visibleLength(r[i] || '')), 3);
          });

          const padCell = (text, idx) => {
            const t = text || '';
            if (!prettyPrint || t.includes('\n')) return ` ${t} `;
            const width = colWidths[idx] + 2; // 两侧空格
            const len = visibleLength(t);
            if (!centerText) return ` ${t}${' '.repeat(Math.max(0, width - len - 1))}`;
            const left = Math.floor(Math.max(0, width - len) / 2);
            const right = Math.ceil(Math.max(0, width - len) / 2);
            return `${' '.repeat(left)}${t}${' '.repeat(right)}`;
          };

          let md = '\n\n';
          // 头部（若首行是 th）
          const firstRowIsHeader = tableNode.querySelector('tr') && Array.from(tableNode.querySelector('tr').children).every(n => n.nodeName === 'TH');
          const header = rows[0] || [];
          const dataRows = firstRowIsHeader ? rows.slice(1) : rows;

          const headerLine = '|' + header.map((c, i) => padCell(c, i)).join('|') + '|' ;
          md += headerLine + '\n';
          const sep = '|' + colWidths.map(w => '-'.repeat(Math.max(3, w + 2))).join('|') + '|\n';
          md += sep;
          dataRows.forEach(r => {
            md += '|' + r.map((c, i) => padCell(c, i)).join('|') + '|\n';
          });
          return md + '\n';
        } catch (e) {
          console.error('[Offscreen] 表格转换失败:', e);
          return content;
        }
      }
    });

    return service;
  }

  chrome.runtime.onMessage.addListener(handleMessages);

  async function handleMessages(message) {
    if (message.target !== 'offscreen' || message.type !== 'process-raw-html') {
      // 处理其他可能的消息类型，避免报错
      if (message.type === 'STATE_UPDATE' || 
          message.type === 'GET_STATE' ||
          message.type === 'TOGGLE_SELECTION_MODE' ||
          message.type === 'SWITCH_SELECTION_MODE' ||
          message.type === 'ADD_LINK' ||
          message.type === 'REMOVE_LINK' ||
          message.type === 'PROCESS_QUEUE' ||
          message.type === 'PROCESS_SELECTED_CONTENT' ||
          message.type === 'PROCESS_LINKS_QUEUE' ||
          message.type === 'PROCESSING_COMPLETE' ||
          message.type === 'PROCESSING_ERROR' ||
          message.type === 'START_SELECTION_MODE' ||
          message.type === 'EXIT_SELECTION_MODE' ||
          message.type === 'CLEAR_SELECTION' ||
          message.type === 'SELECTION_UPDATED' ||
          message.type === 'html-process-result' ||
          message.type === 'html-process-error') {
        console.log('[Offscreen] 收到 background 消息类型:', message.type);
        return;
      }
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
      // 读取配置（若不可用则使用默认）
      let options = (typeof getOptions === 'function') ? await getOptions() : (typeof defaultOptions !== 'undefined' ? defaultOptions : {});

      const doc = new DOMParser().parseFromString(htmlText, 'text/html');
      const title = doc.querySelector('title')?.textContent || message.url;
      
      console.log(`[Offscreen] 解析DOM成功，标题: ${title}`);
      
      // 移除不需要的元素
      doc.querySelectorAll('script, style, link, meta, noscript').forEach(el => el.remove());
      
      // 增强的内容抓取策略
      const contentNode = extractEnhancedContent(doc);
      
      const service = createTurndownService(options, message.url);
      let markdownContent = service.turndown(contentNode);
      
      console.log(`[Offscreen] 转换为Markdown成功，长度: ${markdownContent.length} 字符`);
      console.log(`[Offscreen] 转换前100字符预览: ${markdownContent.substring(0, 100)}`);
      
      // 关键字符清理（参考 MarkSnip）：移除非打印特殊字符
      // 这些字符在CodeMirror中会显示为红点，导致显示问题
      markdownContent = markdownContent.replace(/[\u0000-\u0009\u000b\u000c\u000e-\u001f\u007f-\u009f\u00ad\u061c\u200b-\u200f\u2028\u2029\ufeff\ufff9-\ufffc]/g, '');
      
      console.log(`[Offscreen] 字符清理后长度: ${markdownContent.length} 字符`);
      console.log(`[Offscreen] 字符清理后100字符预览: ${markdownContent.substring(0, 100)}`);
      
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

// Markdown 内容清理函数（参考 MarkSnip 优化）
function cleanMarkdownContent(markdown) {
  if (!markdown) return '';
  let cleaned = markdown;

  // 0. 额外的字符异常处理 - 处理可能的字符编码问题
  // 移除可能导致字符间空格的零宽字符和控制字符
  cleaned = cleaned.replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' '); // 替换各种空格字符为标准空格
  
  // 关键修复：循环移除异常空格（基于深度分析结果）
  // 使用循环处理确保所有空格都被正确移除
  
  let previousLength;
  do {
    previousLength = cleaned.length;
    
    // 移除中文字符间的异常空格
    cleaned = cleaned.replace(/([\u4e00-\u9fff])\s+([\u4e00-\u9fff])/g, '$1$2');
    
    // 移除英文字母间的异常空格（解决"u T o o l s"问题）
    cleaned = cleaned.replace(/([a-zA-Z])\s+([a-zA-Z])/g, '$1$2');
    
    // 移除数字间的异常空格
    cleaned = cleaned.replace(/([0-9])\s+([0-9])/g, '$1$2');
    
    // 修复中英文混合时的空格问题
    cleaned = cleaned.replace(/([\u4e00-\u9fff])\s+([a-zA-Z0-9])/g, '$1$2'); // 中文后紧跟英文/数字
    cleaned = cleaned.replace(/([a-zA-Z0-9])\s+([\u4e00-\u9fff])/g, '$1$2'); // 英文/数字后紧跟中文
    
    // 修复标点符号周围的异常空格
    cleaned = cleaned.replace(/([\u4e00-\u9fff])\s+([，。！？：；、])/g, '$1$2'); // 中文字符后的标点
    cleaned = cleaned.replace(/([，。！？：；、])\s+([\u4e00-\u9fff])/g, '$1$2'); // 标点后的中文字符
    
  } while (cleaned.length !== previousLength); // 继续直到没有更多变化
  
  cleaned = cleaned.replace(/\s+/g, ' '); // 合并剩余的多个空格为单个空格
  cleaned = cleaned.replace(/ +\n/g, '\n'); // 移除行尾空格
  
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

  // 4. 清理多余的空行（但保持基本段落结构）
  cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n');
  
  // 5. 清理异常的空白字符组合
  cleaned = cleaned.replace(/[\t ]+/g, ' '); // 将制表符和多个空格替换为单个空格
  cleaned = cleaned.replace(/[ ]+$/gm, ''); // 移除行尾空格

  // 6. 清理行首行尾空白
  cleaned = cleaned.trim();

  // 7. 修复可能的链接格式问题
  cleaned = cleaned.replace(/\]\s*\(/g, ']('); // 修复链接中的意外空格
  cleaned = cleaned.replace(/!\s*\[/g, '!['); // 修复图片链接中的意外空格
  
  // 8. 特殊修复：链接文本和URL中的异常空格
  // 修复链接文本中的空格（方括号内）
  cleaned = cleaned.replace(/\[([^\]]*)\]/g, (match, content) => {
    const cleanContent = content.replace(/([\u4e00-\u9fff])\s+([\u4e00-\u9fff])/g, '$1$2'); // 中文字符间去空格
    return `[${cleanContent}]`;
  });
  
  // 修复URL中的空格（圆括号内）
  cleaned = cleaned.replace(/\(([^)]*)\)/g, (match, content) => {
    const cleanContent = content.replace(/\s+/g, ''); // URL中完全移除空格
    return `(${cleanContent})`;
  });

  // 9. 确保文件以换行符结尾
  if (!cleaned.endsWith('\n')) {
    cleaned += '\n';
  }
  
  return cleaned;
}