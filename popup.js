// 获取所有需要操作的 DOM 元素
const toggleBtn = document.getElementById('toggle-selection-btn');
const processBtn = document.getElementById('process-btn');
const linkCountSpan = document.getElementById('link-count');
const statusMessage = document.getElementById('status-message');

// 更新UI的函数
function updateUI(state) {
  // 更新链接数量
  const count = state.selectedLinks ? state.selectedLinks.length : 0;
  linkCountSpan.textContent = count;

  // 根据是否在选择模式中，更新“开始/停止”按钮的样式和文字
  if (state.isSelectionActive) {
    toggleBtn.textContent = '停止选择链接';
    toggleBtn.classList.add('active');
  } else {
    toggleBtn.textContent = '开始选择链接';
    toggleBtn.classList.remove('active');
  }

  // 如果链接数量大于0，则启用“处理”按钮
  if (count > 0) {
    processBtn.disabled = false;
  } else {
    processBtn.disabled = true;
  }
  
  // 更新状态消息
  statusMessage.textContent = state.status || '';
}

// ---- 事件监听器 ----

// 1. 监听“开始/停止选择”按钮的点击
toggleBtn.addEventListener('click', () => {
  // 发送消息给 background.js，请求切换选择模式
  chrome.runtime.sendMessage({ type: 'TOGGLE_SELECTION_MODE' });
});

// 2. 监听“处理并下载”按钮的点击
processBtn.addEventListener('click', () => {
  // 发送消息给 background.js，请求开始处理队列
  chrome.runtime.sendMessage({ type: 'PROCESS_QUEUE' });
  // 显示处理中状态
  statusMessage.textContent = '正在处理中，请稍候...';
  processBtn.disabled = true;
  toggleBtn.disabled = true;
});

// 3. 监听从 background.js 发来的消息，用于实时更新UI
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'STATE_UPDATE') {
    updateUI(message.state);
  }
});

// ---- 初始化 ----

// 当 popup 打开时，立即向 background.js 请求当前的状态
// 以便正确显示UI（例如，如果已经处于选择模式，按钮应显示“停止选择”）
document.addEventListener('DOMContentLoaded', () => {
  chrome.runtime.sendMessage({ type: 'GET_STATE' }, (response) => {
    if (chrome.runtime.lastError) {
      // 如果 background 还没准备好，可能会报错，可以忽略或稍后重试
      console.warn("Could not get initial state:", chrome.runtime.lastError.message);
      updateUI({isSelectionActive: false, selectedLinks: []});
    } else {
      updateUI(response);
    }
  });
});