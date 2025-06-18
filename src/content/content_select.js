// 使用“立即调用函数表达式”(IIFE) 来避免污染目标网页的全局作用域
(() => {
  // 设置一个标记，防止脚本被重复注入执行
  if (window.isLinkSelectorInjected) {
    return;
  }
  window.isLinkSelectorInjected = true;

  /**
   * 核心的点击事件处理函数
   * @param {MouseEvent} event
   */
  const clickHandler = (event) => {
    // 使用 .closest('a') 确保即使用户点击了链接内部的文字或图标，我们也能找到链接本身
    const linkElement = event.target.closest('a');

    //如果点击的不是链接，就什么也不做
    if (!linkElement) {
      return;
    }

    // --- 核心魔法在这里 ---
    // 1. 阻止链接的默认跳转行为
    event.preventDefault();
    // 2. 阻止事件继续传播，以防页面上其他脚本响应这个点击
    event.stopPropagation();

    // 3. 切换高亮样式。如果类已存在，则移除并返回false；如果不存在，则添加并返回true。
    const isNowSelected = linkElement.classList.toggle('link-selected-by-extension');

    if (isNowSelected) {
      // 如果是“选中”状态，发送 'ADD_LINK' 消息给后台
      // 注意：使用 linkElement.href 可以获取完整的绝对URL，这比 getAttribute('href') 更可靠
      chrome.runtime.sendMessage({
        type: 'ADD_LINK',
        url: linkElement.href
      });
    } else {
      // 如果是“取消选中”状态，发送 'REMOVE_LINK' 消息给后台
      chrome.runtime.sendMessage({
        type: 'REMOVE_LINK',
        url: linkElement.href
      });
    }
  };

  // 将我们的点击处理器添加到整个文档上
  // 使用捕获阶段 (true) 可以让我们比页面上大多数其他脚本更早地处理点击事件
  document.addEventListener('click', clickHandler, true);

})();