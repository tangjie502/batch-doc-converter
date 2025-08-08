// 优化版内容选择器 - 无独立弹窗，与主界面集成
(function() {
  'use strict';

  // 防止重复注入
  if (window.optimizedSelectorInjected) {
    console.log('[Content] 优化选择器已存在，跳过重复注入');
    return;
  }
  window.optimizedSelectorInjected = true;

  class OptimizedContentSelector {
    constructor() {
      this.selectedElements = new Set();
      this.selectedLinks = [];
      this.currentMode = 'links';
      this.isSelectionActive = false;
      this.isAreaSelection = false;
      this.selectionStart = null;
      
      // 绑定事件处理器
      this.boundHandleLinkClick = this.handleLinkClick.bind(this);
      this.boundHandleTextClick = this.handleTextClick.bind(this);
      this.boundHandleElementClick = this.handleElementClick.bind(this);
      this.boundHandleAreaStart = this.handleAreaStart.bind(this);
      this.boundHandleAreaMove = this.handleAreaMove.bind(this);
      this.boundHandleAreaEnd = this.handleAreaEnd.bind(this);
      this.boundHandleKeydown = this.handleKeydown.bind(this);
      
      this.init();
    }

    init() {
      this.createStatusIndicator();
      this.setupMessageListener();
      this.addStyles();
      console.log('[Content] 优化版内容选择器已初始化');
    }

    // 创建状态指示器
    createStatusIndicator() {
      const indicator = document.createElement('div');
      indicator.id = 'selection-status-indicator';
      indicator.innerHTML = `
        <div style="
          position: fixed;
          bottom: 20px;
          right: 20px;
          background: rgba(0, 123, 255, 0.9);
          color: white;
          padding: 8px 15px;
          border-radius: 20px;
          font-size: 12px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          z-index: 10000;
          display: none;
          box-shadow: 0 2px 12px rgba(0,0,0,0.3);
          backdrop-filter: blur(10px);
          user-select: none;
          pointer-events: none;
        ">
          <span id="selection-mode-text">链接模式</span> | 
          <span id="selection-count-text">已选择: 0</span>
          <div style="font-size: 10px; opacity: 0.8; margin-top: 2px;">
            按 ESC 退出选择模式
          </div>
        </div>
      `;
      document.body.appendChild(indicator);
    }

    // 消息监听器
    setupMessageListener() {
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log('[Content] 收到消息:', message.type, message);
        
        try {
          switch (message.type) {
            case 'START_SELECTION_MODE':
              this.startSelectionMode();
              sendResponse({ success: true });
              break;
            case 'EXIT_SELECTION_MODE':
              this.exitSelectionMode();
              sendResponse({ success: true });
              break;
            case 'SWITCH_SELECTION_MODE':
              this.switchMode(message.mode);
              sendResponse({ success: true });
              break;
            case 'CLEAR_SELECTION':
              this.clearSelection();
              sendResponse({ success: true });
              break;
            case 'PROCESS_SELECTED_CONTENT':
              // 来自弹窗的请求：收集选中内容并转发给后台处理
              this.processSelectedContentFromPopup(message.config || {});
              sendResponse({ success: true });
              break;
            default:
              console.log('[Content] 未处理的消息类型:', message.type);
              sendResponse({ success: false, error: 'Unknown message type' });
          }
        } catch (error) {
          console.error('[Content] 处理消息失败:', error);
          sendResponse({ success: false, error: error.message });
        }
        
        return true; // 保持消息通道开放
      });
    }

    // 启动选择模式
    startSelectionMode() {
      console.log('[Content] 启动选择模式');
      this.isSelectionActive = true;
      this.showStatusIndicator();
      this.setupLinkSelection(); // 默认链接模式
      this.setupKeyboardEvents();
      this.notifyPopup();
    }

    // 退出选择模式
    exitSelectionMode() {
      console.log('[Content] 退出选择模式');
      this.isSelectionActive = false;
      this.hideStatusIndicator();
      this.removeAllEventListeners();
      this.clearSelection();
      this.removeKeyboardEvents();
      this.notifyPopup();
    }

    // 切换选择模式
    switchMode(mode) {
      if (mode === 'text') {
        console.log('[Content] 文本模式已禁用，保持当前模式:', this.currentMode);
        return;
      }
      if (!this.isSelectionActive) return;
      
      console.log('[Content] 切换到模式:', mode);
      this.currentMode = mode;
      
      // 清空当前选择
      this.clearSelection();
      
      // 移除当前事件监听器
      this.removeAllEventListeners();
      
      // 设置新的事件监听器
      switch (mode) {
        case 'links':
          this.setupLinkSelection();
          break;
        case 'text':
          this.setupTextSelection();
          break;
        case 'elements':
          this.setupElementSelection();
          break;
        case 'area':
          this.setupAreaSelection();
          break;
      }
      
      this.updateStatusIndicator();
    }

    // 显示状态指示器
    showStatusIndicator() {
      const indicator = document.getElementById('selection-status-indicator');
      if (indicator) {
        indicator.firstElementChild.style.display = 'block';
        this.updateStatusIndicator();
      }
    }

    // 隐藏状态指示器
    hideStatusIndicator() {
      const indicator = document.getElementById('selection-status-indicator');
      if (indicator) {
        indicator.firstElementChild.style.display = 'none';
      }
    }

    // 更新状态指示器
    updateStatusIndicator() {
      const modeText = document.getElementById('selection-mode-text');
      const countText = document.getElementById('selection-count-text');
      
      if (modeText && countText) {
        const modeNames = {
          'links': '链接模式',
          'text': '文本模式',
          'elements': '元素模式',
          'area': '区域模式'
        };
        
        modeText.textContent = modeNames[this.currentMode] || this.currentMode;
        countText.textContent = `已选择: ${this.selectedElements.size}`;
      }
    }

    // 设置键盘事件
    setupKeyboardEvents() {
      document.addEventListener('keydown', this.boundHandleKeydown);
    }

    // 移除键盘事件
    removeKeyboardEvents() {
      document.removeEventListener('keydown', this.boundHandleKeydown);
    }

    // 键盘事件处理
    handleKeydown(e) {
      if (e.key === 'Escape' && this.isSelectionActive) {
        e.preventDefault();
        this.exitSelectionMode();
      }
    }

    // 设置链接选择
    setupLinkSelection() {
      const links = document.querySelectorAll('a[href]');
      links.forEach(link => {
        link.addEventListener('click', this.boundHandleLinkClick);
        link.style.cursor = 'pointer';
      });
    }

    // 设置文本选择
    setupTextSelection() {
      document.addEventListener('mouseup', this.boundHandleTextClick);
    }

    // 设置元素选择
    setupElementSelection() {
      const elements = document.querySelectorAll('p, div, span, h1, h2, h3, h4, h5, h6, ul, ol, li, blockquote, pre, code, img, table');
      elements.forEach(element => {
        element.addEventListener('click', this.boundHandleElementClick);
        element.style.cursor = 'pointer';
        element.addEventListener('mouseenter', (e) => {
          if (this.isSelectionActive && this.currentMode === 'elements') {
            e.target.style.outline = '2px dashed #007bff';
          }
        });
        element.addEventListener('mouseleave', (e) => {
          if (this.isSelectionActive && this.currentMode === 'elements' && !this.selectedElements.has(e.target)) {
            e.target.style.outline = '';
          }
        });
      });
    }

    // 设置区域选择
    setupAreaSelection() {
      document.addEventListener('mousedown', this.boundHandleAreaStart);
      document.addEventListener('mousemove', this.boundHandleAreaMove);
      document.addEventListener('mouseup', this.boundHandleAreaEnd);
    }

    // 链接点击处理（仅在按下 Command/Ctrl 时选择链接）
    handleLinkClick(e) {
      const link = e.target.closest('a');
      if (!link) return;

      // 仅在选择模式且为链接模式时响应
      if (!this.isSelectionActive || this.currentMode !== 'links') return;

      const isModifierPressed = e.metaKey || e.ctrlKey; // Mac: Command -> metaKey; Windows/Linux: Ctrl -> ctrlKey
      if (!isModifierPressed) {
        // 未按修饰键：允许正常打开链接
        return;
      }

      // 按下修饰键：阻止默认并切换选择
      e.preventDefault();
      e.stopPropagation();

      if (link && link.href) {
        if (this.selectedElements.has(link)) {
          this.deselectElement(link);
        } else {
          this.selectElement(link);
        }
      }
    }

    // 文本点击处理
    handleTextClick(e) {
      const selection = window.getSelection();
      if (selection.toString().trim()) {
        const range = selection.getRangeAt(0);
        const content = {
          type: 'text',
          text: selection.toString(),
          html: range.cloneContents()
        };
        this.selectedElements.add(content);
        this.updateStatusIndicator();
        this.notifyPopup();
      }
    }

    // 元素点击处理
    handleElementClick(e) {
      e.preventDefault();
      e.stopPropagation();
      
      if (this.selectedElements.has(e.target)) {
        this.deselectElement(e.target);
      } else {
        this.selectElement(e.target);
      }
    }

    // 区域选择开始
    handleAreaStart(e) {
      this.isAreaSelection = true;
      this.selectionStart = { x: e.clientX, y: e.clientY };
    }

    // 区域选择移动
    handleAreaMove(e) {
      if (this.isAreaSelection) {
        // 这里可以添加选择框的可视化
      }
    }

    // 区域选择结束
    handleAreaEnd(e) {
      if (this.isAreaSelection) {
        const endX = e.clientX;
        const endY = e.clientY;
        
        // 选择区域内的元素
        const elementsInArea = this.getElementsInArea(
          this.selectionStart.x, this.selectionStart.y,
          endX, endY
        );
        
        elementsInArea.forEach(element => this.selectElement(element));
        
        this.isAreaSelection = false;
        this.selectionStart = null;
      }
    }

    // 获取区域内的元素
    getElementsInArea(x1, y1, x2, y2) {
      const left = Math.min(x1, x2);
      const right = Math.max(x1, x2);
      const top = Math.min(y1, y2);
      const bottom = Math.max(y1, y2);
      
      const elements = [];
      const allElements = document.querySelectorAll('*');
      
      allElements.forEach(element => {
        const rect = element.getBoundingClientRect();
        if (rect.left >= left && rect.right <= right &&
            rect.top >= top && rect.bottom <= bottom) {
          elements.push(element);
        }
      });
      
      return elements;
    }

    // 选择元素
    selectElement(element) {
      if (this.selectedElements.has(element)) return;
      
      this.selectedElements.add(element);
      element.classList.add('optimized-selected');
      
      // 如果是链接，添加到链接数组
      if (element.tagName === 'A' && element.href) {
        this.selectedLinks.push(element.href);
      }
      
      this.updateStatusIndicator();
      this.notifyPopup();
    }

    // 取消选择元素
    deselectElement(element) {
      this.selectedElements.delete(element);
      element.classList.remove('optimized-selected');
      
      // 如果是链接，从链接数组中移除
      if (element.tagName === 'A' && element.href) {
        const index = this.selectedLinks.indexOf(element.href);
        if (index > -1) {
          this.selectedLinks.splice(index, 1);
        }
      }
      
      this.updateStatusIndicator();
      this.notifyPopup();
    }

    // 清空选择
    clearSelection() {
      this.selectedElements.forEach(element => {
        if (element.classList) {
          element.classList.remove('optimized-selected');
        }
      });
      
      this.selectedElements.clear();
      this.selectedLinks = [];
      this.updateStatusIndicator();
      this.notifyPopup();
    }

    // 从弹窗触发：收集选中内容并通知后台处理
    processSelectedContentFromPopup(config = {}) {
      try {
        const contentData = [];
        let index = 0;

        if (this.currentMode === 'links') {
          // 仅处理已选中的链接元素
          this.selectedElements.forEach(el => {
            if (el && el.tagName === 'A' && el.href) {
              contentData.push({
                type: 'links',
                content: (el.textContent || '').trim(),
                url: el.href,
                element: 'a',
                index: index++
              });
            }
          });
        } else if (this.currentMode === 'text') {
          // 选中文本：selectedElements 中存有对象
          this.selectedElements.forEach(item => {
            if (item && typeof item === 'object' && item.type === 'text') {
              contentData.push({
                type: 'text',
                content: (item.text || '').trim(),
                element: 'text',
                index: index++
              });
            }
          });
        } else if (this.currentMode === 'elements' || this.currentMode === 'area') {
          this.selectedElements.forEach(el => {
            if (el && el.outerHTML) {
              contentData.push({
                type: this.currentMode,
                content: el.outerHTML,
                element: (el.tagName || '').toLowerCase(),
                index: index++
              });
            }
          });
        }

        console.log('[Content] 准备发送选中内容到后台:', contentData);

        if (!contentData.length) {
          console.warn('[Content] 未收集到选中内容');
        }

        chrome.runtime.sendMessage({
          type: 'PROCESS_SELECTED_CONTENT',
          contentData,
          config
        }).catch(err => console.error('[Content] 发送处理选中内容失败:', err));
      } catch (err) {
        console.error('[Content] 处理选中内容（来自弹窗）失败:', err);
      }
    }

    // 移除所有事件监听器
    removeAllEventListeners() {
      // 移除链接事件
      const links = document.querySelectorAll('a[href]');
      links.forEach(link => {
        link.removeEventListener('click', this.boundHandleLinkClick);
        link.style.cursor = '';
      });
      
      // 移除文本事件
      document.removeEventListener('mouseup', this.boundHandleTextClick);
      
      // 移除元素事件
      const elements = document.querySelectorAll('p, div, span, h1, h2, h3, h4, h5, h6, ul, ol, li, blockquote, pre, code, img, table');
      elements.forEach(element => {
        element.removeEventListener('click', this.boundHandleElementClick);
        element.style.cursor = '';
        element.style.outline = '';
      });
      
      // 移除区域事件
      document.removeEventListener('mousedown', this.boundHandleAreaStart);
      document.removeEventListener('mousemove', this.boundHandleAreaMove);
      document.removeEventListener('mouseup', this.boundHandleAreaEnd);
    }

    // 通知弹窗更新
    notifyPopup() {
      chrome.runtime.sendMessage({
        type: 'SELECTION_UPDATED',
        isActive: this.isSelectionActive,
        count: this.selectedElements.size,
        selectedLinks: this.selectedLinks,
        mode: this.currentMode
      }).catch(err => console.log('[Content] 通知弹窗失败:', err));
    }

    // 添加样式
    addStyles() {
      const style = document.createElement('style');
      style.textContent = `
        .optimized-selected {
          outline: 3px solid #28a745 !important;
          outline-offset: 2px !important;
          background-color: rgba(40, 167, 69, 0.1) !important;
          position: relative !important;
        }
        
        .optimized-selected::after {
          content: '✓';
          position: absolute;
          top: -8px;
          right: -8px;
          background: #28a745;
          color: white;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: bold;
          z-index: 10001;
          pointer-events: none;
        }
        
        .optimized-hover {
          outline: 2px dashed #007bff !important;
          outline-offset: 1px !important;
        }
      `;
      style.id = 'optimized-selector-styles';
      document.head.appendChild(style);
    }

    // 移除样式
    removeStyles() {
      const style = document.getElementById('optimized-selector-styles');
      if (style) {
        style.remove();
      }
    }
  }

  // 创建全局实例
  window.optimizedSelector = new OptimizedContentSelector();

})();