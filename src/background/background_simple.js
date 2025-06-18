// 简化版后台脚本用于测试
let state = {
  isSelectionActive: false,
  activeTabId: null,
  selectedLinks: [],
  status: ""
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Background] 收到消息:', message.type);
  
  switch (message.type) {
    case 'GET_STATE': 
      console.log('[Background] 返回状态:', state);
      sendResponse(state); 
      break;
    case 'TOGGLE_SELECTION_MODE': 
      console.log('[Background] 切换选择模式');
      toggleSelectionMode(); 
      break;
    case 'PROCESS_QUEUE': 
      console.log('[Background] 处理队列');
      processQueue(); 
      break;
  }
  return true;
});

async function toggleSelectionMode() {
  console.log('[Background] 切换选择模式, 当前状态:', state.isSelectionActive);
  
  if (state.isSelectionActive) {
    state.isSelectionActive = false;
    state.activeTabId = null;
    state.selectedLinks = [];
    state.status = "";
  } else {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) {
        state.isSelectionActive = true;
        state.activeTabId = tab.id;
        state.status = "选择模式已激活";
        
        // 注入简单的选择脚本
        await chrome.scripting.executeScript({ 
          target: { tabId: tab.id }, 
          files: ['src/content/content_select.js'] 
        });
      }
    } catch (error) {
      console.error('[Background] 获取活动标签页失败:', error);
    }
  }
  updatePopupState();
}

async function processQueue() {
  if (state.selectedLinks.length === 0) {
    state.status = "没有选中的链接";
    updatePopupState();
    return;
  }

  state.status = `处理中: ${state.selectedLinks.length} 个链接`;
  updatePopupState();
  
  // 简单的处理逻辑
  const markdown = `# 处理结果\n\n共处理 ${state.selectedLinks.length} 个链接:\n\n${state.selectedLinks.map((url, index) => `${index + 1}. ${url}`).join('\n')}`;
  
  await chrome.storage.local.set({ finalMarkdown: markdown });
  await chrome.tabs.create({ url: chrome.runtime.getURL('src/display/display.html') });
  
  state.status = "处理完成";
  state.isSelectionActive = false;
  state.activeTabId = null;
  state.selectedLinks = [];
  updatePopupState();
}

function updatePopupState() {
  console.log('[Background] 更新popup状态:', state);
  chrome.runtime.sendMessage({ type: 'STATE_UPDATE', state: state }).catch(err => {
    console.error('[Background] 发送状态更新失败:', err);
  });
}

console.log('[Background] Service Worker 已启动'); 