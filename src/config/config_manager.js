// 配置管理模块
class ConfigManager {
  constructor() {
    this.defaultConfig = {
      // 内容抓取策略
      contentExtraction: {
        enabled: true,
        expandCollapsed: true,        // 展开折叠内容
        processLazyLoaded: true,      // 处理懒加载内容
        removeNoise: true,            // 移除干扰元素
        extractHiddenContent: true    // 提取隐藏内容
      },
      
      // 选择模式
      selectionModes: {
        links: true,                  // 链接选择
        text: true,                   // 文本选择
        elements: true,               // 元素选择
        area: true                    // 区域选择
      },
      
      // 内容处理选项
      contentProcessing: {
        smartDecoding: true,          // 智能编码检测
        markdownCleaning: true,       // Markdown清理
        preserveFormatting: true,     // 保留格式
        extractImages: true           // 提取图片
      },
      
      // 性能选项
      performance: {
        batchSize: 5,                 // 批处理大小
        timeout: 30000,               // 超时时间(ms)
        retryAttempts: 3              // 重试次数
      },
      
      // UI选项
      ui: {
        showSelectionUI: true,        // 显示选择UI
        enableAnimations: true,       // 启用动画
        compactMode: false            // 紧凑模式
      }
    };
    
    this.config = null;
  }

  // 初始化配置
  async init() {
    try {
      const result = await chrome.storage.local.get('extensionConfig');
      this.config = result.extensionConfig || this.defaultConfig;
      
      // 确保所有默认配置都存在
      this.config = this.mergeConfig(this.defaultConfig, this.config);
      
      // 保存配置
      await this.saveConfig();
      
      return this.config;
    } catch (error) {
      console.error('配置初始化失败:', error);
      this.config = this.defaultConfig;
      return this.config;
    }
  }

  // 获取配置
  getConfig() {
    return this.config;
  }

  // 获取特定配置项
  getConfigItem(path) {
    const keys = path.split('.');
    let value = this.config;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return null;
      }
    }
    
    return value;
  }

  // 更新配置
  async updateConfig(path, value) {
    const keys = path.split('.');
    let current = this.config;
    
    // 导航到父对象
    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in current)) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    // 设置值
    current[keys[keys.length - 1]] = value;
    
    // 保存配置
    await this.saveConfig();
    
    return this.config;
  }

  // 重置配置
  async resetConfig() {
    this.config = JSON.parse(JSON.stringify(this.defaultConfig));
    await this.saveConfig();
    return this.config;
  }

  // 保存配置
  async saveConfig() {
    try {
      await chrome.storage.local.set({ extensionConfig: this.config });
    } catch (error) {
      console.error('配置保存失败:', error);
    }
  }

  // 合并配置
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

  // 验证配置
  validateConfig(config) {
    const errors = [];
    
    // 验证必需字段
    if (!config.contentExtraction) {
      errors.push('缺少contentExtraction配置');
    }
    
    if (!config.selectionModes) {
      errors.push('缺少selectionModes配置');
    }
    
    // 验证性能配置
    if (config.performance) {
      if (config.performance.batchSize < 1 || config.performance.batchSize > 20) {
        errors.push('batchSize必须在1-20之间');
      }
      
      if (config.performance.timeout < 5000 || config.performance.timeout > 120000) {
        errors.push('timeout必须在5000-120000ms之间');
      }
    }
    
    return errors;
  }
}

// 导出配置管理器实例
window.ConfigManager = ConfigManager; 