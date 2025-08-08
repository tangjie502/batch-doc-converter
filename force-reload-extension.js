// 强制刷新扩展脚本
// 在浏览器控制台中运行此脚本来强制刷新扩展

console.log('=== 强制刷新扩展脚本 ===');

// 1. 清理存储
async function clearStorage() {
  try {
    await chrome.storage.local.clear();
    await chrome.storage.sync.clear();
    console.log('✓ 存储已清理');
  } catch (e) {
    console.log('✗ 清理存储失败:', e);
  }
}

// 2. 关闭所有 offscreen 文档
async function closeOffscreenDocuments() {
  try {
    const contexts = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] });
    console.log(`发现 ${contexts.length} 个 offscreen 文档`);
    
    for (const context of contexts) {
      try {
        await chrome.offscreen.closeDocument();
        console.log('✓ 关闭 offscreen 文档成功');
      } catch (e) {
        console.log('✗ 关闭 offscreen 文档失败:', e);
      }
    }
  } catch (e) {
    console.log('✗ 检查 offscreen 文档失败:', e);
  }
}

// 3. 获取扩展信息
async function getExtensionInfo() {
  try {
    const extension = await chrome.management.getSelf();
    console.log('扩展信息:', {
      name: extension.name,
      version: extension.version,
      id: extension.id
    });
  } catch (e) {
    console.log('获取扩展信息失败:', e);
  }
}

// 4. 强制刷新
async function forceRefresh() {
  console.log('开始强制刷新...');
  
  await clearStorage();
  await closeOffscreenDocuments();
  await getExtensionInfo();
  
  console.log('\n=== 刷新完成 ===');
  console.log('请执行以下步骤：');
  console.log('1. 打开 chrome://extensions/');
  console.log('2. 找到你的扩展');
  console.log('3. 点击"刷新"按钮');
  console.log('4. 重新加载当前页面');
  console.log('5. 测试转换功能');
}

// 运行强制刷新
forceRefresh().catch(console.error); 