// display.js - 增强版文档预览页面

class EnhancedDisplay {
  constructor() {
    this.easyMDE = null;
    this.currentView = 'preview';
    this.originalMarkdown = '';
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
  }

  async loadContent() {
    const previewDiv = document.getElementById('preview');
    previewDiv.innerHTML = '<div class="loading">正在加载文档内容...</div>';

    try {
      const result = await chrome.storage.local.get('finalMarkdown');
      const markdownContent = result.finalMarkdown;

      if (markdownContent) {
        this.originalMarkdown = markdownContent;
        await this.processAndDisplayContent(markdownContent);
        await chrome.storage.local.remove('finalMarkdown');
      } else {
        previewDiv.innerHTML = `
          <div class="error">
            <h3>⚠️ 未找到文档内容</h3>
            <p>请先使用扩展程序选择并处理文档内容。</p>
            <button onclick="window.close()" class="btn btn-primary" style="margin-top: 15px;">
              关闭页面
            </button>
          </div>
        `;
        this.disableButtons();
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
        initialValue: content,
        spellChecker: false,
        autofocus: false,
        placeholder: '在这里编辑您的文档...',
        toolbar: [
          'bold', 'italic', 'heading', '|',
          'quote', 'unordered-list', 'ordered-list', '|',
          'link', 'image', '|',
          'preview', 'side-by-side', 'fullscreen', '|',
          'guide'
        ],
        status: ['lines', 'words', 'cursor'],
        theme: 'default'
      });
    }

    // 默认隐藏编辑器
    const editorWrapper = document.querySelector('.EasyMDEContainer');
    if (editorWrapper) {
      editorWrapper.style.display = 'none';
    }
  }

  displayPreview(content) {
    try {
      // 配置 marked 选项
      marked.setOptions({
        breaks: true,
        gfm: true,
        headerIds: true,
        mangle: false
      });
      
      document.getElementById('preview').innerHTML = marked.parse(content);
    } catch (error) {
      console.error('Markdown 解析错误:', error);
      document.getElementById('preview').innerHTML = '<div class="error">文档解析失败，请检查内容格式</div>';
    }
  }

  toggleView() {
    if (this.currentView === 'preview') {
      // 切换到编辑器
      document.getElementById('preview').style.display = 'none';
      const editorWrapper = document.querySelector('.EasyMDEContainer');
      if (editorWrapper) {
        editorWrapper.style.display = 'block';
      }
      document.getElementById('toggle-view-btn').innerHTML = `
        <svg class="btn-icon" viewBox="0 0 24 24">
          <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
        </svg>
        切换到预览模式
      `;
      this.currentView = 'editor';
      
      // 延迟聚焦编辑器
      setTimeout(() => {
        this.easyMDE.codemirror.focus();
      }, 100);
    } else {
      // 切换到预览
      const updatedContent = this.easyMDE.value();
      this.displayPreview(updatedContent);
      
      document.getElementById('preview').style.display = 'block';
      const editorWrapper = document.querySelector('.EasyMDEContainer');
      if (editorWrapper) {
        editorWrapper.style.display = 'none';
      }
      document.getElementById('toggle-view-btn').innerHTML = `
        <svg class="btn-icon" viewBox="0 0 24 24">
          <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
        </svg>
        切换到编辑器模式
      `;
      this.currentView = 'preview';
    }
  }

  toggleSetting(settingPath) {
    const keys = settingPath.split('.');
    let current = this.currentConfig;
    
    // 导航到父对象
    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in current)) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    // 切换值
    current[keys[keys.length - 1]] = !current[keys[keys.length - 1]];
    
    // 更新UI
    this.updateSettingsUI();
  }

  updateNumberSetting(settingPath, value) {
    const keys = settingPath.split('.');
    let current = this.currentConfig;
    
    // 导航到父对象
    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in current)) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    // 设置值
    current[keys[keys.length - 1]] = value;
  }

  updateSettingsUI() {
    // 更新开关状态
    document.querySelectorAll('.toggle-switch').forEach(toggle => {
      const settingPath = toggle.dataset.setting;
      const value = this.getSettingValue(settingPath);
      if (value) {
        toggle.classList.add('active');
      } else {
        toggle.classList.remove('active');
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
    try {
      // 保存配置
      await chrome.storage.local.set({ extensionConfig: this.currentConfig });
      
      // 重新处理内容
      await this.processAndDisplayContent(this.originalMarkdown);
      
      this.showMessage('设置已应用，内容已重新处理', 'success');
    } catch (error) {
      console.error('应用设置失败:', error);
      this.showMessage('应用设置失败: ' + error.message, 'error');
    }
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