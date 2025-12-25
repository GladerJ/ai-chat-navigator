# AI Chat Navigator

![image.png](https://images.mygld.top/file/1766681694147_image.png)

## 中文说明

专门用于 web 端 AI 聊天长对话提供快速定位与检索的侧边栏导航。

功能
- 侧边栏消息列表，支持点击跳转与高亮
- 关键词过滤搜索（本地匹配）
- 左右侧边栏切换
- 适配深色/浅色主题与响应式布局
- i18n（中文/英文）

目前支持平台
- ChatGPT（chat.openai.com / chatgpt.com）
- Claude（claude.ai）
- Gemini（gemini.google.com）
- DeepSeek（chat.deepseek.com）
- Doubao（doubao.com）

安装
1. 打开 `chrome://extensions`
2. 开启「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择本项目根目录

使用
- 快捷键：`Alt + N` 显示/隐藏侧边栏
- 点击浏览器工具栏图标进行设置（语言、侧边栏位置、是否显示时间戳）
- 在侧边栏搜索框输入关键词过滤消息

开发与适配
- Manifest V3 + 原生 JavaScript
- 平台选择器配置在 `src/content/platforms/*.js`
- 站点 DOM 变化可能导致匹配失效，可在对应平台文件调整选择器

## English

A sidebar navigation feature specifically designed for web-based AI chat and long conversations, providing quick location and retrieval capabilities.

Features
- Sidebar message list with click-to-jump and highlight
- Keyword filter search (local match)
- Left/right sidebar toggle
- Dark/light theme adaptation and responsive layout
- i18n (Chinese/English)

Current Supported Sites
- ChatGPT (chat.openai.com / chatgpt.com)
- Claude (claude.ai)
- Gemini (gemini.google.com)
- DeepSeek (chat.deepseek.com)
- Doubao (doubao.com)

Install
1. Open `chrome://extensions`
2. Enable Developer Mode
3. Click "Load unpacked"
4. Select the project root folder

Usage
- Shortcut: `Alt + N` to show/hide the sidebar
- Use the toolbar popup to change language, sidebar position, and timestamp visibility
- Type keywords in the sidebar search box to filter messages

Development & Adaptation
- Manifest V3 + vanilla JavaScript
- Platform selectors live in `src/content/platforms/*.js`
- If the DOM changes, update selectors in the corresponding platform file
