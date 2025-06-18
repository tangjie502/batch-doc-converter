# 百川归档-Batch Doc Converter

一个强大的Chrome扩展，用于批量选择网页链接并将其转换为单个、干净的Markdown文件，支持编辑后下载。

## 功能特性

- 🔗 **批量链接选择**：从任何网页选择多个链接进行批量处理
- 📝 **Markdown转换**：将HTML内容转换为干净的Markdown格式
- ✏️ **实时编辑**：在下载前预览和编辑转换结果
- 📄 **多格式导出**：支持导出为Markdown(.md)和纯文本(.txt)格式
- 🎨 **智能清理**：自动清理格式问题，确保兼容性
- 🌐 **多编码支持**：支持UTF-8、GBK等多种字符编码

## 目录结构

```
batch-doc-converter/
├── src/                          # 源代码目录
│   ├── background/               # 后台脚本
│   │   └── background.js
│   ├── content/                  # 内容脚本
│   │   └── content_select.js
│   ├── popup/                    # 弹出窗口
│   │   ├── popup.html
│   │   └── popup.js
│   ├── display/                  # 显示页面
│   │   ├── display.html
│   │   └── display.js
│   └── offscreen/                # 离屏页面
│       ├── offscreen.html
│       └── offscreen.js
├── assets/                       # 静态资源
│   ├── icons/                    # 图标文件
│   │   ├── icon16.png
│   │   ├── icon48.png
│   │   └── icon128.png
│   └── styles/                   # 样式文件
│       └── styles.css
├── libs/                         # 第三方库
│   ├── css/
│   │   └── easymde.min.css
│   ├── easymde.min.js
│   ├── marked.min.js
│   ├── turndown.js
│   └── turndown-plugin-gfm.js
├── tests/                        # 测试文件
│   ├── test_markdown.js
│   └── test_txt_conversion.js
├── docs/                         # 文档
│   ├── README.md
│   └── privacy_policy.md
├── manifest.json                 # 扩展清单
└── .gitignore                    # Git忽略文件
```

## 安装说明

1. 下载或克隆此仓库到本地
2. 打开Chrome浏览器，进入扩展管理页面 (`chrome://extensions/`)
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择项目文件夹

## 使用方法

1. **选择链接**：点击扩展图标，然后点击"开始选择链接"
2. **选择页面**：在网页上点击要转换的链接
3. **开始转换**：点击"开始转换"按钮
4. **预览编辑**：在预览界面查看和编辑转换结果
5. **下载文件**：选择下载Markdown(.md)或纯文本(.txt)格式

## 技术栈

- **前端**：HTML5, CSS3, JavaScript (ES6+)
- **Markdown处理**：Turndown.js, Marked.js
- **编辑器**：EasyMDE
- **Chrome扩展API**：Manifest V3

## 开发说明

### 本地开发

1. 克隆仓库
2. 修改代码
3. 在Chrome扩展管理页面重新加载扩展
4. 测试功能

### 测试

运行测试脚本：
```bash
node tests/test_markdown.js
node tests/test_txt_conversion.js
```

## 更新日志

### v1.0.0
- 初始版本发布
- 支持批量链接选择和转换
- 支持Markdown和纯文本导出
- 智能格式清理和编码处理

## 许可证

本项目采用MIT许可证。

## 贡献

欢迎提交Issue和Pull Request！

## 隐私政策

请查看 [隐私政策](privacy_policy.md) 了解详细信息。