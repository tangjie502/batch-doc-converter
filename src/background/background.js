// background.js - 最终健壮版，处理二进制数据

// 全局状态 (保持不变)
let state = {
  isSelectionActive: false,
  activeTabId: null,
  selectedLinks: [],
  status: ""
};

const OFFSCREEN_DOCUMENT_PATH = '/src/offscreen/offscreen.html';

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
      await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ['assets/styles/styles.css'] });
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['src/content/content_select.js'] });
    }
  }
  updatePopupState();
}

function updatePopupState() {
  chrome.runtime.sendMessage({ type: 'STATE_UPDATE', state: state }).catch(err => {});
}


// 更新了与 Offscreen 的交互函数
async function processUrlInOffscreen(arrayBuffer, contentType, url) {
  await setupOffscreenDocument(OFFSCREEN_DOCUMENT_PATH);
  
  // 将 ArrayBuffer 转换为 Uint8Array 以便传递
  const uint8Array = new Uint8Array(arrayBuffer);
  
  // 发送原始二进制数据和响应头到 Offscreen
  chrome.runtime.sendMessage({
    type: 'process-raw-html', // <-- 新的消息类型
    target: 'offscreen',
    arrayBuffer: Array.from(uint8Array), // 转换为普通数组以便序列化
    contentType: contentType,
    url: url
  });

  // 等待返回结果
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

// 更新了 processLinksQueue 函数
async function processLinksQueue() {
  if (state.selectedLinks.length === 0) return;

  const totalLinks = state.selectedLinks.length;
  let markdownDocs = [];

  for (let i = 0; i < totalLinks; i++) {
    const url = state.selectedLinks[i];
    state.status = `处理中: ${i + 1} / ${totalLinks}`;
    updatePopupState();

    try {
      // 添加更完整的请求头来模拟真实浏览器
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"macOS"',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1'
        },
        mode: 'cors',
        credentials: 'omit',
        redirect: 'follow'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
      }
      
      // 检查响应内容类型
      const contentType = response.headers.get('content-type') || '';
      console.log(`[Background] 响应Content-Type: ${contentType}`);
      
      // 获取原始二进制数据
      const arrayBuffer = await response.arrayBuffer();
      console.log(`[Background] 获取到数据大小: ${arrayBuffer.byteLength} bytes`);
      
      if (arrayBuffer.byteLength === 0) {
        throw new Error('获取到的内容为空');
      }
      
      const result = await processUrlInOffscreen(arrayBuffer, contentType, url);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      const pageMarkdown = `# ${result.title}\n\n${result.markdown}`;
      markdownDocs.push(pageMarkdown);

    } catch (error) {
      console.error(`处理 ${url} 失败:`, error);
      markdownDocs.push(`# 处理失败: ${url}\n\n错误信息: ${error.message}\n\n请检查：\n1. 网络连接是否正常\n2. 该网站是否需要登录\n3. 该网站是否有反爬虫机制\n4. 该网站是否支持直接访问`);
    }
  }

  // 合并、存储、打开展示页 (此部分逻辑不变)
  const finalMarkdown = markdownDocs.join('\n\n---\n\n');
  
  // 添加文档头部信息
  const documentHeader = `# 批量文档转换结果

**转换时间：** ${new Date().toLocaleString('zh-CN')}
**处理链接数：** ${totalLinks}
**来源链接：**
${state.selectedLinks.map((url, index) => `${index + 1}. ${url}`).join('\n')}

---

`;
  
  const completeMarkdown = documentHeader + finalMarkdown;
  
  await chrome.storage.local.set({ finalMarkdown: completeMarkdown });
  await chrome.tabs.create({ url: chrome.runtime.getURL('src/display/display.html') });

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