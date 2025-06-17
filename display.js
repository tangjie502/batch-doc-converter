// display.js - 使用 EasyMDE 的专业版本

document.addEventListener('DOMContentLoaded', async () => {
    const downloadBtn = document.getElementById('download-btn');
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

        await chrome.storage.local.remove('finalMarkdown');
    } else {
        // ... 错误处理逻辑不变 ...
    }
});