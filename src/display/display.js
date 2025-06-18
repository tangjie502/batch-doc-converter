// display.js - 增强版文档预览页面

class EnhancedDisplay {
  constructor() {
    this.easyMDE = null;
    this.currentView = 'preview';
    this.originalMarkdown = '';
    this.originalHtml = '';
    this.currentConfig = this.getDefaultConfig();
    this.init();
  }

  async init() {
    await this.loadSettings();
    this.setupEventListeners();
    await this.loadContent();
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

  async loadSettings() {
    try {
      const result = await chrome.storage.local.get('extensionConfig');
      if (result.extensionConfig) {
        this.currentConfig = this.mergeConfig(this.getDefaultConfig(), result.extensionConfig);
      }
      this.updateSettingsUI();
    } catch (error) {
      console.error('加载设置失败:', error);
    }
  }

  mergeConfig(defaultConfig, userConfig) {
    const merged = JSON.parse(JSON.stringify(defaultConfig));
    
    function mergeObjects(target, source) {
      for (const key in source) {
        if (source.hasOwnProperty(key)) {
          if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
            if (!(key in target) || typeof target[key] !== 'object') {
              target[key] = {};
            }
            mergeObjects(target[key], source[key]);
          } else {
            target[key] = source[key];
          }
        }
      }
    }
    
    mergeObjects(merged, userConfig);
    return merged;
  }

  setupEventListeners() {
    // 下载按钮
    document.getElementById('download-btn').addEventListener('click', () => {
      this.downloadMarkdown();
    });

    document.getElementById('download-txt-btn').addEventListener('click', () => {
      this.downloadText();
    });

    // 视图切换
    document.getElementById('toggle-view-btn').addEventListener('click', () => {
      this.toggleView();
    });

    // 设置开关
    document.querySelectorAll('.toggle-switch').forEach(toggle => {
      toggle.addEventListener('click', (e) => {
        this.toggleSetting(e.target.dataset.setting);
      });
    });

    // 数字输入框
    document.querySelectorAll('.number-input').forEach(input => {
      input.addEventListener('change', (e) => {
        this.updateNumberSetting(e.target.dataset.setting, parseInt(e.target.value));
      });
    });

    // 应用设置按钮
    document.getElementById('apply-settings-btn').addEventListener('click', () => {
      this.applySettings();
    });

    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        this.downloadMarkdown();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        this.toggleView();
      }
    });

    // 刷新按钮
    document.getElementById('refresh-btn').addEventListener('click', () => {
      this.loadContent();
    });
  }

  async loadContent() {
    const previewDiv = document.getElementById('preview');
    previewDiv.innerHTML = '<div class="loading">正在加载文档内容...</div>';

    try {
      // 新增：获取时间戳，用于验证内容是否是最新的
      const result = await chrome.storage.local.get(['finalMarkdown', 'originalHtml', 'lastUpdateTime']);
      
      // 新增：检查是否有时间戳，如果没有说明是旧数据
      if (!result.lastUpdateTime) {
        console.log('[Display] 检测到旧数据，清理并重新加载');
        await chrome.storage.local.remove(['finalMarkdown', 'originalHtml']);
        previewDiv.innerHTML = '<div class="error">未找到有效的文档内容，请重新选择内容</div>';
        return;
      }
      
      // 新增：检查时间戳是否太旧（超过5分钟）
      const timeDiff = Date.now() - result.lastUpdateTime;
      if (timeDiff > 5 * 60 * 1000) { // 5分钟
        console.log('[Display] 检测到过期数据，清理并重新加载');
        await chrome.storage.local.remove(['finalMarkdown', 'originalHtml', 'lastUpdateTime']);
        previewDiv.innerHTML = '<div class="error">文档内容已过期，请重新选择内容</div>';
        return;
      }
      
      this.originalHtml = result.originalHtml || '';
      this.originalMarkdown = result.finalMarkdown || '';
      
      console.log('[Display] 加载内容，时间戳:', new Date(result.lastUpdateTime).toLocaleString());
      console.log('[Display] 原始HTML长度:', this.originalHtml.length);
      console.log('[Display] Markdown长度:', this.originalMarkdown.length);
      
      if (this.originalHtml && this.originalMarkdown) {
        console.log('[Display] 找到原始HTML，长度:', this.originalHtml.length);
        await this.processAndDisplayContent(this.originalMarkdown);
      } else {
        console.log('[Display] 未找到原始HTML，使用现有markdown');
        await this.processAndDisplayContent(this.originalMarkdown);
      }
    } catch (error) {
      console.error('加载内容失败:', error);
      previewDiv.innerHTML = '<div class="error">加载内容失败: ' + error.message + '</div>';
    }
  }

  async processAndDisplayContent(markdownContent) {
    try {
      // 根据配置处理内容
      let processedContent = markdownContent;
      
      if (this.currentConfig.contentProcessing.markdownCleaning) {
        processedContent = this.cleanMarkdown(processedContent);
      }
      
      if (!this.currentConfig.contentProcessing.extractImages) {
        processedContent = this.removeImages(processedContent);
      }
      
      if (this.currentConfig.contentProcessing.preserveFormatting) {
        processedContent = this.preserveFormatting(processedContent);
      }

      // 初始化编辑器
      this.initEditor(processedContent);
      
      // 显示预览
      this.displayPreview(processedContent);
      
    } catch (error) {
      console.error('处理内容失败:', error);
      document.getElementById('preview').innerHTML = '<div class="error">处理内容失败: ' + error.message + '</div>';
    }
  }

  cleanMarkdown(markdown) {
    let cleaned = markdown;
    
    // 移除多余的空白行
    cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    // 清理行首行尾空白
    cleaned = cleaned.split('\n').map(line => line.trim()).join('\n');
    
    return cleaned;
  }

  removeImages(markdown) {
    // 移除图片链接
    return markdown.replace(/!\[([^\]]*)\]\([^)]*\)/g, (match, alt) => {
      return `[${alt || '图片'}]`;
    });
  }

  preserveFormatting(markdown) {
    // 保留重要的格式标记
    let formatted = markdown;
    
    // 确保代码块格式正确
    formatted = formatted.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
      return `\`\`\`${lang || ''}\n${code.trim()}\n\`\`\``;
    });
    
    return formatted;
  }

  initEditor(content) {
    const editorTextarea = document.getElementById('markdown-editor');
    
    if (this.easyMDE) {
      this.easyMDE.value(content);
    } else {
      this.easyMDE = new EasyMDE({
        element: editorTextarea,
        value: content,
        spellChecker: false,
        autosave: {
          enabled: true,
          uniqueId: 'display-editor',
          delay: 1000,
        },
        toolbar: [
          'bold', 'italic', 'heading', '|',
          'quote', 'unordered-list', 'ordered-list', '|',
          'link', 'image', '|',
          'preview', 'side-by-side', 'fullscreen', '|',
          'guide'
        ]
      });
    }
  }

  displayPreview(content) {
    const previewDiv = document.getElementById('preview');
    
    if (this.currentView === 'preview') {
      // 使用 marked.js 渲染 Markdown
      if (typeof marked !== 'undefined') {
        previewDiv.innerHTML = marked.parse(content);
      } else {
        // 简单的 Markdown 渲染
        previewDiv.innerHTML = this.simpleMarkdownRender(content);
      }
    } else {
      previewDiv.innerHTML = '<pre>' + this.escapeHtml(content) + '</pre>';
    }
  }

  simpleMarkdownRender(markdown) {
    let html = markdown;
    
    // 标题
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    
    // 粗体和斜体
    html = html.replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>');
    html = html.replace(/\*(.*)\*/gim, '<em>$1</em>');
    
    // 链接
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank">$1</a>');
    
    // 图片
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/gim, '<img src="$2" alt="$1" style="max-width: 100%; height: auto;">');
    
    // 代码块
    html = html.replace(/```([\s\S]*?)```/gim, '<pre><code>$1</code></pre>');
    
    // 行内代码
    html = html.replace(/`([^`]+)`/gim, '<code>$1</code>');
    
    // 列表
    html = html.replace(/^\* (.*$)/gim, '<li>$1</li>');
    html = html.replace(/^- (.*$)/gim, '<li>$1</li>');
    
    // 段落
    html = html.replace(/\n\n/g, '</p><p>');
    html = '<p>' + html + '</p>';
    
    return html;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  toggleView() {
    this.currentView = this.currentView === 'preview' ? 'raw' : 'preview';
    const toggleBtn = document.getElementById('toggle-view-btn');
    toggleBtn.textContent = this.currentView === 'preview' ? '查看源码' : '查看预览';
    
    const content = this.easyMDE ? this.easyMDE.value() : this.originalMarkdown;
    this.displayPreview(content);
  }

  toggleSetting(settingPath) {
    const keys = settingPath.split('.');
    let current = this.currentConfig;
    
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    
    const lastKey = keys[keys.length - 1];
    current[lastKey] = !current[lastKey];
    
    this.updateSettingsUI();
  }

  updateNumberSetting(settingPath, value) {
    const keys = settingPath.split('.');
    let current = this.currentConfig;
    
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    
    const lastKey = keys[keys.length - 1];
    current[lastKey] = value;
  }

  updateSettingsUI() {
    // 更新开关状态
    document.querySelectorAll('.toggle-switch').forEach(toggle => {
      const settingPath = toggle.dataset.setting;
      const value = this.getSettingValue(settingPath);
      
      if (value !== null) {
        toggle.classList.toggle('active', value);
        toggle.textContent = value ? '开启' : '关闭';
      }
    });

    // 更新数字输入框
    document.querySelectorAll('.number-input').forEach(input => {
      const settingPath = input.dataset.setting;
      const value = this.getSettingValue(settingPath);
      
      if (value !== null) {
        input.value = value;
      }
    });
  }

  getSettingValue(settingPath) {
    const keys = settingPath.split('.');
    let value = this.currentConfig;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return null;
      }
    }
    
    return value;
  }

  async applySettings() {
    console.log('[Display] 开始应用设置并重新处理');
    
    if (this.originalHtml) {
      console.log('[Display] 使用原始HTML重新处理');
      try {
        const newMarkdown = await this.reprocessHtmlWithCurrentSettings();
        if (newMarkdown) {
          await this.processAndDisplayContent(newMarkdown);
          this.showMessage('设置已应用，内容已重新处理', 'success');
        } else {
          throw new Error('重新处理返回空结果');
        }
      } catch (error) {
        console.error('[Display] 重新处理失败:', error);
        this.showMessage('重新处理失败，使用现有内容: ' + error.message, 'error');
        // 回退到现有内容
        await this.processAndDisplayContent(this.originalMarkdown);
      }
    } else {
      console.log('[Display] 未找到原始HTML，仅对当前内容做二次处理');
      await this.processAndDisplayContent(this.originalMarkdown);
      this.showMessage('未找到原始HTML，仅对当前内容做二次处理', 'info');
    }
  }

  async reprocessHtmlWithCurrentSettings() {
    return new Promise((resolve, reject) => {
      console.log('[Display] 发送重新处理请求，配置:', this.currentConfig);
      
      // 尝试多种消息类型
      const messageTypes = [
        'REPROCESS_HTML_TO_MARKDOWN',
        'process-html-content',
        'PROCESS_HTML_WITH_CONFIG'
      ];
      
      let attempts = 0;
      const maxAttempts = messageTypes.length;
      
      const tryNextMessageType = () => {
        if (attempts >= maxAttempts) {
          reject(new Error('所有消息类型都失败'));
          return;
        }
        
        const messageType = messageTypes[attempts];
        console.log(`[Display] 尝试消息类型: ${messageType}`);
        
        chrome.runtime.sendMessage({
          type: messageType,
          html: this.originalHtml,
          config: this.currentConfig
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.log(`[Display] 消息类型 ${messageType} 失败:`, chrome.runtime.lastError);
            attempts++;
            setTimeout(tryNextMessageType, 100);
          } else if (response && response.markdown) {
            console.log(`[Display] 消息类型 ${messageType} 成功`);
            resolve(response.markdown);
          } else {
            console.log(`[Display] 消息类型 ${messageType} 返回无效响应:`, response);
            attempts++;
            setTimeout(tryNextMessageType, 100);
          }
        });
      };
      
      tryNextMessageType();
    });
  }

  downloadMarkdown() {
    try {
      const contentToDownload = this.easyMDE ? this.easyMDE.value() : this.originalMarkdown;
      const blob = new Blob([contentToDownload], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `converted-docs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      this.showMessage('Markdown 文件下载成功！', 'success');
    } catch (error) {
      console.error('下载失败:', error);
      this.showMessage('下载失败: ' + error.message, 'error');
    }
  }

  downloadText() {
    try {
      const markdownContent = this.easyMDE ? this.easyMDE.value() : this.originalMarkdown;
      const textContent = this.markdownToText(markdownContent);
      
      const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `converted-docs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      this.showMessage('纯文本文件下载成功！', 'success');
    } catch (error) {
      console.error('下载失败:', error);
      this.showMessage('下载失败: ' + error.message, 'error');
    }
  }

  markdownToText(markdown) {
    if (!markdown) return '';
    
    let text = markdown;
    
    // 移除代码块
    text = text.replace(/```[\s\S]*?```/g, '');
    
    // 移除行内代码
    text = text.replace(/`([^`]+)`/g, '$1');
    
    // 移除链接，保留文本
    text = text.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
    
    // 移除图片
    text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, '');
    
    // 移除粗体和斜体标记
    text = text.replace(/\*\*([^*]+)\*\*/g, '$1');
    text = text.replace(/\*([^*]+)\*/g, '$1');
    text = text.replace(/__([^_]+)__/g, '$1');
    text = text.replace(/_([^_]+)_/g, '$1');
    
    // 移除删除线
    text = text.replace(/~~([^~]+)~~/g, '$1');
    
    // 移除引用标记
    text = text.replace(/^>\s*/gm, '');
    
    // 移除列表标记
    text = text.replace(/^[\s]*[-*+]\s+/gm, '');
    text = text.replace(/^[\s]*\d+\.\s+/gm, '');
    
    // 移除标题标记，保留文本
    text = text.replace(/^#{1,6}\s+(.+)$/gm, '$1');
    
    // 移除水平分割线
    text = text.replace(/^[-*_]{3,}$/gm, '');
    
    // 移除表格标记
    text = text.replace(/\|/g, ' ');
    text = text.replace(/^[\s]*[-|]+\s*$/gm, '');
    
    // 清理多余的空行
    text = text.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    // 清理行首行尾空白
    text = text.trim();
    
    return text;
  }

  showMessage(message, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 10px 16px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      z-index: 10000;
      max-width: 300px;
      word-wrap: break-word;
      animation: slideIn 0.3s ease-out;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
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

  disableButtons() {
    document.getElementById('download-btn').disabled = true;
    document.getElementById('download-txt-btn').disabled = true;
    document.getElementById('toggle-view-btn').disabled = true;
    document.getElementById('apply-settings-btn').disabled = true;
  }
}

// 初始化增强版文档预览
new EnhancedDisplay();