// 增强版后台脚本
// 在现有的 background.js 基础上添加新功能

// 全局状态
let state = {
  isSelectionActive: false,
  activeTabId: null,
  selectedLinks: [],
  status: ""
};

const OFFSCREEN_DOCUMENT_PATH = '/src/offscreen/offscreen_enhanced.html';

// 添加处理状态跟踪
let isProcessing = false;

// 在现有的消息监听器中添加新的处理
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Background] 收到消息:', message.type, message);
  
  try {
    switch (message.type) {
      case 'GET_STATE': 
        console.log('[Background] 返回状态:', state);
        sendResponse(state); 
        break;
      case 'TOGGLE_SELECTION_MODE': 
        toggleSelectionMode(message.config).catch(error => {
          console.error('[Background] 切换选择模式失败:', error);
          state.status = '切换模式失败: ' + error.message;
          updatePopupState();
        }); 
        break;
      case 'SWITCH_SELECTION_MODE': 
        handleSwitchSelectionMode(message.mode).catch(error => {
          console.error('[Background] 切换模式失败:', error);
          state.status = '切换模式失败: ' + error.message;
          updatePopupState();
        }); 
        break;
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
      case 'PROCESS_QUEUE': 
        processLinksQueue(message.config).catch(error => {
          console.error('[Background] 处理队列失败:', error);
          state.status = '处理失败: ' + error.message;
          updatePopupState();
        }); 
        break;
      case 'PROCESS_SELECTED_CONTENT': 
        console.log('[Background] 处理选中内容:', message.contentData);
        processSelectedContent(message.contentData, message.config).catch(error => {
          console.error('[Background] 处理选中内容失败:', error);
          state.status = '处理选中内容失败: ' + error.message;
          updatePopupState();
        }); 
        break;
      case 'PROCESS_LINKS_QUEUE':
        console.log('[Background] 处理批量链接队列:', message);
        handleProcessLinksQueue(message);
        break;
      case 'PROCESSING_COMPLETE':
        handleProcessingComplete(message);
        break;
      case 'PROCESSING_ERROR':
        handleProcessingError(message);
        break;
      case 'html-process-result':
        handleHtmlProcessResult(message);
        break;
      case 'html-process-error':
        handleHtmlProcessError(message);
        break;
      default:
        console.warn('[Background] 未知消息类型:', message.type);
    }
  } catch (error) {
    console.error('[Background] 消息处理失败:', error);
    state.status = '操作失败: ' + error.message;
    updatePopupState();
  }
  
  return true;
});

// 新增：处理模式切换
async function handleSwitchSelectionMode(mode) {
  console.log('[Background] 切换选择模式:', mode);
  if (state.activeTabId) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: state.activeTabId },
        func: (mode) => {
          if (window.enhancedSelector) {
            window.enhancedSelector.switchMode(mode);
          }
        },
        args: [mode]
      });
    } catch (error) {
      console.error('[Background] 切换模式失败:', error);
      throw error;
    }
  }
}

// 更新：切换选择模式函数
async function toggleSelectionMode(config = null) {
  console.log('[Background] 切换选择模式, 当前状态:', state.isSelectionActive);
  
  if (state.isSelectionActive) {
    if (state.activeTabId) {
      try {
        await chrome.tabs.reload(state.activeTabId);
      } catch (error) {
        console.error('[Background] 重新加载标签页失败:', error);
        throw error;
      }
    }
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
        
        // 先注入CSS
        try {
          await chrome.scripting.insertCSS({ 
            target: { tabId: tab.id }, 
            files: ['assets/styles/enhanced_styles.css'] 
          });
          console.log('[Background] CSS注入成功');
        } catch (error) {
          console.warn('[Background] 注入CSS失败:', error);
        }
        
        // 再注入脚本
        try {
          await chrome.scripting.executeScript({ 
            target: { tabId: tab.id }, 
            files: ['src/content/content_select_enhanced.js'] 
          });
          console.log('[Background] 脚本注入成功');
        } catch (error) {
          console.error('[Background] 注入脚本失败:', error);
          throw error;
        }
      }
    } catch (error) {
      console.error('[Background] 获取活动标签页失败:', error);
      throw error;
    }
  }
  updatePopupState();
}

// 修复批量链接队列处理函数
async function handleProcessLinksQueue(message) {
  console.log('[Background] 开始处理批量链接队列');
  
  try {
    // 如果消息中包含URL数组，使用它；否则使用state中的链接
    const urls = message.urls || state.selectedLinks;
    const config = message.config || null;
    
    console.log('[Background] 要处理的URL数量:', urls.length);
    console.log('[Background] URL列表:', urls);
    
    if (urls.length === 0) {
      console.log('[Background] 没有URL需要处理');
      state.status = '没有链接需要处理';
      updatePopupState();
      return;
    }
    
    // 更新状态
    state.selectedLinks = urls;
    state.status = `开始处理 ${urls.length} 个链接`;
    updatePopupState();
    
    // 调用现有的处理函数
    await processLinksQueue(config);
    
  } catch (error) {
    console.error('[Background] 处理批量链接队列失败:', error);
    state.status = '批量处理失败: ' + error.message;
    updatePopupState();
  }
}

// 修复 processLinksQueue 函数，添加存储清理
async function processLinksQueue(config = null) {
  if (state.selectedLinks.length === 0) {
    console.log('[Background] 没有链接需要处理');
    return;
  }

  console.log('[Background] 开始处理链接队列，数量:', state.selectedLinks.length);
  
  // 清理旧的存储数据
  console.log('[Background] 清理旧的存储数据');
  await chrome.storage.local.remove(['finalMarkdown', 'originalHtml', 'lastUpdateTime']);

  const totalLinks = state.selectedLinks.length;
  let markdownDocs = [];
  let rawHtmlArray = [];

  for (let i = 0; i < totalLinks; i++) {
    const url = state.selectedLinks[i];
    state.status = `处理中: ${i + 1} / ${totalLinks}`;
    updatePopupState();

    try {
      console.log(`[Background] 处理第 ${i + 1}/${totalLinks} 个链接:`, url);
      
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

      // 使用offscreen处理
      const result = await processUrlInOffscreen(arrayBuffer, contentType, url, config);
      markdownDocs.push(result.markdown);
      rawHtmlArray.push(result.rawHtml || '');
      
    } catch (error) {
      console.error(`[Background] 处理URL失败: ${url}`, error);
      markdownDocs.push(`# 处理失败: ${url}\n\n错误信息: ${error.message}`);
      rawHtmlArray.push('');
    }
  }
  
  // 合并并保存结果
  if (markdownDocs.length > 0) {
    console.log('[Background] 保存处理结果，共', markdownDocs.length, '个文档');
    const finalMarkdown = markdownDocs.join('\n\n---\n\n');
    const combinedRawHtml = rawHtmlArray.join('\n\n<!-- 分隔符 -->\n\n');
    
    await chrome.storage.local.set({
      finalMarkdown: finalMarkdown,
      originalHtml: combinedRawHtml,
      lastUpdateTime: Date.now(),
      processedCount: markdownDocs.length
    });
    
    // 检查是否已有预览页面，如果有则刷新，没有则创建
    const tabs = await chrome.tabs.query({ url: chrome.runtime.getURL('src/display/display.html') });
    if (tabs.length > 0) {
      console.log('[Background] 刷新现有预览页面');
      await chrome.tabs.reload(tabs[0].id, { bypassCache: true });
      await chrome.tabs.update(tabs[0].id, { active: true });
    } else {
      console.log('[Background] 创建新的预览页面');
      await chrome.tabs.create({ url: chrome.runtime.getURL('src/display/display.html') });
    }
  }

  // 重置状态
  state.status = `任务完成！共处理 ${totalLinks} 个链接。`;
  state.selectedLinks = [];
  updatePopupState();
}

// 修复 processSelectedContent 函数，支持处理多个内容
async function processSelectedContent(contentData, config = null) {
  if (isProcessing) {
    console.log('[Background] 已有处理任务在进行中，跳过重复请求');
    return;
  }
  isProcessing = true;
  try {
    if (!contentData || contentData.length === 0) {
      console.log('[Background] 没有选中内容');
      return;
    }

    console.log('[Background] 开始处理选中内容:', contentData.length, '个项目');

    // 新增：清理旧的存储数据
    console.log('[Background] 清理旧的存储数据');
    await chrome.storage.local.remove(['finalMarkdown', 'originalHtml']);

    let markdownDocs = [];
    let rawHtmlArray = [];

    // 修复：处理所有选中的内容，而不是只处理第一个
    for (let i = 0; i < contentData.length; i++) {
      const item = contentData[i];
      console.log(`[Background] 处理第 ${i + 1}/${contentData.length} 个项目:`, item.type);
      
      let markdown = '';
      let rawHtml = '';

      switch (item.type) {
        case 'links':
          if (item.url) {
            console.log('[Background] 处理链接:', item.url);
            try {
              const response = await fetch(item.url, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                  'Cache-Control': 'no-cache'
                }
              });
              
              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }
              
              rawHtml = await response.text();
              const arrayBuffer = new TextEncoder().encode(rawHtml).buffer;
              const contentType = response.headers.get('content-type') || '';
              const result = await processUrlInOffscreen(arrayBuffer, contentType, item.url, config);
              markdown = `# ${result.title || item.url}\n\n${result.markdown}`;
            } catch (error) {
              console.error('[Background] 处理链接失败:', item.url, error);
              markdown = `# 处理失败: ${item.url}\n\n错误信息: ${error.message}`;
              rawHtml = '';
            }
          }
          break;
        case 'text':
          console.log('[Background] 处理文本内容');
          markdown = `# 选中文本 ${i + 1}\n\n${item.content}`;
          rawHtml = item.content;
          break;
        case 'elements':
        case 'area':
          console.log('[Background] 处理元素/区域内容');
          rawHtml = item.content;
          try {
            const result = await processHtmlContent(item.content, config);
            markdown = `# 选中内容 ${i + 1}\n\n${result}`;
          } catch (error) {
            console.error('[Background] 处理HTML内容失败:', error);
            markdown = `# 处理失败: 内容 ${i + 1}\n\n错误信息: ${error.message}`;
          }
          break;
      }

      if (markdown) {
        markdownDocs.push(markdown);
        rawHtmlArray.push(rawHtml);
      }
    }

    // 合并所有处理结果
    if (markdownDocs.length > 0) {
      console.log('[Background] 保存处理结果，共', markdownDocs.length, '个项目');
      const finalMarkdown = markdownDocs.join('\n\n---\n\n');
      const combinedRawHtml = rawHtmlArray.join('\n\n<!-- 分隔符 -->\n\n');
      
      await chrome.storage.local.set({
        finalMarkdown: finalMarkdown,
        originalHtml: combinedRawHtml,
        lastUpdateTime: Date.now(),
        processedCount: markdownDocs.length // 新增：记录处理的项目数量
      });
      
      // 检查是否已有预览页面，如果有则刷新，没有则创建
      const tabs = await chrome.tabs.query({ url: chrome.runtime.getURL('src/display/display.html') });
      if (tabs.length > 0) {
        console.log('[Background] 刷新现有预览页面');
        await chrome.tabs.reload(tabs[0].id, { bypassCache: true });
        await chrome.tabs.update(tabs[0].id, { active: true });
      } else {
        console.log('[Background] 创建新的预览页面');
        await chrome.tabs.create({ url: chrome.runtime.getURL('src/display/display.html') });
      }
    }

    state.status = `任务完成！共处理 ${markdownDocs.length} 个项目。`;
    updatePopupState();
  } catch (error) {
    console.error('[Background] 处理选中内容失败:', error);
    state.status = '处理失败: ' + error.message;
    updatePopupState();
  } finally {
    isProcessing = false;
  }
}

// 新增：处理HTML内容
async function processHtmlContent(htmlContent, config = {}) {
  console.log('[Background] 处理HTML内容，配置:', config);
  
  try {
    await setupOffscreenDocument(OFFSCREEN_DOCUMENT_PATH);
    
    // 发送HTML内容到offscreen处理
    chrome.runtime.sendMessage({
      type: 'process-html-content',
      target: 'offscreen',
      htmlContent: htmlContent,
      config: config
    });

    return new Promise((resolve) => {
      const listener = (message) => {
        if (message.type === 'html-process-result') {
          chrome.runtime.onMessage.removeListener(listener);
          resolve(message.markdown);
        }
      };
      chrome.runtime.onMessage.addListener(listener);
      
      // 设置超时
      setTimeout(() => {
        chrome.runtime.onMessage.removeListener(listener);
        resolve('HTML内容处理超时');
      }, 10000);
    });
  } catch (error) {
    console.error('[Background] 处理HTML内容失败:', error);
    return 'HTML内容处理失败: ' + error.message;
  }
}

// 更新了与 Offscreen 的交互函数
async function processUrlInOffscreen(arrayBuffer, contentType, url, config = {}) {
  console.log('[Background] 处理URL:', url, '配置:', config);
  
  try {
    await setupOffscreenDocument(OFFSCREEN_DOCUMENT_PATH);
    
    // 将 ArrayBuffer 转换为 Uint8Array 以便传递
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // 发送原始二进制数据和响应头到 Offscreen
    chrome.runtime.sendMessage({
      type: 'process-raw-html',
      target: 'offscreen',
      arrayBuffer: Array.from(uint8Array),
      contentType: contentType,
      url: url,
      config: config
    });

    // 等待返回结果
    return new Promise((resolve) => {
      const listener = (message) => {
        if (message.type === 'PROCESSING_COMPLETE' && message.url === url) {
          chrome.runtime.onMessage.removeListener(listener);
          resolve({
            title: url,
            markdown: message.markdown,
            rawHtml: message.rawHtml
          });
        }
      };
      chrome.runtime.onMessage.addListener(listener);
      
      // 设置超时
      setTimeout(() => {
        chrome.runtime.onMessage.removeListener(listener);
        resolve({
          title: '处理超时',
          markdown: '内容处理超时，请重试',
          rawHtml: ''
        });
      }, 30000);
    });
  } catch (error) {
    console.error('[Background] 处理URL失败:', error);
    return {
      title: '处理失败',
      markdown: '处理失败: ' + error.message,
      rawHtml: ''
    };
  }
}

// 新增：处理处理完成消息
function handleProcessingComplete(message) {
  console.log('[Background] 处理完成:', message);
  // 这里可以添加额外的处理逻辑
}

// 新增：处理处理错误消息
function handleProcessingError(message) {
  console.error('[Background] 处理错误:', message);
  state.status = '处理失败: ' + message.error;
  updatePopupState();
}

// 新增：处理HTML处理结果
function handleHtmlProcessResult(message) {
  console.log('[Background] HTML处理结果:', message);
  // 这里可以添加额外的处理逻辑
}

// 新增：处理HTML处理错误
function handleHtmlProcessError(message) {
  console.error('[Background] HTML处理错误:', message);
  state.status = 'HTML处理失败: ' + message.error;
  updatePopupState();
}

// 更新popup状态
function updatePopupState() {
  console.log('[Background] 更新popup状态:', state);
  chrome.runtime.sendMessage({ type: 'STATE_UPDATE', state: state }).catch(err => {
    console.error('[Background] 发送状态更新失败:', err);
  });
}

// Offscreen 文档管理函数
async function setupOffscreenDocument(path) {
  try {
    const existingContexts = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] });
    if (existingContexts.length > 0) {
      console.log('[Background] Offscreen文档已存在');
      return;
    }
    
    console.log('[Background] 创建Offscreen文档:', path);
    await chrome.offscreen.createDocument({
      url: path,
      reasons: ['DOM_PARSER', 'DOM_SCRAPING'],
      justification: 'To parse and convert HTML to Markdown.',
    });
  } catch (error) {
    console.error('[Background] 创建Offscreen文档失败:', error);
    throw error;
  }
}