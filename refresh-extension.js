// 强制刷新扩展脚本
// 在浏览器控制台中运行此脚本来强制刷新扩展

console.log('=== 强制刷新扩展脚本 ===');

// 1. 清理存储数据
async function clearStorage() {
  try {
    await chrome.storage.local.clear();
    console.log('✓ 清理本地存储完成');
  } catch (e) {
    console.log('清理本地存储失败:', e);
  }
  
  try {
    await chrome.storage.sync.clear();
    console.log('✓ 清理同步存储完成');
  } catch (e) {
    console.log('清理同步存储失败:', e);
  }
}

// 2. 关闭所有 offscreen 文档
async function closeOffscreenDocuments() {
  try {
    const contexts = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] });
    if (contexts.length > 0) {
      console.log(`发现 ${contexts.length} 个 offscreen 文档，正在关闭...`);
      await chrome.offscreen.closeDocument();
      console.log('✓ 关闭 offscreen 文档完成');
    } else {
      console.log('✓ 没有发现 offscreen 文档');
    }
  } catch (e) {
    console.log('关闭 offscreen 文档失败（可能已被关闭）:', e);
  }
}

// 3. 获取扩展信息
async function getExtensionInfo() {
  try {
    const extension = await chrome.management.getSelf();
    console.log('当前扩展信息:', {
      name: extension.name,
      version: extension.version,
      id: extension.id
    });
  } catch (e) {
    console.log('获取扩展信息失败:', e);
  }
}

// 4. 执行刷新操作
async function forceRefresh() {
  console.log('开始强制刷新扩展...');
  
  await clearStorage();
  await closeOffscreenDocuments();
  await getExtensionInfo();
  
  console.log('\n=== 刷新完成 ===');
  console.log('请在扩展管理页面手动刷新扩展以加载最新代码');
  console.log('访问: chrome://extensions/');
  console.log('找到扩展后点击刷新按钮（🔄）');
}

// 执行刷新
forceRefresh().catch(console.error); 