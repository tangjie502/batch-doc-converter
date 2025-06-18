// display.js - 使用 EasyMDE 的专业版本

document.addEventListener('DOMContentLoaded', async () => {
    const downloadBtn = document.getElementById('download-btn');
    const downloadTxtBtn = document.getElementById('download-txt-btn');
    const previewDiv = document.getElementById('preview');
    const editorTextarea = document.getElementById('markdown-editor');

    // 从 storage 中读取 markdown 内容
    const result = await chrome.storage.local.get('finalMarkdown');
    const markdownContent = result.finalMarkdown;

    if (markdownContent) {
        // ---- 初始化 EasyMDE 编辑器 ----
        const easyMDE = new EasyMDE({
            element: editorTextarea,
            initialValue: markdownContent,
            spellChecker: false,
            // 更多配置项可以查阅 EasyMDE 文档
        });

        // 默认显示预览，隐藏编辑器
        const editorWrapper = document.querySelector('.EasyMDEContainer');
        editorWrapper.style.display = 'none';

        previewDiv.innerHTML = marked.parse(markdownContent);

        // ---- 切换逻辑 ----
        let currentView = 'preview';
        const toggleBtn = document.getElementById('toggle-view-btn');
        toggleBtn.addEventListener('click', () => {
            if (currentView === 'preview') {
                // 切换到编辑器
                previewDiv.style.display = 'none';
                editorWrapper.style.display = 'block';
                toggleBtn.textContent = '切换到预览模式';
                currentView = 'editor';
            } else {
                // 切换到预览，需要从编辑器更新内容
                previewDiv.innerHTML = marked.parse(easyMDE.value());
                previewDiv.style.display = 'block';
                editorWrapper.style.display = 'none';
                toggleBtn.textContent = '切换到编辑器模式';
                currentView = 'preview';
            }
        });

        // ---- Markdown 转纯文本函数 ----
        function markdownToText(markdown) {
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

        // ---- 下载逻辑 ----
        downloadBtn.addEventListener('click', () => {
            // 从 EasyMDE 实例获取最新内容
            const contentToDownload = easyMDE.value();
            const blob = new Blob([contentToDownload], { type: 'text/markdown;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `converted-docs-${Date.now()}.md`;
            a.click();
            URL.revokeObjectURL(url);
        });

        // ---- TXT 下载逻辑 ----
        downloadTxtBtn.addEventListener('click', () => {
            // 从 EasyMDE 实例获取最新内容并转换为纯文本
            const markdownContent = easyMDE.value();
            const textContent = markdownToText(markdownContent);
            
            const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `converted-docs-${Date.now()}.txt`;
            a.click();
            URL.revokeObjectURL(url);
        });

        await chrome.storage.local.remove('finalMarkdown');
    } else {
        // ... 错误处理逻辑不变 ...
    }
});