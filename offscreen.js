// offscreen.js - 全新版本，负责解析和转换

// 只有在 TurndownService 加载后才进行初始化
if (typeof TurndownService !== 'undefined') {
  const turndownService = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
  chrome.runtime.onMessage.addListener(handleMessages);

  function handleMessages(message) {
    if (message.target !== 'offscreen' || message.type !== 'process-html') {
      return;
    }

    // 1. 使用 DOMParser 解析 HTML 字符串
    const doc = new DOMParser().parseFromString(message.html, 'text/html');
    const title = doc.querySelector('title')?.textContent || message.url;
    
    // 2. 提取主要内容
    const mainContentElement = doc.querySelector('article, main, [role="main"], .content, .post-content');
    
    // 如果找不到主要内容，就用整个 body 作为回退
    const contentNode = mainContentElement ? mainContentElement : doc.body;

    // 3. 在这里进行 Turndown 转换！
    const markdownContent = turndownService.turndown(contentNode);
    
    // 4. 将最终处理好的标题和 Markdown 内容发送回 background.js
    chrome.runtime.sendMessage({
      type: 'process-result',
      title: title,
      markdown: markdownContent
    });
  }
} else {
  console.error("TurndownService not loaded in offscreen document.");
}