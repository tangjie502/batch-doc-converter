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

// 使用 Readability 提取主要内容
function extractReadableContent(htmlContent, url) {
  console.log('[Offscreen] 使用 Readability 提取内容');
  
  try {
    // 创建 DOM 解析器
    const doc = new DOMParser().parseFromString(htmlContent, 'text/html');
    
    // 使用 Readability 提取内容
    const article = new Readability(doc, {
      debug: false,
      charThreshold: 500, // 最小字符数
      classesToPreserve: ['highlight', 'code', 'language-'] // 保留代码相关类
    }).parse();
    
    if (article && article.content) {
      console.log('[Offscreen] Readability 提取成功，标题:', article.title);
      return {
        title: article.title || '未知标题',
        content: article.content,
        textContent: article.textContent,
        length: article.length,
        excerpt: article.excerpt
      };
    } else {
      console.warn('[Offscreen] Readability 提取失败，使用原始内容');
      return {
        title: '未知标题', 
        content: htmlContent,
        textContent: '',
        length: 0,
        excerpt: ''
      };
    }
  } catch (error) {
    console.error('[Offscreen] Readability 处理失败:', error);
    return {
      title: '提取失败',
      content: htmlContent,
      textContent: '',
      length: 0,
      excerpt: ''
    };
  }
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
function processHtmlContent(htmlContent, url = '') {
  console.log('[Offscreen] 处理HTML内容');
  
  if (!turndownService) {
    initTurndownService();
  }
  
  try {
    // 首先使用 Readability 提取主要内容
    const extracted = extractReadableContent(htmlContent, url);
    
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

// 处理原始HTML数据
function processRawHtml(arrayBuffer, contentType, url) {
  console.log('[Offscreen] 处理原始HTML:', url);
  
  try {
    // 将ArrayBuffer转换为文本
    const decoder = new TextDecoder('utf-8');
    const htmlContent = decoder.decode(arrayBuffer);
    
    // 处理HTML内容
    const result = processHtmlContent(htmlContent, url);
    
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
        const result = processHtmlContent(message.htmlContent, message.url);
        
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
          message.url
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