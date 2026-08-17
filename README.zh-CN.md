# YouTube Digest

[English](README.md) | [简体中文](README.zh-CN.md)

把 YouTube 视频变成 Chrome 侧边栏里的可检索学习资料：阅读带时间戳的双语字幕、生成结构化 AI 概览、讲解选中文本、保存笔记和生词，并导出自己的学习数据。

- **当前二开仓库：** [Dream-will-come-true-oneday/youtube-digest](https://github.com/Dream-will-come-true-oneday/youtube-digest)
- **原仓库：** [zarazhangrui/youtube-digest](https://github.com/zarazhangrui/youtube-digest)

本项目保留原版的用户自备 API Key、本地存储和无遥测模式，并补全学习闭环，改善长视频使用体验。

## 与原仓库相比

| 对比项 | 原仓库 | 当前仓库 |
|---|---|---|
| 长视频 | 标准时间戳导航 | 支持 `H:MM:SS`，持续跟随当前播放位置 |
| 阅读体验 | 亮色界面 | 亮色、暗色、跟随系统主题，并优化窄侧栏布局 |
| 字幕定位 | 带时间戳的原文、中文和双语视图 | 新增搜索高亮及 Enter/Shift+Enter 匹配导航 |
| AI 概览 | 通用概览 | 通用、课程、访谈、教程四种模板 |
| 学习闭环 | 内容讲解和时间戳笔记 | 新增本地生词本，支持当前/全部视频筛选、复制、回播和删除 |
| 数据导出 | 本地笔记 | 笔记和生词可导出为 Markdown 或兼容 Excel 的 CSV |
| 可靠性 | 扩展核心流程 | 丢弃过期模板结果、容忍损坏的生词存储，并防止 CSV 公式注入 |
| 可访问性 | 基础控件 | 补齐 ARIA 标签页/面板语义、标签、焦点状态和响应式控件 |

## 安装

1. 打开当前仓库的 [`dev` 分支](https://github.com/Dream-will-come-true-oneday/youtube-digest/tree/dev)，选择 **Code > Download ZIP**，解压到一个长期保留的文件夹；也可以克隆该分支：

   ```bash
   git clone -b dev https://github.com/Dream-will-come-true-oneday/youtube-digest.git
   ```

2. 在 Chrome 打开 `chrome://extensions`。
3. 开启“开发者模式”，点击“加载已解压的扩展程序”。
4. 选择包含 `manifest.json` 的项目文件夹。
5. 如需快速打开，可在扩展菜单中固定 YouTube Digest。

源码更新后，在扩展卡片上点击“重新加载”，再刷新已打开的 YouTube 页面。扩展使用期间不要移动或删除源码文件夹。

## 配置 API Key

YouTube Digest 需要两把由你自己申请的密钥：

1. 注册 [Supadata 账号](https://dash.supadata.ai/auth/sign-up)，然后在 [Supadata API Key 页面](https://dash.supadata.ai/organizations/api-key)复制密钥。
2. 在 [DeepSeek API Keys 页面](https://platform.deepseek.com/api_keys)创建密钥。
3. 打开 YouTube Digest 的 **Settings/设置**，把两把密钥分别粘贴到对应字段并保存。

Supadata 用于获取带时间戳的原生字幕；DeepSeek V4 Flash 用于生成概览、讲解、翻译和润色笔记。服务价格可能变化，使用前请查看 [Supadata 价格](https://supadata.ai/pricing)和 [DeepSeek 价格](https://api-docs.deepseek.com/quick_start/pricing/)。

不要把 API Key 写入源码、提交记录、截图或聊天。密钥保存在 Chrome 扩展本地存储中，只会发送给对应的服务商。

## 使用

1. 打开一个有原生字幕的普通 `youtube.com/watch` 视频页面。
2. 点击 YouTube Digest 图标，打开侧边栏。
3. 在 **Transcript** 查看原文、中文或双语字幕，通过搜索和时间戳快速定位。
4. 在 **Overview** 选择适合视频的概览模板。
5. 选中字幕获取 AI 讲解，把需要复习的内容保存到 **Vocabulary**。
6. 保存带时间戳的 **Notes**，按当前/全部视频筛选生词，并把笔记或生词导出为 Markdown/CSV。

生词按最新优先保存在本地，最多 500 条。设置页可以单独删除全部生词，也可以重置全部扩展数据。

## 隐私和限制

- 扩展会把标准化视频地址发送给 Supadata，并在使用 AI 功能时把所需字幕上下文发送给 DeepSeek；项目没有开发者后端、账号系统、分析统计、广告或遥测。
- Supadata 固定使用 `mode=native`，没有现成字幕的视频不会自动转为付费 AI 转录。
- 当前支持 Chrome 116 及以上版本和公开的普通 YouTube 视频页面；Shorts、直播、私密或受限视频可能无法使用。
- 本项目以未打包扩展方式安装，不会自动更新。

完整说明请查看 [PRIVACY.md](PRIVACY.md) 和 [SECURITY.md](SECURITY.md)。

## 常见问题

- 没有按钮或侧边栏：在 `chrome://extensions` 重新加载扩展，然后刷新 YouTube 页面。
- 提示需要设置：确认 Settings 中已经保存 Supadata 和 DeepSeek 两把密钥。
- 找不到字幕：确认视频有原生字幕，并检查 Supadata 账号剩余额度。
- AI 请求失败：检查 DeepSeek 密钥、账户余额、限速和服务状态。

## 开发检查

```bash
npm test
npm run check
npm run package
```

修改界面或服务请求后，还需重新加载未打包扩展，并在至少一个有字幕的真实 YouTube 视频上验收。

## 开源许可

MIT。本二开基于 [YouTube Digest 原仓库](https://github.com/zarazhangrui/youtube-digest)，详见 [LICENSE](LICENSE)。
