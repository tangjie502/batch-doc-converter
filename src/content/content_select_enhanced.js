// 增强版内容选择器
(function() {
  'use strict';

  // 添加防止重复注入的检查
  if (window.enhancedSelectorInjected) {
    console.log('[Content] 增强选择器已存在，跳过重复注入');
    return;
  }
  window.enhancedSelectorInjected = true;

  // 添加本地状态管理
  const localState = {
    selectedLinks: [],
    status: ''
  };

  class EnhancedContentSelector {
    constructor() {
      this.selectedElements = new Set();
      this.currentMode = 'links';
      this.isAreaSelection = false;
      this.selectionStart = null;
      this.config = this.getDefaultConfig();
      this.isSelectionActive = false; // 添加选择状态标记
      
      // 绑定事件处理器，避免bind()问题
      this.boundHandleLinkClick = this.handleLinkClick.bind(this);
      this.boundHandleTextClick = this.handleTextClick.bind(this);
      this.boundHandleElementClick = this.handleElementClick.bind(this);
      this.boundHandleAreaStart = this.handleAreaStart.bind(this);
      this.boundHandleAreaMove = this.handleAreaMove.bind(this);
      this.boundHandleAreaEnd = this.handleAreaEnd.bind(this);
      
      this.init();
    }

    async init() {
      // 不再创建独立的选择器UI，改为轻量级的状态指示器
      this.createStatusIndicator();
      this.setupMessageListener();
      this.addStyles();
      // 默认不启动选择模式，等待来自弹窗的指令
      console.log('[Content] 增强内容选择器已初始化');
    }

    getDefaultConfig() {
      return {
        contentProcessing: {
          smartDecoding: true,
          markdownCleaning: true,
          preserveFormatting: true,
          extractImages: true
        },
        performance: {
          batchSize: 5,
          timeout: 30,
          retryAttempts: 3
        },
        contentExtraction: {
          expandCollapsed: true,
          processLazyLoaded: true,
          removeNoise: true,
          extractHiddenContent: true
        }
      };
    }

    createStatusIndicator() {
      // 创建轻量级的状态指示器，而不是完整的UI面板
      const indicator = document.createElement('div');
      indicator.id = 'selection-status-indicator';
      indicator.innerHTML = `
        <div style="
          position: fixed;
          bottom: 20px;
          right: 20px;
          background: rgba(0, 123, 255, 0.9);
          color: white;
          padding: 10px 15px;
          border-radius: 25px;
          font-size: 12px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          z-index: 10000;
          display: none;
          box-shadow: 0 3px 12px rgba(0,0,0,0.3);
          backdrop-filter: blur(10px);
          max-width: 280px;
          line-height: 1.4;
        ">
          <div style="font-weight: bold; margin-bottom: 4px;">
            🔗 <span id="selection-mode-text">链接选择模式</span>
          </div>
          <div style="font-size: 11px; opacity: 0.9;">
            ${navigator.platform.includes('Mac') ? 'Command' : 'Ctrl'} + 点击选择 | <span id="selection-count-text">已选择: 0</span>
          </div>
        </div>
      `;
      document.body.appendChild(indicator);
    }

    setupKeyboardEvents() {
      // ESC键退出选择模式
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.isSelectionActive) {
          this.exitSelectionMode();
        }
      });
    }

    switchMode(mode) {
      this.currentMode = mode;
      
      // 清空当前选择
      this.clearSelection();

      // 移除所有事件监听器
      this.removeAllEventListeners();

      // 根据模式设置事件监听器
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
      
      // 更新状态指示器
      if (this.isSelectionActive) {
        this.updateStatusIndicator();
      }
    }

    removeAllEventListeners() {
      console.log('[Content] 移除所有事件监听器');
      
      // 移除链接选择相关的事件监听器
      document.removeEventListener('click', this.boundHandleLinkClick, { capture: true });
      window.removeEventListener('click', this.boundHandleLinkClick, { capture: true });
      
      // 移除其他事件监听器
      document.removeEventListener('click', this.boundHandleTextClick, true);
      document.removeEventListener('click', this.boundHandleElementClick, true);
      document.removeEventListener('mousedown', this.boundHandleAreaStart);
      document.removeEventListener('mousemove', this.boundHandleAreaMove);
      document.removeEventListener('mouseup', this.boundHandleAreaEnd);
      
      console.log('[Content] 所有事件监听器移除完成');
    }

    setupLinkSelection() {
      console.log('[Content] 设置链接选择事件监听器');
      
      // 添加全局click监听器，最高优先级，在文档级别捕获
      this.setupGlobalClickListener();
      
      console.log('[Content] 链接选择事件监听器设置完成');
    }
    
    setupGlobalClickListener() {
      console.log('[Content] 设置全局点击监听器');
      
      // 在 document 上设置最高优先级的点击监听器
      document.addEventListener('click', this.boundHandleLinkClick, { 
        capture: true, 
        passive: false 
      });
      
      // 同时在 window 上设置备用监听器
      window.addEventListener('click', this.boundHandleLinkClick, { 
        capture: true, 
        passive: false 
      });
      
      console.log('[Content] 全局点击监听器设置完成');
    }

    setupTextSelection() {
      // 使用绑定的函数引用
      document.addEventListener('click', this.boundHandleTextClick, true);
    }

    setupElementSelection() {
      // 使用绑定的函数引用
      document.addEventListener('click', this.boundHandleElementClick, true);
    }

    setupAreaSelection() {
      // 使用绑定的函数引用
      document.addEventListener('mousedown', this.boundHandleAreaStart);
      document.addEventListener('mousemove', this.boundHandleAreaMove);
      document.addEventListener('mouseup', this.boundHandleAreaEnd);
    }

    handleLinkClick(event) {
      // 立即记录所有关键信息
      console.log('=== [Content] 链接点击事件触发 ===');
      console.log('[Content] 事件类型:', event.type);
      console.log('[Content] 选择模式状态:', this.isSelectionActive);
      console.log('[Content] 事件目标:', event.target.tagName, event.target.className);
      console.log('[Content] 修饰键状态:', {
        metaKey: event.metaKey,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey
      });
      
      if (!this.isSelectionActive) {
        console.log('[Content] ⚠️ 选择模式未激活，跳过处理');
        return;
      }
      
      const link = event.target.closest('a');
      if (!link) {
        console.log('[Content] ⚠️ 未找到链接元素，事件目标:', event.target);
        return;
      }
      
      console.log('[Content] 🔗 找到链接:', link.href);
      
      // 检测修饰键：Mac的Command键(metaKey)或Windows的Ctrl键(ctrlKey)
      const isModifierPressed = event.metaKey || event.ctrlKey;
      console.log('[Content] 🔑 修饰键检测结果:', isModifierPressed);
      
      if (isModifierPressed) {
        // 按下修饰键时：选择链接，阻止默认行为
        console.log('[Content] ✅ 检测到修饰键，执行链接选择操作');
        console.log('[Content] 🚫 开始阻止默认行为...');
        
        // 立即阻止所有默认行为
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        
        // 添加额外的阻止措施
        if (event.returnValue !== undefined) {
          event.returnValue = false;
        }
        
        console.log('[Content] 🎯 开始切换链接选择状态');
        this.toggleElementSelection(link);
        console.log('[Content] ✅ 链接选择操作完成');
        
        return false;
      } else {
        // 没有按修饰键时：允许正常打开链接
        console.log('[Content] ➡️ 未检测到修饰键，允许正常打开链接:', link.href);
        console.log('[Content] 🔄 不阻止默认行为，链接将正常打开');
        // 不阻止默认行为，链接会正常打开
        return;
      }
    }

    handleTextClick(event) {
      const textElement = event.target;
      if (textElement.tagName === 'A' || textElement.closest('a')) return;
      
      event.preventDefault();
      event.stopPropagation();
      
      this.toggleElementSelection(textElement);
    }

    handleElementClick(event) {
      event.preventDefault();
      event.stopPropagation();
      
      this.toggleElementSelection(event.target);
    }

    handleAreaStart(event) {
      if (event.target.closest('#enhanced-selection-ui')) return;
      
      this.isAreaSelection = true;
      this.selectionStart = { x: event.clientX, y: event.clientY };
      
      this.createSelectionBox();
    }

    handleAreaMove(event) {
      if (!this.isAreaSelection || !this.selectionStart) return;
      
      this.updateSelectionBox(event);
    }

    handleAreaEnd(event) {
      if (!this.isAreaSelection || !this.selectionStart) return;
      
      this.isAreaSelection = false;
      this.removeSelectionBox();
      
      const elements = this.getElementsInArea(this.selectionStart, { x: event.clientX, y: event.clientY });
      elements.forEach(el => {
        if (!this.selectedElements.has(el)) {
          this.selectedElements.add(el);
          el.classList.add('enhanced-selected');
        }
      });
      
      this.updateSelectionInfo();
      this.selectionStart = null;
    }

    createSelectionBox() {
      const box = document.createElement('div');
      box.id = 'area-selection-box';
      box.style.cssText = `
        position: fixed;
        border: 2px dashed #007bff;
        background: rgba(0, 123, 255, 0.1);
        pointer-events: none;
        z-index: 9999;
      `;
      document.body.appendChild(box);
    }

    updateSelectionBox(event) {
      const box = document.getElementById('area-selection-box');
      if (!box) return;
      
      const left = Math.min(this.selectionStart.x, event.clientX);
      const top = Math.min(this.selectionStart.y, event.clientY);
      const width = Math.abs(event.clientX - this.selectionStart.x);
      const height = Math.abs(event.clientY - this.selectionStart.y);
      
      box.style.left = left + 'px';
      box.style.top = top + 'px';
      box.style.width = width + 'px';
      box.style.height = height + 'px';
    }

    removeSelectionBox() {
      const box = document.getElementById('area-selection-box');
      if (box) {
        box.remove();
      }
    }

    getElementsInArea(start, end) {
      const elements = [];
      const allElements = document.querySelectorAll('*');
      
      allElements.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          
          if (centerX >= Math.min(start.x, end.x) && 
              centerX <= Math.max(start.x, end.x) &&
              centerY >= Math.min(start.y, end.y) && 
              centerY <= Math.max(start.y, end.y)) {
            elements.push(el);
          }
        }
      });
      
      return elements;
    }

    toggleElementSelection(element) {
      if (this.selectedElements.has(element)) {
        this.selectedElements.delete(element);
        element.classList.remove('enhanced-selected');
      } else {
        this.selectedElements.add(element);
        element.classList.add('enhanced-selected');
      }
      this.updateSelectionInfo();
    }

    clearSelection() {
      this.selectedElements.forEach(el => {
        el.classList.remove('enhanced-selected');
      });
      this.selectedElements.clear();
      this.updateSelectionInfo();
    }

    updateSelectionInfo() {
      // 更新状态指示器
      if (this.isSelectionActive) {
        this.updateStatusIndicator();
      }
    }

    async processSelectedContent() {
      console.log('[Content] 开始处理选中内容，当前模式:', this.currentMode);
      console.log('[Content] 选中元素数量:', this.selectedElements.size);
      
      if (this.selectedElements.size === 0) {
        alert('请先选择要处理的内容');
        return;
      }

      const contentData = [];
      
      // 如果是链接模式，检查是否有多个链接
      if (this.currentMode === 'links') {
        const links = Array.from(this.selectedElements).filter(el => el.href);
        console.log('[Content] 选中的链接数量:', links.length);
        
        if (links.length > 1) {
          // 多个链接，使用批量处理
          const urls = links.map(el => el.href);
          console.log('[Content] 批量处理多个链接:', urls);
          
          // 发送批量处理消息
          try {
            console.log('[Content] 发送 PROCESS_LINKS_QUEUE 消息');
            chrome.runtime.sendMessage({
              type: 'PROCESS_LINKS_QUEUE',
              urls: urls, // 新增：直接传递URL数组
              config: this.config
            }, (response) => {
              if (chrome.runtime.lastError) {
                console.error('[Content] 发送批量处理消息失败:', chrome.runtime.lastError);
                alert('发送批量处理请求失败: ' + chrome.runtime.lastError.message);
              } else {
                console.log('[Content] 批量处理消息发送成功，响应:', response);
              }
            });
          } catch (error) {
            console.error('[Content] 发送批量处理消息异常:', error);
            alert('发送批量处理请求异常: ' + error.message);
          }
          return;
        }
      }
      
      // 单个内容或多个非链接内容，使用原有逻辑
      this.selectedElements.forEach((element, index) => {
        let content = '';
        let url = '';
        
        switch (this.currentMode) {
          case 'links':
            content = element.textContent.trim();
            url = element.href;
            break;
          case 'text':
            content = element.textContent.trim();
            break;
          case 'elements':
            content = element.outerHTML;
            break;
          case 'area':
            content = element.textContent.trim() || element.outerHTML;
            break;
        }
        
        if (content) {
          contentData.push({
            type: this.currentMode,
            content: content,
            url: url,
            element: element.tagName.toLowerCase(),
            index: index
          });
        }
      });

      console.log('[Content] 发送选中内容到后台:', contentData);

      // 发送到后台处理
      try {
        console.log('[Content] 发送 PROCESS_SELECTED_CONTENT 消息');
        chrome.runtime.sendMessage({
          type: 'PROCESS_SELECTED_CONTENT',
          contentData: contentData,
          config: this.config
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('[Content] 发送消息失败:', chrome.runtime.lastError);
            alert('发送处理请求失败: ' + chrome.runtime.lastError.message);
          } else {
            console.log('[Content] 消息发送成功，响应:', response);
          }
        });
      } catch (error) {
        console.error('[Content] 发送消息异常:', error);
        alert('发送处理请求异常: ' + error.message);
      }
    }

    startSelectionMode() {
      console.log('=== [Content] 启动选择模式 ===');
      console.log('[Content] 当前页面URL:', window.location.href);
      console.log('[Content] 当前平台:', navigator.platform);
      console.log('[Content] 用户代理:', navigator.userAgent);
      
      // 设置选择状态为激活
      this.isSelectionActive = true;
      console.log('[Content] ✅ 选择状态已设置为激活');
      
      // 显示状态指示器
      const indicator = document.getElementById('selection-status-indicator');
      if (indicator) {
        console.log('[Content] ✅ 找到状态指示器元素');
        const statusDiv = indicator.querySelector('div');
        if (statusDiv) {
          statusDiv.style.display = 'block';
          console.log('[Content] ✅ 状态指示器已显示');
        } else {
          console.error('[Content] ❌ 未找到状态指示器div元素');
        }
      } else {
        console.error('[Content] ❌ 未找到状态指示器元素');
        console.log('[Content] 尝试重新创建状态指示器...');
        this.createStatusIndicator();
      }
      
      // 设置默认模式为链接选择
      console.log('[Content] 🔄 准备切换到模式:', this.currentMode);
      this.switchMode(this.currentMode);
      
      // 设置键盘事件监听
      console.log('[Content] ⌨️ 设置键盘事件监听');
      this.setupKeyboardEvents();
      
      // 更新状态指示器内容
      console.log('[Content] 🔄 更新状态指示器内容');
      this.updateStatusIndicator();
      
      console.log('[Content] ✅ 选择模式启动完成！');
      console.log('[Content] 当前状态 - 模式:', this.currentMode, '选择状态:', this.isSelectionActive);
      console.log('[Content] 📝 操作提示: ' + (navigator.platform.includes('Mac') ? 'Command' : 'Ctrl') + ' + 点击链接进行选择');
    }

    exitSelectionMode() {
      console.log('[Content] 退出选择模式');
      this.isSelectionActive = false;
      
      // 隐藏状态指示器
      const indicator = document.getElementById('selection-status-indicator');
      if (indicator) {
        const statusDiv = indicator.querySelector('div');
        if (statusDiv) {
          statusDiv.style.display = 'none';
        }
      }
      
      // 清除所有选择
      this.clearSelection();
      
      // 移除事件监听器
      this.removeAllEventListeners();
      
      console.log('[Content] 选择模式已退出');
    }

    updateStatusIndicator() {
      const modeText = document.getElementById('selection-mode-text');
      const countText = document.getElementById('selection-count-text');
      
      if (modeText) {
        const modeNames = {
          'links': '链接模式',
          'text': '文本模式', 
          'elements': '元素模式',
          'area': '区域模式'
        };
        modeText.textContent = modeNames[this.currentMode] || '链接模式';
      }
      
      if (countText) {
        countText.textContent = `已选择: ${this.selectedElements.size}`;
      }
    }

    setupMessageListener() {
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log('[Content] 收到消息:', message.type, message);
        
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
        }
      });
    }

    addStyles() {
      const style = document.createElement('style');
      style.textContent = `
        .enhanced-selected {
          outline: 3px solid #28a745 !important;
          outline-offset: 2px !important;
          background-color: rgba(40, 167, 69, 0.1) !important;
          position: relative !important;
        }
        
        .enhanced-selected::after {
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
        }
        
        .mode-btn {
          padding: 6px 10px;
          border: 1px solid #ddd;
          background: #f8f9fa;
          cursor: pointer;
          border-radius: 3px;
          font-size: 11px;
          transition: all 0.2s ease;
        }
        
        .mode-btn.active {
          background: #007bff;
          color: white;
          border-color: #007bff;
        }
        
        .mode-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        #enhanced-selection-ui {
          animation: slideIn 0.3s ease-out;
        }
        
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        #area-selection-box {
          animation: fadeIn 0.2s ease-out;
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }

  // 初始化增强内容选择器
  window.enhancedSelector = new EnhancedContentSelector();
  console.log('[Content] 增强内容选择器已挂载到 window.enhancedSelector');

})();