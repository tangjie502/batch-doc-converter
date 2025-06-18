// 增强版弹出窗口脚本
class EnhancedPopup {
  constructor() {
    this.configManager = new ConfigManager();
    this.currentTab = 'main';
    this.currentMode = 'links';
    this.init();
  }

  async init() {
    await this.configManager.init();
    this.setupEventListeners();
    this.loadConfig();
    this.updateUI();
  }

  setupEventListeners() {
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

    // 快速操作按钮
    document.querySelectorAll('.quick-action').forEach(action => {
      action.addEventListener('click', (e) => {
        this.switchMode(e.target.dataset.mode);
      });
    });

    // 配置开关
    document.querySelectorAll('.toggle-switch').forEach(toggle => {
      toggle.addEventListener('click', (e) => {
        this.toggleConfig(e.target.dataset.config);
      });
    });

    // 数字输入框
    document.querySelectorAll('.number-input').forEach(input => {
      input.addEventListener('change', (e) => {
        this.updateNumberConfig(e.target.dataset.config, parseInt(e.target.value));
      });
    });

    // 高级设置按钮
    document.getElementById('reset-config-btn').addEventListener('click', () => {
      this.resetConfig();
    });

    document.getElementById('export-config-btn').addEventListener('click', () => {
      this.exportConfig();
    });

    // 导入配置按钮
    document.getElementById('import-config-btn').addEventListener('click', () => {
      this.importConfig();
    });

    // 文件输入框事件
    document.getElementById('config-file-input').addEventListener('change', (e) => {
      this.handleFileSelect(e.target.files[0]);
    });

    // 监听后台消息
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'STATE_UPDATE') {
        this.updateUI(message.state);
      }
    });

    // 初始化时获取状态
    document.addEventListener('DOMContentLoaded', () => {
      chrome.runtime.sendMessage({ type: 'GET_STATE' }, (response) => {
        if (chrome.runtime.lastError) {
          console.warn("Could not get initial state:", chrome.runtime.lastError.message);
          this.updateUI({isSelectionActive: false, selectedLinks: []});
        } else {
          this.updateUI(response);
        }
      });
    });

    // 处理选中按钮
    document.getElementById('process-selected-btn').addEventListener('click', () => {
      this.processSelectedContent();
    });
  }

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
  }

  switchMode(mode) {
    this.currentMode = mode;
    
    // 更新快速操作按钮状态
    document.querySelectorAll('.quick-action').forEach(action => {
      action.classList.remove('active');
    });
    document.querySelector(`[data-mode="${mode}"]`).classList.add('active');

    // 发送模式切换消息
    chrome.runtime.sendMessage({ 
      type: 'SWITCH_SELECTION_MODE', 
      mode: mode 
    });
  }

  async toggleSelectionMode() {
    const config = this.configManager.getConfig();
    chrome.runtime.sendMessage({ 
      type: 'TOGGLE_SELECTION_MODE',
      config: config
    });
  }

  async processQueue() {
    const config = this.configManager.getConfig();
    chrome.runtime.sendMessage({ 
      type: 'PROCESS_QUEUE',
      config: config
    });
    
    document.getElementById('status-message').textContent = '正在处理中，请稍候...';
    document.getElementById('process-btn').disabled = true;
    document.getElementById('toggle-selection-btn').disabled = true;
  }

  async toggleConfig(configPath) {
    const currentValue = this.configManager.getConfigItem(configPath);
    const newValue = !currentValue;
    
    await this.configManager.updateConfig(configPath, newValue);
    this.updateConfigUI();
  }

  async updateNumberConfig(configPath, value) {
    await this.configManager.updateConfig(configPath, value);
  }

  async resetConfig() {
    if (confirm('确定要重置所有配置到默认值吗？')) {
      await this.configManager.resetConfig();
      this.loadConfig();
      this.updateConfigUI();
      this.showMessage('配置已重置为默认值', 'success');
    }
  }

  async exportConfig() {
    try {
      const exportData = this.configManager.exportConfig();
      const configStr = JSON.stringify(exportData, null, 2);
      
      const blob = new Blob([configStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `batch-doc-converter-config-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      this.showMessage('配置文件导出成功', 'success');
    } catch (error) {
      console.error('导出配置失败:', error);
      this.showMessage('导出配置失败: ' + error.message, 'error');
    }
  }

  // 导入配置
  importConfig() {
    console.log('[Popup] 点击导入配置按钮');
    const fileInput = document.getElementById('config-file-input');
    if (fileInput) {
      fileInput.click();
    } else {
      console.error('[Popup] 找不到文件输入框');
      this.showMessage('导入功能初始化失败', 'error');
    }
  }

  // 处理文件选择
  async handleFileSelect(file) {
    console.log('[Popup] 处理文件选择:', file);
    
    if (!file) {
      return;
    }

    // 验证文件类型
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      this.showMessage('请选择有效的 JSON 配置文件', 'error');
      return;
    }

    // 验证文件大小 (最大 1MB)
    if (file.size > 1024 * 1024) {
      this.showMessage('配置文件过大，请选择小于 1MB 的文件', 'error');
      return;
    }

    try {
      // 显示加载状态
      this.showMessage('正在导入配置...', 'info');
      
      const result = await this.configManager.importConfigFromFile(file);
      
      if (result.success) {
        this.loadConfig();
        this.updateConfigUI();
        this.showMessage('配置导入成功', 'success');
      } else {
        this.showMessage(result.message, 'error');
      }
    } catch (error) {
      console.error('导入配置失败:', error);
      this.showMessage('导入配置失败: ' + error.message, 'error');
    }

    // 清空文件输入框，允许重复选择同一文件
    document.getElementById('config-file-input').value = '';
  }

  // 显示消息提示
  showMessage(message, type = 'info') {
    console.log('[Popup] 显示消息:', message, type);
    
    // 创建消息元素
    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      padding: 10px 15px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      z-index: 10000;
      max-width: 300px;
      word-wrap: break-word;
      animation: slideIn 0.3s ease-out;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;

    // 根据类型设置样式
    switch (type) {
      case 'success':
        messageDiv.style.background = '#d4edda';
        messageDiv.style.color = '#155724';
        messageDiv.style.border = '1px solid #c3e6cb';
        break;
      case 'error':
        messageDiv.style.background = '#f8d7da';
        messageDiv.style.color = '#721c24';
        messageDiv.style.border = '1px solid #f5c6cb';
        break;
      case 'info':
      default:
        messageDiv.style.background = '#d1ecf1';
        messageDiv.style.color = '#0c5460';
        messageDiv.style.border = '1px solid #bee5eb';
        break;
    }

    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);

    // 3秒后自动移除
    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
          if (messageDiv.parentNode) {
            messageDiv.parentNode.removeChild(messageDiv);
          }
        }, 300);
      }
    }, 3000);
  }

  loadConfig() {
    const config = this.configManager.getConfig();
    
    // 更新开关状态
    document.querySelectorAll('.toggle-switch').forEach(toggle => {
      const configPath = toggle.dataset.config;
      const value = this.configManager.getConfigItem(configPath);
      if (value) {
        toggle.classList.add('active');
      } else {
        toggle.classList.remove('active');
      }
    });

    // 更新数字输入框
    document.querySelectorAll('.number-input').forEach(input => {
      const configPath = input.dataset.config;
      const value = this.configManager.getConfigItem(configPath);
      if (value !== null) {
        input.value = value;
      }
    });
  }

  updateConfigUI() {
    this.loadConfig();
  }

  updateUI(state) {
    // 更新链接数量
    const count = state.selectedLinks ? state.selectedLinks.length : 0;
    document.getElementById('link-count').textContent = count;
    
    // 更新状态信息
    const statusElement = document.getElementById('status-message');
    if (statusElement && state.status) {
      statusElement.textContent = state.status;
    }
    
    // 更新按钮状态
    const toggleBtn = document.getElementById('toggle-selection-btn');
    const processBtn = document.getElementById('process-btn');
    const processSelectedBtn = document.getElementById('process-selected-btn');
    
    if (toggleBtn) {
      toggleBtn.textContent = state.isSelectionActive ? '停止选择' : '开始选择';
      toggleBtn.className = state.isSelectionActive ? 'btn btn-danger' : 'btn btn-primary';
    }
    
    if (processBtn) {
      processBtn.disabled = state.selectedLinks.length === 0 || state.status.includes('处理中');
    }
    
    if (processSelectedBtn) {
      processSelectedBtn.disabled = !state.isSelectionActive || state.status.includes('处理中');
    }
    
    // 显示/隐藏加载指示器
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
      if (state.status && state.status.includes('处理中')) {
        loadingIndicator.style.display = 'block';
      } else {
        loadingIndicator.style.display = 'none';
      }
    }
  }

  async processSelectedContent() {
    const config = this.configManager.getConfig();
    
    // 显示处理状态
    document.getElementById('status-message').textContent = '正在处理选中的内容...';
    document.getElementById('process-btn').disabled = true;
    document.getElementById('toggle-selection-btn').disabled = true;
    
    try {
      console.log('[Popup] 发送处理选中内容请求');
      
      // 发送处理选中内容的消息
      chrome.runtime.sendMessage({ 
        type: 'PROCESS_SELECTED_CONTENT',
        config: config
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('[Popup] 发送消息失败:', chrome.runtime.lastError);
          document.getElementById('status-message').textContent = '发送请求失败: ' + chrome.runtime.lastError.message;
          document.getElementById('process-btn').disabled = false;
          document.getElementById('toggle-selection-btn').disabled = false;
        } else {
          console.log('[Popup] 消息发送成功');
        }
      });
    } catch (error) {
      console.error('[Popup] 处理选中内容失败:', error);
      document.getElementById('status-message').textContent = '处理失败: ' + error.message;
      document.getElementById('process-btn').disabled = false;
      document.getElementById('toggle-selection-btn').disabled = false;
    }
  }
}

// 初始化增强版弹出窗口
new EnhancedPopup();