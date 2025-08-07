# GEMINI.md

## Project Overview

This project is a Chrome extension called "百川归档-Batch Doc Converter". It allows users to select links, text, or elements from any webpage and convert them into a single, clean Markdown document. The extension features multiple selection modes, advanced content extraction, an integrated Markdown editor with live preview, and the ability to export to both Markdown (.md) and plain text (.txt) formats. It is built using HTML, CSS, and JavaScript, following the Chrome Extension Manifest V3 standard. Key libraries include Turndown.js for HTML-to-Markdown conversion, Marked.js for Markdown parsing, and EasyMDE for the editor interface.

## Building and Running

The project does not have a formal build process. To run the extension, you need to load it into a Chromium-based browser in developer mode.

**To run the extension:**

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/tangjie502/batch-doc-converter.git
    cd batch-doc-converter
    ```
2.  **Load the extension in your browser:**
    *   Navigate to `chrome://extensions/`.
    *   Enable "Developer mode".
    *   Click "Load unpacked".
    *   Select the `batch-doc-converter` directory.

**To run tests:**

The project includes simple tests that can be run using Node.js.

```bash
# Test Markdown conversion
node tests/test_markdown.js

# Test text conversion
node tests/test_txt_conversion.js
```

## Development Conventions

The codebase is structured into distinct directories for different parts of the extension:

*   `src/background`: Service workers for background tasks.
*   `src/content`: Content scripts injected into web pages.
*   `src/popup`: UI for the extension's popup.
*   `src/display`: The page for displaying and editing the converted content.
*   `src/offscreen`: Offscreen documents for DOM manipulation.
*   `src/config`: Configuration management.
*   `assets`: Icons and styles.
*   `libs`: Third-party libraries.
*   `tests`: Test scripts.
*   `docs`: Project documentation.

The project maintains two manifest files: `manifest.json` for the enhanced version and `manifest_simple.json` for a simplified version. Development seems to follow standard web development practices, with a focus on vanilla JavaScript. There are no explicit linting or formatting configurations, but the code appears to be consistently styled.