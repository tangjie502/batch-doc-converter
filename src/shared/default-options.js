// 默认配置选项 - 基于 MarkSnip 优化
const defaultOptions = {
  // Turndown 配置
  headingStyle: "atx",
  hr: "---",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
  fence: "```",
  preserveCodeFormatting: true,
  emDelimiter: "*",
  strongDelimiter: "**",
  linkStyle: "inlined",
  linkReferenceStyle: "full",
  
  // 图片配置
  imageStyle: "markdown",
  imageRefStyle: "inlined",
  downloadImages: false,
  imagePrefix: '{pageTitle}/',
  
  // 表格格式化配置
  tableFormatting: {
    stripLinks: false,        // 保留表格中的链接
    stripFormatting: false,   // 保留表格格式
    prettyPrint: true,        // 美化表格
    centerText: false,        // 不居中文本
    alignColumns: true        // 对齐列
  },
  
  // 模板配置
  frontmatter: "---\ncreated: {date:YYYY-MM-DDTHH:mm:ss}\ntags: [{keywords}]\nsource: {baseURI}\nauthor: {byline}\n---\n\n# {pageTitle}\n\n> ## 摘要\n> {excerpt}\n\n---",
  backmatter: "\n\n---\n\n*转换时间: {date:YYYY-MM-DD HH:mm:ss}*\n*原文链接: [{baseURI}]({baseURI})*",
  title: "{pageTitle}",
  includeTemplate: false,
  
  // 下载配置
  saveAs: false,
  downloadMode: 'downloadsApi',
  mdClipsFolder: null,
  disallowedChars: '[]#^',
  
  // 选择配置
  clipSelection: true,
  processSelection: true,
  
  // 内容处理配置
  contentExtraction: {
    expandCollapsed: true,
    processLazyLoaded: true,
    removeNoise: true,
    extractHiddenContent: false,
    smartDecoding: true,
    markdownCleaning: true,
    preserveFormatting: true,
    extractImages: true
  },
  
  // 选择模式配置
  selectionModes: {
    links: true,
    text: true,
    elements: true,
    area: true
  },
  
  // 性能配置
  performance: {
    batchSize: 5,
    timeout: 30,
    retryAttempts: 3
  },
  
  // 内容处理
  contentProcessing: {
    smartDecoding: true,
    markdownCleaning: true,
    preserveFormatting: true,
    extractImages: true
  },
  
  // 其他配置
  turndownEscape: true,
  contextMenus: true,
  showNotifications: true,
  
  // Obsidian 集成
  obsidianIntegration: false,
  obsidianVault: "",
  obsidianFolder: "",
  
  // 中文优化
  chineseOptimization: {
    convertPunctuation: true,  // 转换标点符号
    fixSpacing: true,          // 修复中英文间距
    optimizeLineBreaks: true   // 优化换行
  }
};

// 从存储获取配置的函数
async function getOptions() {
  let options = defaultOptions;
  try {
    const stored = await chrome.storage.sync.get(defaultOptions);
    options = { ...defaultOptions, ...stored };
  } catch (err) {
    console.error('获取配置失败:', err);
  }
  
  // 检查下载API支持
  if (!chrome.downloads) {
    options.downloadMode = 'contentLink';
  }
  
  return options;
}

// 保存配置的函数
async function saveOptions(options) {
  try {
    await chrome.storage.sync.set(options);
    return true;
  } catch (err) {
    console.error('保存配置失败:', err);
    return false;
  }
}

// 重置为默认配置
async function resetOptions() {
  try {
    await chrome.storage.sync.clear();
    await saveOptions(defaultOptions);
    return defaultOptions;
  } catch (err) {
    console.error('重置配置失败:', err);
    return defaultOptions;
  }
}