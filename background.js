// background.js - 再次重构版

// 不再需要导入和初始化 TurndownService！
// let turndownService; ... (这部分相关的代码都删掉)

// 全局状态 (保持不变)
let state = {
  isSelectionActive: false,
  activeTabId: null,
  selectedLinks: [],
  status: ""
};

const OFFSCREEN_DOCUMENT_PATH = '/offscreen.html';

// 主消息监听器 (保持不变)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'GET_STATE': sendResponse(state); break;
    case 'TOGGLE_SELECTION_MODE': toggleSelectionMode(); break;
    case 'ADD_LINK':
      if (message.url && !state.selectedLinks.includes(message.url)) {
        state.selectedLinks.push(message.url);
        updatePopupState();
      }
      break;
    case 'REMOVE_LINK':
      state.selectedLinks = state.selectedLinks.filter(url => url !== message.url);
      updatePopupState();
      break;
    case 'PROCESS_QUEUE': processLinksQueue(); break;
  }
  return true;
});

// toggleSelectionMode, updatePopupState 函数保持不变
async function toggleSelectionMode() {
  if (state.isSelectionActive) {
    if (state.activeTabId) chrome.tabs.reload(state.activeTabId);
    state.isSelectionActive = false;
    state.activeTabId = null;
    state.selectedLinks = [];
    state.status = "";
  } else {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      state.isSelectionActive = true;
      state.activeTabId = tab.id;
      await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ['styles.css'] });
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content_select.js'] });
    }
  }
  updatePopupState();
}

function updatePopupState() {
  chrome.runtime.sendMessage({ type: 'STATE_UPDATE', state: state }).catch(err => {});
}


// 重命名并简化了与 Offscreen 的交互函数
async function processUrlInOffscreen(html, url) {
  await setupOffscreenDocument(OFFSCREEN_DOCUMENT_PATH);
  
  // 发送 HTML 到 Offscreen 文档进行处理
  chrome.runtime.sendMessage({
    type: 'process-html',
    target: 'offscreen',
    html: html,
    url: url
  });

  // 等待 Offscreen 返回最终的 Markdown 结果
  return new Promise((resolve) => {
    const listener = (message) => {
      if (message.type === 'process-result') {
        chrome.runtime.onMessage.removeListener(listener);
        resolve(message);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
  });
}

// 最终简化的 processLinksQueue 函数
async function processLinksQueue() {
  if (state.selectedLinks.length === 0) return;

  const totalLinks = state.selectedLinks.length;
  let markdownDocs = [];

  for (let i = 0; i < totalLinks; i++) {
    const url = state.selectedLinks[i];
    state.status = `处理中: ${i + 1} / ${totalLinks}`;
    updatePopupState();

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const htmlText = await response.text();
      
      // 调用 Offscreen 文档处理并直接获取最终结果
      const result = await processUrlInOffscreen(htmlText, url);
      
      const pageMarkdown = `# ${result.title}\n\n${result.markdown}`;
      markdownDocs.push(pageMarkdown);

    } catch (error) {
      console.error(`处理 ${url} 失败:`, error);
      markdownDocs.push(`# 处理失败: ${url}\n\n错误信息: ${error.message}`);
    }
  }

  // 合并并存储最终结果 (此部分逻辑不变)
  const finalMarkdown = markdownDocs.join('\n\n---\n\n');
  await chrome.storage.local.set({ finalMarkdown: finalMarkdown });
  await chrome.tabs.create({ url: chrome.runtime.getURL('display.html') });

  // 重置状态 (此部分逻辑不变)
  state.status = `任务完成！共处理 ${totalLinks} 个链接。`;
  if (state.activeTabId) chrome.tabs.reload(state.activeTabId);
  state.isSelectionActive = false;
  state.activeTabId = null;
  state.selectedLinks = [];
  updatePopupState();
}


// Offscreen 文档管理函数 (保持不变)
async function setupOffscreenDocument(path) {
  const existingContexts = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] });
  if (existingContexts.length > 0) return;
  await chrome.offscreen.createDocument({
    url: path,
    reasons: ['DOM_PARSER', 'DOM_SCRAPING'],
    justification: 'To parse and convert HTML to Markdown.',
  });
}