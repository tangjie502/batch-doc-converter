console.log('[Offscreen] offscreen_enhanced.js 已加载');

// 初始化 Turndown 转换器
let turndownService = null;

// 初始化转换器
function initTurndownService() {
  if (typeof TurndownService !== 'undefined') {
    turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      emDelimiter: '*'
    });
    
    // 添加 GFM 插件
    if (typeof turndownGfm !== 'undefined') {
      turndownService.use(turndownGfm.gfm);
    }
    
    console.log('[Offscreen] TurndownService 已初始化');
  } else {
    console.error('[Offscreen] TurndownService 未定义');
  }
}

// 预处理HTML内容
function preprocessHtml(htmlContent, config = {}) {
  console.log('[Offscreen] 预处理HTML内容，配置:', config);
  
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;
  
  // 根据配置处理图片
  if (config.contentProcessing && config.contentProcessing.extractImages === false) {
    console.log('[Offscreen] 移除图片元素');
    // 移除所有图片元素
    const images = tempDiv.querySelectorAll('img');
    images.forEach(img => {
      // 可以选择完全移除或者替换为文本描述
      const altText = img.alt || img.title || '图片';
      const textNode = document.createTextNode(`[${altText}]`);
      img.parentNode.replaceChild(textNode, img);
    });
  }
  
  // 根据配置处理其他内容
  if (config.contentExtraction) {
    // 展开折叠内容
    if (config.contentExtraction.expandCollapsed) {
      const collapsedElements = tempDiv.querySelectorAll('[style*="display: none"], [hidden], .collapsed, .hidden');
      collapsedElements.forEach(el => {
        el.style.display = '';
        el.removeAttribute('hidden');
        el.classList.remove('collapsed', 'hidden');
      });
    }
    
    // 移除干扰元素
    if (config.contentExtraction.removeNoise) {
      const noiseSelectors = [
        'script', 'style', 'noscript', 'iframe', 'embed', 'object',
        '.ad', '.advertisement', '.banner', '.sidebar', '.footer',
        '.header', '.nav', '.navigation', '.menu', '.toolbar'
      ];
      noiseSelectors.forEach(selector => {
        const elements = tempDiv.querySelectorAll(selector);
        elements.forEach(el => el.remove());
      });
    }
  }
  
  return tempDiv.innerHTML;
}

// 处理HTML内容转换为Markdown
function processHtmlContent(htmlContent, config = {}) {
  console.log('[Offscreen] 处理HTML内容');
  
  if (!turndownService) {
    initTurndownService();
  }
  
  try {
    // 预处理HTML内容
    const processedHtml = preprocessHtml(htmlContent, config);
    
    // 创建临时DOM元素来解析HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = processedHtml;
    
    // 使用Turndown转换HTML为Markdown
    const markdown = turndownService.turndown(tempDiv);
    
    console.log('[Offscreen] HTML转换完成');
    return markdown;
  } catch (error) {
    console.error('[Offscreen] HTML转换失败:', error);
    return `转换失败: ${error.message}`;
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
    const markdown = processHtmlContent(htmlContent, config);
    
    console.log('[Offscreen] 原始HTML处理完成');
    return markdown;
  } catch (error) {
    console.error('[Offscreen] 原始HTML处理失败:', error);
    return `处理失败: ${error.message}`;
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
        const markdown = processHtmlContent(message.htmlContent, message.config || {});
        
        // 发送结果回background
        chrome.runtime.sendMessage({
          type: 'html-process-result',
          markdown: markdown
        });
        
        sendResponse({ success: true });
        break;
        
      case 'process-raw-html':
        console.log('[Offscreen] 处理原始HTML消息');
        const result = processRawHtml(
          new Uint8Array(message.arrayBuffer), 
          message.contentType, 
          message.url,
          message.config || {}
        );
        
        // 发送结果回background
        chrome.runtime.sendMessage({
          type: 'PROCESSING_COMPLETE',
          url: message.url,
          markdown: result
        });
        
        sendResponse({ success: true });
        break;
        
      case 'PROCESS_URL':
        // 保持向后兼容
        sendResponse({ success: true, data: `已处理: ${message.url}` });
        break;
        
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