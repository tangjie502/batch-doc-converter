// 右键上下文菜单管理 - 基于 MarkSnip 优化
class ContextMenuManager {
  constructor() {
    this.menuItems = [];
  }

  // 创建所有菜单项
  async createMenus() {
    const options = await getOptions();

    // 清除现有菜单
    await this.clearMenus();

    if (!options.contextMenus) {
      return;
    }

    try {
      // 下载操作菜单
      await this.createMenuItem({
        id: "download-markdown-selection",
        title: "下载选中内容为 Markdown",
        contexts: ["selection"]
      });

      await this.createMenuItem({
        id: "download-markdown-page",
        title: "下载整个页面为 Markdown",
        contexts: ["page", "frame"]
      });

      await this.createMenuItem({
        id: "separator-1",
        type: "separator",
        contexts: ["page", "frame", "selection"]
      });

      // 复制操作菜单
      await this.createMenuItem({
        id: "copy-markdown-selection",
        title: "复制选中内容为 Markdown",
        contexts: ["selection"]
      });

      await this.createMenuItem({
        id: "copy-markdown-page",
        title: "复制整个页面为 Markdown",
        contexts: ["page", "frame"]
      });

      await this.createMenuItem({
        id: "separator-2",
        type: "separator",
        contexts: ["page", "frame", "selection"]
      });

      // 链接操作菜单
      await this.createMenuItem({
        id: "copy-link-as-markdown",
        title: "复制链接为 Markdown 格式",
        contexts: ["link"]
      });

      await this.createMenuItem({
        id: "download-link-as-markdown",
        title: "下载链接页面为 Markdown",
        contexts: ["link"]
      });

      await this.createMenuItem({
        id: "separator-3",
        type: "separator",
        contexts: ["page", "frame"]
      });

      // 批量操作菜单
      await this.createMenuItem({
        id: "download-all-tabs",
        title: "下载所有标签页为 Markdown",
        contexts: ["page", "frame"]
      });

      await this.createMenuItem({
        id: "separator-4",
        type: "separator",
        contexts: ["page", "frame"]
      });

      // 配置选项
      await this.createMenuItem({
        id: "toggle-include-template",
        type: "checkbox",
        title: "包含模板信息",
        contexts: ["page", "frame"],
        checked: options.includeTemplate
      });

      await this.createMenuItem({
        id: "toggle-download-images",
        type: "checkbox",
        title: "下载图片",
        contexts: ["page", "frame"],
        checked: options.downloadImages
      });

      console.log('[ContextMenu] 菜单创建完成');
    } catch (error) {
      console.error('[ContextMenu] 创建菜单失败:', error);
    }
  }

  // 创建单个菜单项
  async createMenuItem(menuItem) {
    return new Promise((resolve) => {
      chrome.contextMenus.create(menuItem, () => {
        if (chrome.runtime.lastError) {
          console.warn('[ContextMenu] 创建菜单项失败:', chrome.runtime.lastError.message);
        } else {
          this.menuItems.push(menuItem.id);
        }
        resolve();
      });
    });
  }

  // 清除所有菜单
  async clearMenus() {
    return new Promise((resolve) => {
      chrome.contextMenus.removeAll(() => {
        this.menuItems = [];
        resolve();
      });
    });
  }

  // 处理菜单点击事件
  async handleMenuClick(info, tab) {
    console.log('[ContextMenu] 菜单点击:', info.menuItemId);

    try {
      switch (info.menuItemId) {
        case "download-markdown-selection":
          await this.downloadSelection(tab, info);
          break;
        case "download-markdown-page":
          await this.downloadPage(tab);
          break;
        case "copy-markdown-selection":
          await this.copySelection(tab, info);
          break;
        case "copy-markdown-page":
          await this.copyPage(tab);
          break;
        case "copy-link-as-markdown":
          await this.copyLinkAsMarkdown(info);
          break;
        case "download-link-as-markdown":
          await this.downloadLinkAsMarkdown(info);
          break;
        case "download-all-tabs":
          await this.downloadAllTabs();
          break;
        case "toggle-include-template":
          await this.toggleOption('includeTemplate', info.checked);
          break;
        case "toggle-download-images":
          await this.toggleOption('downloadImages', info.checked);
          break;
      }
    } catch (error) {
      console.error('[ContextMenu] 处理菜单点击失败:', error);
    }
  }

  // 下载选中内容
  async downloadSelection(tab, info) {
    // 发送消息给 background 脚本处理
    chrome.runtime.sendMessage({
      type: 'CONTEXT_MENU_ACTION',
      action: 'download_selection',
      tabId: tab.id,
      selectionText: info.selectionText
    });
  }

  // 下载整个页面
  async downloadPage(tab) {
    chrome.runtime.sendMessage({
      type: 'CONTEXT_MENU_ACTION',
      action: 'download_page',
      tabId: tab.id
    });
  }

  // 复制选中内容
  async copySelection(tab, info) {
    chrome.runtime.sendMessage({
      type: 'CONTEXT_MENU_ACTION',
      action: 'copy_selection',
      tabId: tab.id,
      selectionText: info.selectionText
    });
  }

  // 复制整个页面
  async copyPage(tab) {
    chrome.runtime.sendMessage({
      type: 'CONTEXT_MENU_ACTION',
      action: 'copy_page',
      tabId: tab.id
    });
  }

  // 复制链接为 Markdown 格式
  async copyLinkAsMarkdown(info) {
    const markdownLink = `[${info.linkText || info.linkUrl}](${info.linkUrl})`;
    await this.copyToClipboard(markdownLink);
  }

  // 下载链接页面
  async downloadLinkAsMarkdown(info) {
    chrome.runtime.sendMessage({
      type: 'CONTEXT_MENU_ACTION',
      action: 'download_link',
      url: info.linkUrl
    });
  }

  // 下载所有标签页
  async downloadAllTabs() {
    chrome.runtime.sendMessage({
      type: 'CONTEXT_MENU_ACTION',
      action: 'download_all_tabs'
    });
  }

  // 切换配置选项
  async toggleOption(optionName, value) {
    const options = await getOptions();
    options[optionName] = value;
    await saveOptions(options);
  }

  // 复制到剪贴板
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      console.log('[ContextMenu] 已复制到剪贴板');
    } catch (error) {
      console.error('[ContextMenu] 复制到剪贴板失败:', error);
    }
  }
}

// 全局实例
const contextMenuManager = new ContextMenuManager();