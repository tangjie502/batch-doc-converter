// 简化版内容选择脚本
(() => {
  if (window.isSimpleSelectorInjected) {
    return;
  }
  window.isSimpleSelectorInjected = true;

  class SimpleContentSelector {
    constructor() {
      this.selectedElements = new Set();
      this.currentMode = 'links';
      this.ui = null;
      
      this.init();
    }

    init() {
      this.createSelectionUI();
      this.setupLinkSelection();
    }

    createSelectionUI() {
      this.ui = document.createElement('div');
      this.ui.id = 'simple-selection-ui';
      this.ui.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #fff;
        border: 2px solid #007bff;
        border-radius: 8px;
        padding: 15px;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        font-family: Arial, sans-serif;
        min-width: 200px;
      `;

      this.ui.innerHTML = `
        <div style="margin-bottom: 15px;">
          <div style="font-weight: bold; color: #007bff; margin-bottom: 8px;">选择模式</div>
          <div style="display: flex; gap: 5px; margin-bottom: 10px;">
            <button id="mode-links" class="mode-btn active">链接</button>
            <button id="mode-text" class="mode-btn">文本</button>
          </div>
        </div>
        
        <div style="margin-bottom: 15px;">
          <div style="font-size: 12px; color: #666; margin-bottom: 5px;">已选择项目</div>
          <div id="selection-info" style="font-size: 14px; font-weight: bold; color: #007bff;">0</div>
        </div>
        
        <div style="display: flex; gap: 8px;">
          <button id="process-selected" style="
            flex: 1;
            background: #28a745;
            color: white;
            border: none;
            padding: 8px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
          ">处理选中</button>
          <button id="clear-selection" style="
            background: #dc3545;
            color: white;
            border: none;
            padding: 8px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
          ">清空</button>
        </div>
        
        <div style="margin-top: 10px; font-size: 11px; color: #999; text-align: center;">
          按 ESC 键退出选择模式
        </div>
      `;

      document.body.appendChild(this.ui);
      this.setupUIEvents();
      this.addStyles();
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
        console.log('处理选中按钮被点击');
        this.processSelectedContent();
      });

      // 清空选择
      document.getElementById('clear-selection').addEventListener('click', () => {
        this.clearSelection();
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
      document.removeEventListener('click', this.handleLinkClick.bind(this), true);
      document.removeEventListener('click', this.handleTextClick.bind(this), true);

      // 根据模式设置事件监听器
      if (mode === 'links') {
        this.setupLinkSelection();
      } else if (mode === 'text') {
        this.setupTextSelection();
      }
    }

    setupLinkSelection() {
      document.addEventListener('click', this.handleLinkClick.bind(this), true);
    }

    setupTextSelection() {
      document.addEventListener('click', this.handleTextClick.bind(this), true);
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

    toggleElementSelection(element) {
      if (this.selectedElements.has(element)) {
        this.selectedElements.delete(element);
        element.classList.remove('simple-selected');
      } else {
        this.selectedElements.add(element);
        element.classList.add('simple-selected');
      }
      this.updateSelectionInfo();
    }

    clearSelection() {
      this.selectedElements.forEach(el => {
        el.classList.remove('simple-selected');
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
      console.log('开始处理选中内容，选中元素数量:', this.selectedElements.size);
      
      if (this.selectedElements.size === 0) {
        alert('请先选择要处理的内容');
        return;
      }

      const contentData = [];
      
      this.selectedElements.forEach(element => {
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
        }
        
        if (content) {
          contentData.push({
            type: this.currentMode,
            content: content,
            url: url,
            element: element.tagName.toLowerCase()
          });
        }
      });

      console.log('准备发送到后台的内容数据:', contentData);

      // 发送到后台处理
      try {
        chrome.runtime.sendMessage({
          type: 'PROCESS_SELECTED_CONTENT',
          contentData: contentData
        }, (response) => {
          console.log('后台响应:', response);
        });
      } catch (error) {
        console.error('发送消息失败:', error);
        alert('发送消息失败: ' + error.message);
      }
    }

    exitSelectionMode() {
      chrome.runtime.sendMessage({ type: 'TOGGLE_SELECTION_MODE' });
    }

    addStyles() {
      const style = document.createElement('style');
      style.textContent = `
        .simple-selected {
          outline: 3px solid #28a745 !important;
          outline-offset: 2px !important;
          background-color: rgba(40, 167, 69, 0.1) !important;
          position: relative !important;
        }
        
        .simple-selected::after {
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
      `;
      document.head.appendChild(style);
    }
  }

  // 初始化简化内容选择器
  window.simpleSelector = new SimpleContentSelector();
  console.log('简化内容选择器已初始化');

})(); 