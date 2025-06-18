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
      this.createSelectionUI();
      this.setupUIEvents();
      this.setupMessageListener();
      this.addStyles();
      // 初始化时设置链接选择模式
      this.setupLinkSelection();
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

    createSelectionUI() {
      const ui = document.createElement('div');
      ui.id = 'enhanced-selection-ui';
      ui.innerHTML = `
        <div style="
          position: fixed;
          top: 20px;
          right: 20px;
          background: white;
          border: 2px solid #007bff;
          border-radius: 8px;
          padding: 15px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          z-index: 10000;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          min-width: 200px;
        ">
          <div style="margin-bottom: 10px; font-weight: bold; color: #007bff;">
            内容选择器
          </div>
          
          <div style="margin-bottom: 10px;">
            <div style="margin-bottom: 5px; font-size: 12px; color: #666;">选择模式:</div>
            <div style="display: flex; gap: 5px; flex-wrap: wrap;">
              <button id="mode-links" class="mode-btn active">链接</button>
              <button id="mode-text" class="mode-btn">文本</button>
              <button id="mode-elements" class="mode-btn">元素</button>
              <button id="mode-area" class="mode-btn">区域</button>
            </div>
          </div>
          
          <div style="margin-bottom: 10px;">
            <div style="font-size: 12px; color: #666;">
              已选择: <span id="selection-info">0</span> 项
            </div>
          </div>
          
          <div style="display: flex; gap: 5px;">
            <button id="process-selected" style="
              background: #28a745;
              color: white;
              border: none;
              padding: 6px 12px;
              border-radius: 4px;
              cursor: pointer;
              font-size: 12px;
            ">处理选中</button>
            
            <button id="clear-selection" style="
              background: #6c757d;
              color: white;
              border: none;
              padding: 6px 12px;
              border-radius: 4px;
              cursor: pointer;
              font-size: 12px;
            ">清空</button>
            
            <button id="exit-selection" style="
              background: #dc3545;
              color: white;
              border: none;
              padding: 6px 12px;
              border-radius: 4px;
              cursor: pointer;
              font-size: 12px;
            ">退出</button>
          </div>
        </div>
      `;
      document.body.appendChild(ui);
    }

    setupUIEvents() {
      // 模式切换按钮
      document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const mode = e.target.id.replace('mode-', '');
          this.switchMode(mode);
        });
      });

      // 处理选中内容
      document.getElementById('process-selected').addEventListener('click', () => {
        this.processSelectedContent();
      });

      // 清空选择
      document.getElementById('clear-selection').addEventListener('click', () => {
        this.clearSelection();
      });

      // 退出选择模式
      document.getElementById('exit-selection').addEventListener('click', () => {
        this.exitSelectionMode();
      });

      // ESC键退出
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          this.exitSelectionMode();
        }
      });
    }

    switchMode(mode) {
      this.currentMode = mode;
      
      // 更新按钮状态
      document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.remove('active');
      });
      document.getElementById(`mode-${mode}`).classList.add('active');

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
    }

    removeAllEventListeners() {
      // 使用绑定的函数引用
      document.removeEventListener('click', this.boundHandleLinkClick, true);
      document.removeEventListener('click', this.boundHandleTextClick, true);
      document.removeEventListener('click', this.boundHandleElementClick, true);
      document.removeEventListener('mousedown', this.boundHandleAreaStart);
      document.removeEventListener('mousemove', this.boundHandleAreaMove);
      document.removeEventListener('mouseup', this.boundHandleAreaEnd);
    }

    setupLinkSelection() {
      // 使用绑定的函数引用
      document.addEventListener('click', this.boundHandleLinkClick, true);
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
      const link = event.target.closest('a');
      if (!link) return;
      
      event.preventDefault();
      event.stopPropagation();
      
      this.toggleElementSelection(link);
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
      const info = document.getElementById('selection-info');
      if (info) {
        info.textContent = this.selectedElements.size;
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

    exitSelectionMode() {
      chrome.runtime.sendMessage({ type: 'TOGGLE_SELECTION_MODE' });
    }

    setupMessageListener() {
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'SWITCH_SELECTION_MODE') {
          this.switchMode(message.mode);
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