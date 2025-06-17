# 百川归档-Batch Doc Converter

## 简介

百川归档-Batch Doc Converter 是一款 Chrome 浏览器扩展程序，旨在帮助用户从网页中批量选择链接，并将这些链接指向的页面内容转换为单一的 Markdown 文件。用户可以在编辑器中进一步编辑这些内容，最后下载为 `.md` 文件。

## 功能特点

### 1. **批量选择链接**

- 用户可以点击浏览器工具栏上的插件图标，进入“选择模式”。
- 在选择模式下，点击网页上的任意链接，该链接会被高亮标记，并自动添加到处理队列中。
- 再次点击已选中的链接可取消选择。

### 2. **内容转换**

- 插件会自动抓取每个选中链接指向的网页内容。
- 使用 TurndownService 将抓取的 HTML 内容转换为 Markdown 格式。

### 3. **内容预览与编辑**

- 转换后的 Markdown 内容会在专用的预览页面展示。
- 预览页面集成了 EasyMDE 编辑器，用户可以切换到编辑模式对内容进行修改。

### 4. **下载功能**

- 用户可以在预览页面直接下载最终的 Markdown 文件。
- 文件名默认为 `converted-docs-<timestamp>.md`，方便用户管理和归档。

### 5. **隐私保护**

- 所有操作均在本地完成，不涉及任何数据的上传或第三方服务器交互。
- 插件仅请求必要的权限，确保用户数据安全。

## 使用方法

### 安装

1. **从 Chrome Web Store 安装**（待发布）：
   - 打开 Chrome Web Store，搜索 "Batch Doc Converter" 并安装。

2. **手动加载（开发模式）**：
   - 打开 Chrome 浏览器，访问 `chrome://extensions/`。
   - 开启右上角的“开发者模式”。
   - 点击“加载已解压的扩展程序”，选择本项目的 `dist` 目录（或源码根目录）。

### 操作步骤

1. **启动插件**：
   - 点击浏览器工具栏上的 Batch Doc Converter 图标，弹出操作面板。

2. **选择链接**：
   - 点击“开始选择链接”按钮，进入选择模式。
   - 在当前页面上点击需要处理的链接，链接会被高亮标记。
   - 如需取消选择，再次点击该链接即可。

3. **处理并下载**：
   - 选择完毕后，点击“处理并下载”按钮。
   - 插件会依次抓取每个链接的内容并转换为 Markdown。
   - 处理完成后，自动打开一个新标签页展示转换结果。

4. **编辑与下载**：
   - 在展示页面，你可以切换到编辑模式对内容进行修改。
   - 点击“下载 .md 文件”按钮，保存最终的 Markdown 文件。

## 技术细节

### 主要文件

- **[manifest.json](file:///Users/tangjie/jie/batch-doc-converter/manifest.json)**：扩展程序的配置文件，定义了插件的基本信息和权限。
- **[background.js](file:///Users/tangjie/jie/batch-doc-converter/background.js)**：背景脚本，负责协调各个部分的工作，如状态管理、消息传递等。
- **[content_select.js](file:///Users/tangjie/jie/batch-doc-converter/content_select.js)**：内容脚本，注入到目标网页中，用于捕获用户的链接选择操作。
- **[offscreen.js](file:///Users/tangjie/jie/batch-doc-converter/offscreen.js)**：离屏文档脚本，专门用于解析和转换 HTML 内容。
- **[popup.js](file:///Users/tangjie/jie/batch-doc-converter/popup.js)**：弹出窗口脚本，控制弹出面板的 UI 和逻辑。
- **[display.js](file:///Users/tangjie/jie/batch-doc-converter/display.js)**：展示页面脚本，提供 Markdown 内容的预览和编辑功能。

### 关键库

- **TurndownService**：用于将 HTML 转换为 Markdown。
- **EasyMDE**：Markdown 编辑器，提供友好的编辑界面。

## 隐私政策

详见 [Privacy Policy](privacy_policy.md)。

## 贡献

欢迎任何形式的贡献！无论是报告 Bug、提出功能建议，还是直接提交 PR，我们都表示热烈欢迎。

- **提交 Issue**：如果你发现了 Bug 或有功能建议，请在 GitHub 上提交 Issue。
- **提交 PR**：如果你愿意直接参与代码改进，请 fork 本项目并提交 PR。

## 联系我们

如有任何问题或建议，欢迎通过以下方式联系我们：

- **GitHub Issues**：https://github.com/tangjie502/batch-doc-converter/issues

---

感谢你使用 百川归档-Batch Doc Converter！希望它能为你的工作和学习带来便利。如果有任何问题或建议，请随时联系我们。😊