// 增强版弹窗脚本 - 集成 MarkSnip 优秀特性
class MarkSnipEnhancedPopup {
  constructor() {
    this.currentTab = 'main';

    this.options = {};
    this.state = {
      selectedLinks: [],
      isSelectionActive: false,
      status: '就绪'
    };
    this.init();
  }

  async init() {
    console.log('[Popup] 初始化增强版弹窗');
    
    try {
      // 加载配置
      await this.loadOptions();
      

      
      // 设置事件监听器
      this.setupEventListeners();
      
      // 更新UI状态
      this.updateUI();
      
      // 获取当前状态
      this.requestState();
      
      console.log('[Popup] 弹窗初始化完成');
    } catch (error) {
      console.error('[Popup] 初始化失败:', error);
    }
  }

  // 加载配置选项
  async loadOptions() {
    try {
      this.options = await getOptions();
      console.log('[Popup] 配置加载完成:', this.options);
    } catch (error) {
      console.error('[Popup] 配置加载失败:', error);
      this.options = defaultOptions;
    }
  }



  // 设置事件监听器
  setupEventListeners() {
    // 关闭按钮
    document.getElementById('close-popup-btn').addEventListener('click', () => {
      this.closePopup();
    });

    // 标签页切换
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        this.switchTab(e.target.dataset.tab);
      });
    });

    // 主要功能按钮
    document.getElementById('toggle-selection-btn').addEventListener('click', () => {
      this.toggleSelectionMode();
    });

    document.getElementById('process-btn').addEventListener('click', () => {
      this.processQueue();
    });

    // 选择模式相关按钮
    document.getElementById('close-selection-btn').addEventListener('click', () => {
      this.exitSelectionMode();
    });

    document.getElementById('process-selection-btn').addEventListener('click', () => {
      this.processSelectedContent();
    });

    document.getElementById('clear-selection-btn').addEventListener('click', () => {
      this.clearSelection();
    });

    // 选择模式切换按钮
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mode = e.target.dataset.mode;
        if (mode === 'text') return; // 文本模式已取消
        this.switchSelectionMode(mode);
      });
    });



    // 批量处理
    document.getElementById('convert-urls-btn').addEventListener('click', () => {
      this.convertBatchUrls();
    });

    document.getElementById('clear-urls-btn').addEventListener('click', () => {
      this.clearBatchUrls();
    });

    // 配置切换开关
    this.setupToggleSwitches();

    // 配置操作
    document.getElementById('import-config-btn').addEventListener('click', () => {
      this.importConfig();
    });

    document.getElementById('export-config-btn').addEventListener('click', () => {
      this.exportConfig();
    });

    document.getElementById('reset-config-btn').addEventListener('click', () => {
      this.resetConfig();
    });

    // 移除下拉选择模式监听（已取消选择模式下拉框）
    const selectionModeEl = document.getElementById('selection-mode');
    if (selectionModeEl) {
      selectionModeEl.remove();
    }

    console.log('[Popup] 事件监听器设置完成');
  }

  // 设置切换开关
  setupToggleSwitches() {
    const toggles = [
      'download-images-toggle',
      'include-template-toggle',
      'smart-extraction-toggle',
      'code-detection-toggle',
      'table-formatting-toggle',
      'chinese-optimization-toggle'
    ];

    toggles.forEach(id => {
      const toggle = document.getElementById(id);
      if (toggle) {
        toggle.addEventListener('click', () => {
          this.toggleOption(id);
        });
      }
    });
  }

  // 切换标签页
  switchTab(tabName) {
    // 更新标签页状态
    document.querySelectorAll('.tab').forEach(tab => {
      tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // 更新内容显示
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');

    this.currentTab = tabName;
    console.log('[Popup] 切换到标签页:', tabName);
  }

  // 切换选择模式
  async toggleSelectionMode() {
    try {
      if (this.state.isSelectionActive) {
        // 如果已经在选择模式，则退出
        await this.exitSelectionMode();
      } else {
        // 进入选择模式，但不关闭弹窗
        await this.enterSelectionMode();
      }
    } catch (error) {
      console.error('[Popup] 切换选择模式失败:', error);
      this.showNotification('切换失败', 'error');
    }
  }

  // 进入选择模式
  async enterSelectionMode() {
    try {
      // 发送消息给background脚本启动选择模式
      const response = await chrome.runtime.sendMessage({
        type: 'START_SELECTION_MODE',
        config: this.options
      });
      
      if (response?.success) {
        // 更新本地状态
        this.state.isSelectionActive = true;
        this.state.status = '选择模式已激活';
        
        // 显示选择状态UI
        this.showSelectionStatus();
        this.updateUI();
        
        this.showNotification('选择模式已激活，请在页面中选择内容', 'success');
      }
    } catch (error) {
      console.error('[Popup] 进入选择模式失败:', error);
      this.showNotification('启动选择模式失败', 'error');
    }
  }

  // 退出选择模式
  async exitSelectionMode() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'EXIT_SELECTION_MODE'
      });
      
      if (response?.success || true) { // 即使失败也要更新UI
        this.state.isSelectionActive = false;
        this.state.status = '就绪';
        
        // 隐藏选择状态UI
        this.hideSelectionStatus();
        this.updateUI();
        
        this.showNotification('已退出选择模式', 'info');
      }
    } catch (error) {
      console.error('[Popup] 退出选择模式失败:', error);
      // 即使出错也要更新UI
      this.state.isSelectionActive = false;
      this.hideSelectionStatus();
      this.updateUI();
    }
  }

  // 显示选择状态
  showSelectionStatus() {
    document.getElementById('selection-status').style.display = 'block';
  }

  // 隐藏选择状态
  hideSelectionStatus() {
    document.getElementById('selection-status').style.display = 'none';
  }

  // 处理选中内容
  async processSelectedContent() {
    try {
      // 直接转发给当前页内容脚本收集并处理
      this.updateStatus('正在处理选中内容...');
      const ok = await chrome.tabs.query({ active: true, currentWindow: true })
        .then(([tab]) => tab ? chrome.tabs.sendMessage(tab.id, { type: 'PROCESS_SELECTED_CONTENT', config: this.options }) : null)
        .catch(err => { console.error('[Popup] 转发到内容脚本失败:', err); return null; });
      if (!ok && this.state.selectedLinks?.length === 0) {
        this.showNotification('未检测到选中内容，请先选择', 'warning');
      }
    } catch (error) {
      console.error('[Popup] 处理选中内容失败:', error);
      this.showNotification('处理失败', 'error');
    }
  }

  // 清空选择
  async clearSelection() {
    try {
      await chrome.runtime.sendMessage({
        type: 'CLEAR_SELECTION'
      });
      
      this.state.selectedLinks = [];
      this.updateSelectionCount();
      this.showNotification('已清空选择', 'info');
    } catch (error) {
      console.error('[Popup] 清空选择失败:', error);
    }
  }

  // 更新选择计数
  updateSelectionCount() {
    const count = typeof this.state.selectedCount === 'number'
      ? this.state.selectedCount
      : (this.state.selectedLinks?.length || 0);
    const countEl = document.getElementById('selection-count');
    if (countEl) countEl.textContent = count;
    const linkCountEl = document.getElementById('link-count');
    if (linkCountEl) linkCountEl.textContent = this.state.selectedLinks?.length || 0;
  }

  // 处理队列
  async processQueue() {
    if (this.state.selectedLinks.length === 0) {
      this.showNotification('请先选择要处理的链接', 'warning');
      return;
    }

    try {
      document.getElementById('process-btn').disabled = true;
      this.updateStatus('正在处理...');

      const response = await chrome.runtime.sendMessage({
        type: 'PROCESS_QUEUE',
        config: this.options
      });

      if (response) {
        this.showProgress();
      }
    } catch (error) {
      console.error('[Popup] 处理队列失败:', error);
      this.showNotification('处理失败', 'error');
      document.getElementById('process-btn').disabled = false;
    }
  }



  // 批量转换 URLs
  async convertBatchUrls() {
    const urls = document.getElementById('batch-urls').value
      .split('\n')
      .map(url => url.trim())
      .filter(url => url && url.startsWith('http'));

    if (urls.length === 0) {
      this.showNotification('请输入有效的URL', 'warning');
      return;
    }

    console.log('[Popup] 开始批量处理URL:', urls);

    try {
      this.showProgress();
      this.updateProgress(0, urls.length, '开始批量处理...');

      // 发送批量处理请求 - 使用正确的消息类型
      const response = await chrome.runtime.sendMessage({
        type: 'PROCESS_LINKS_QUEUE',
        urls: urls,
        config: this.options
      });

      if (chrome.runtime.lastError) {
        throw new Error(chrome.runtime.lastError.message);
      }

      console.log('[Popup] 批量处理请求已发送，响应:', response);
      this.showNotification(`已开始处理 ${urls.length} 个URL，请等待完成...`, 'success');
      
      // 更新进度到100%
      this.updateProgress(urls.length, urls.length, '处理中，请稍候...');
      
      // 不立即隐藏进度条，让用户看到正在处理
      setTimeout(() => {
        this.hideProgress();
      }, 2000);
      
    } catch (error) {
      console.error('[Popup] 批量转换失败:', error);
      this.hideProgress();
      this.showNotification('批量转换失败: ' + error.message, 'error');
    }
  }

  // 清空批量URL
  clearBatchUrls() {
    document.getElementById('batch-urls').value = '';
  }

  // 切换配置选项
  toggleOption(toggleId) {
    const toggle = document.getElementById(toggleId);
    const isActive = toggle.classList.contains('active');
    
    if (isActive) {
      toggle.classList.remove('active');
    } else {
      toggle.classList.add('active');
    }

    // 更新对应的配置
    this.updateConfigOption(toggleId, !isActive);
  }

  // 更新配置选项
  updateConfigOption(toggleId, value) {
    const configMap = {
      'download-images-toggle': 'downloadImages',
      'include-template-toggle': 'includeTemplate',
      'smart-extraction-toggle': 'contentExtraction.smartDecoding',
      'code-detection-toggle': 'contentProcessing.smartDecoding',
      'table-formatting-toggle': 'tableFormatting.prettyPrint',
      'chinese-optimization-toggle': 'chineseOptimization.convertPunctuation'
    };

    const configKey = configMap[toggleId];
    if (configKey) {
      // 支持嵌套配置
      if (configKey.includes('.')) {
        const [parent, child] = configKey.split('.');
        if (!this.options[parent]) this.options[parent] = {};
        this.options[parent][child] = value;
      } else {
        this.options[configKey] = value;
      }
      
      this.saveOptions();
      console.log('[Popup] 配置已更新:', configKey, value);
    }
  }

  // 保存配置
  async saveOptions() {
    try {
      await saveOptions(this.options);
    } catch (error) {
      console.error('[Popup] 保存配置失败:', error);
    }
  }

  // 导入配置
  importConfig() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (event) => {
      const file = event.target.files[0];
      if (file) {
        try {
          const text = await file.text();
          const config = JSON.parse(text);
          this.options = { ...defaultOptions, ...config };
          await this.saveOptions();
          this.updateUI();
          this.showNotification('配置导入成功', 'success');
        } catch (error) {
          console.error('[Popup] 导入配置失败:', error);
          this.showNotification('配置导入失败', 'error');
        }
      }
    };
    input.click();
  }

  // 导出配置
  exportConfig() {
    const configJson = JSON.stringify(this.options, null, 2);
    const timestamp = new Date().toISOString().slice(0, 10);
    this.downloadFile(configJson, `batch-doc-converter-config-${timestamp}.json`, 'application/json');
    this.showNotification('配置导出成功', 'success');
  }

  // 重置配置
  async resetConfig() {
    if (confirm('确定要重置所有配置吗？')) {
      try {
        this.options = await resetOptions();
        this.updateUI();
        this.showNotification('配置已重置', 'success');
      } catch (error) {
        console.error('[Popup] 重置配置失败:', error);
        this.showNotification('重置配置失败', 'error');
      }
    }
  }

  // 切换选择模式
  async switchSelectionMode(mode) {
    try {
      // 更新模式按钮状态
      document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.remove('active');
      });
      document.querySelector(`[data-mode="${mode}"]`).classList.add('active');

      // 发送模式切换消息给内容脚本
      await chrome.runtime.sendMessage({
        type: 'SWITCH_SELECTION_MODE',
        mode: mode
      });
      
      console.log('[Popup] 切换到选择模式:', mode);
      this.showNotification(`已切换到${this.getModeText(mode)}模式`, 'info');
    } catch (error) {
      console.error('[Popup] 切换选择模式失败:', error);
    }
  }

  // 获取模式文本
  getModeText(mode) {
    const modeTexts = {
      'links': '链接',
      'text': '文本',
      'elements': '元素',
      'area': '区域'
    };
    return modeTexts[mode] || mode;
  }



  // 显示进度
  showProgress() {
    document.getElementById('progress-container').style.display = 'block';
  }

  // 隐藏进度
  hideProgress() {
    document.getElementById('progress-container').style.display = 'none';
  }

  // 更新进度
  updateProgress(current, total, url) {
    const percentage = total > 0 ? (current / total) * 100 : 0;
    
    document.getElementById('progress-bar').style.width = `${percentage}%`;
    document.getElementById('progress-count').textContent = `${current}/${total}`;
    document.getElementById('current-url').textContent = url || '';
    
    if (current === total) {
      document.getElementById('progress-status').textContent = '处理完成';
    }
  }

  // 请求状态更新
  async requestState() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_STATE' });
      if (response) {
        this.state = response;
        this.updateUI();
      }
    } catch (error) {
      console.error('[Popup] 获取状态失败:', error);
    }
  }

  // 更新UI状态
  updateUI() {
    // 更新链接计数
    this.updateSelectionCount();
    
    // 更新状态消息
    document.getElementById('status-message').textContent = this.state.status || '就绪';
    
    // 更新选择按钮
    const toggleBtn = document.getElementById('toggle-selection-btn');
    if (this.state.isSelectionActive) {
      toggleBtn.textContent = '退出选择';
      toggleBtn.classList.add('active');
    } else {
      toggleBtn.textContent = '开始选择';
      toggleBtn.classList.remove('active');
    }
    
    // 更新处理按钮
    const processBtn = document.getElementById('process-btn');
    processBtn.disabled = !this.state.selectedLinks?.length;
    
    // 更新选择状态显示
    if (this.state.isSelectionActive) {
      this.showSelectionStatus();
    } else {
      this.hideSelectionStatus();
    }
    // 同步“已选择: X 项”文本
    const selectedCount = typeof this.state.selectedCount === 'number'
      ? this.state.selectedCount
      : (this.state.selectedLinks?.length || 0);
    const countEl = document.getElementById('selection-count');
    if (countEl) countEl.textContent = selectedCount;
    
    // 更新配置开关状态
    this.updateToggleStates();
  }

  // 更新切换开关状态
  updateToggleStates() {
    const toggleMap = {
      'download-images-toggle': this.options.downloadImages,
      'include-template-toggle': this.options.includeTemplate,
      'smart-extraction-toggle': this.options.contentExtraction?.smartDecoding,
      'code-detection-toggle': this.options.contentProcessing?.smartDecoding,
      'table-formatting-toggle': this.options.tableFormatting?.prettyPrint,
      'chinese-optimization-toggle': this.options.chineseOptimization?.convertPunctuation
    };

    Object.entries(toggleMap).forEach(([id, value]) => {
      const toggle = document.getElementById(id);
      if (toggle) {
        if (value) {
          toggle.classList.add('active');
        } else {
          toggle.classList.remove('active');
        }
      }
    });
  }

  // 更新状态消息
  updateStatus(message) {
    this.state.status = message;
    document.getElementById('status-message').textContent = message;
  }

  // 下载文件
  downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // 显示通知
  showNotification(message, type = 'info') {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // 设置样式
    switch (type) {
      case 'success':
        notification.style.background = '#28a745';
        break;
      case 'error':
        notification.style.background = '#dc3545';
        break;
      case 'warning':
        notification.style.background = '#ffc107';
        notification.style.color = '#000';
        break;
      default:
        notification.style.background = '#007bff';
    }
    
    document.body.appendChild(notification);
    
    // 显示动画
    setTimeout(() => notification.classList.add('show'), 100);
    
    // 自动隐藏
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => document.body.removeChild(notification), 300);
    }, 3000);
  }

  // 关闭弹窗
  closePopup() {
    window.close();
  }
}

// 监听来自 background 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Popup] 收到消息:', message);
  
  switch (message.type) {
    case 'STATE_UPDATE':
    case 'STATE_UPDATED':
      if (window.popup && message.state) {
        // 合并状态，保留 selectedCount 等由内容脚本上报但 background 不维护的字段
        window.popup.state = { ...window.popup.state, ...message.state };
        window.popup.updateUI();
      }
      break;
    case 'SELECTION_UPDATED':
      if (window.popup) {
        window.popup.state.isSelectionActive = message.isActive;
        window.popup.state.selectedLinks = message.selectedLinks || [];
        window.popup.state.selectedCount = typeof message.count === 'number' ? message.count : window.popup.state.selectedCount;
        if (message.count !== undefined) {
          window.popup.state.status = message.isActive 
            ? `选择模式 (${message.mode || '链接'}) - 已选择 ${message.count} 项`
            : '就绪';
        }
        window.popup.updateUI();
      }
      break;

  }
});

// 初始化弹窗
window.popup = new MarkSnipEnhancedPopup();