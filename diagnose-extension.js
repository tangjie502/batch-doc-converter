// 扩展诊断脚本
// 在浏览器控制台中运行此脚本来诊断扩展问题

console.log('=== 扩展诊断脚本 ===');

// 1. 检查扩展状态
async function checkExtensionStatus() {
  try {
    const extension = await chrome.management.getSelf();
    console.log('✓ 扩展信息:', {
      name: extension.name,
      version: extension.version,
      id: extension.id,
      enabled: extension.enabled
    });
  } catch (e) {
    console.error('✗ 获取扩展信息失败:', e);
  }
}

// 2. 检查 offscreen 文档
async function checkOffscreenDocuments() {
  try {
    const contexts = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] });
    console.log(`✓ 发现 ${contexts.length} 个 offscreen 文档`);
    contexts.forEach((context, index) => {
      console.log(`  ${index + 1}. ${context.contextId}`);
    });
  } catch (e) {
    console.error('✗ 检查 offscreen 文档失败:', e);
  }
}

// 3. 检查存储数据
async function checkStorage() {
  try {
    const localData = await chrome.storage.local.get();
    const syncData = await chrome.storage.sync.get();
    console.log('✓ 本地存储数据:', Object.keys(localData));
    console.log('✓ 同步存储数据:', Object.keys(syncData));
  } catch (e) {
    console.error('✗ 检查存储失败:', e);
  }
}

// 4. 测试消息传递
async function testMessagePassing() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_STATE' });
    console.log('✓ 消息传递测试成功:', response);
  } catch (e) {
    console.error('✗ 消息传递测试失败:', e);
  }
}

// 5. 检查内容脚本
function checkContentScript() {
  const selector = document.getElementById('selection-status-indicator');
  if (selector) {
    console.log('✓ 内容脚本已注入');
  } else {
    console.log('✗ 内容脚本未注入');
  }
}

// 6. 检查 Turndown 库
function checkTurndownLibrary() {
  if (typeof TurndownService !== 'undefined') {
    console.log('✓ TurndownService 可用');
  } else {
    console.log('✗ TurndownService 不可用');
  }
  
  if (typeof turndownPluginGfm !== 'undefined') {
    console.log('✓ turndownPluginGfm 可用');
  } else {
    console.log('✗ turndownPluginGfm 不可用');
  }
}

// 7. 检查 highlight.js
function checkHighlightJS() {
  if (typeof hljs !== 'undefined') {
    console.log('✓ highlight.js 可用');
  } else {
    console.log('✗ highlight.js 不可用');
  }
}

// 8. 检查默认选项
function checkDefaultOptions() {
  if (typeof defaultOptions !== 'undefined') {
    console.log('✓ defaultOptions 可用:', {
      headingStyle: defaultOptions.headingStyle,
      tableFormatting: defaultOptions.tableFormatting
    });
  } else {
    console.log('✗ defaultOptions 不可用');
  }
}

// 执行诊断
async function runDiagnosis() {
  console.log('开始诊断...\n');
  
  await checkExtensionStatus();
  await checkOffscreenDocuments();
  await checkStorage();
  await testMessagePassing();
  
  checkContentScript();
  checkTurndownLibrary();
  checkHighlightJS();
  checkDefaultOptions();
  
  console.log('\n=== 诊断完成 ===');
  console.log('如果发现问题，请：');
  console.log('1. 在 chrome://extensions/ 中刷新扩展');
  console.log('2. 重新加载当前页面');
  console.log('3. 再次运行诊断脚本');
}

// 运行诊断
runDiagnosis().catch(console.error); 