# YouTube Digest 二开技术实施方案

## 架构概览

项目继续使用 Manifest V3、原生 HTML/CSS/JavaScript 和 Chrome 扩展 API，不新增构建
工具或运行时依赖。现有职责边界保持不变：

```text
YouTube 页面 content.js
        ↑↓ Chrome 消息
后台服务 background.js ←→ DeepSeek / Supadata
        ↑↓ Chrome 消息、chrome.storage.local
侧边栏 sidepanel.*       设置页 options.*
```

已提交的时间戳、主题、字幕搜索和概览模板实现以验证和补充测试为主；未提交的生词本、
导出和数据清理实现需要完成代码审查、缺口修复、文档同步及端到端验收。

## 核心数据结构与接口

### 生词条目

```text
VocabularyEntry
- id: string                    本地唯一标识
- term: string                  去除首尾空白，最多 300 字符
- explanation: string           AI 讲解，最多 5000 字符
- videoId: string               合法 YouTube 视频 ID
- videoTitle: string            最多 500 字符
- channelName: string           最多 300 字符
- timestamp: string             格式化后的 M:SS 或 H:MM:SS
- timestampSeconds: number      非负整数秒
- timestampedUrl: string        标准视频地址及时间参数
- createdAt: number             创建时间毫秒值
```

生词数组保存在 `chrome.storage.local.ytd_vocabulary`，新记录排在最前，仅保留最新
500 条。读取存储内容时需要验证数组形态，避免损坏的本地数据使消息处理失败。

### 后台消息

```text
saveVocabulary({ entry })
  -> { success: true, entry: VocabularyEntry }
  -> { success: false, error: string }

getVocabulary({ videoId?: string | null })
  -> { success: true, vocabulary: VocabularyEntry[] }
  -> { success: false, error: string }

deleteVocabulary({ entryId: string })
  -> { success: true }
  -> { success: false, error: string }
```

后台负责输入归一化、视频 ID 验证、标准链接生成、容量上限和持久化；侧边栏不直接
写生词存储。

### 导出模型

笔记和生词导出函数先通过既有后台消息读取全部记录，再转换为字符串并触发本地下载：

```text
笔记 Markdown: 视频标题 -> 带时间戳链接的笔记列表
生词 Markdown: 视频标题 -> 词语 -> 时间戳链接与讲解
笔记 CSV: timestamp,timestampSeconds,videoTitle,videoId,url,text
生词 CSV: timestamp,timestampSeconds,videoTitle,videoId,url,term,explanation
```

CSV 每个字段都经过统一 RFC 4180 风格转义，并使用 UTF-8 BOM 改善 Excel 中文兼容性；
Markdown 标题和列表内容需要处理会破坏结构的换行。下载完成后延迟释放对象 URL，
避免浏览器尚未读取就被撤销。

## 模块设计

### `settings.js`

- 保持统一的时间戳格式化和 YouTube 视频 ID/标准链接规则。
- 不引入任何凭据常量或二开专用配置。

### `background.js`

- 注册保存、读取、删除生词三类消息。
- 对所有生词字段做类型、长度和数值边界处理。
- 对本地存储异常提供稳定的错误响应。
- 暴露最小测试钩子，仅用于 Node 测试调用处理函数。

### `sidepanel.html` 与 `sidepanel.css`

- 在既有标签栏中加入生词页，在笔记和生词区域提供 Markdown/CSV 导出命令。
- 复用现有按钮、列表、颜色和间距 token，保持阅读工具的紧凑层级。
- 补齐按钮类型、可访问名称、键盘焦点、空数据、保存中、成功和失败状态。
- 确保窄侧栏下标签、筛选器和导出按钮不会溢出或相互遮挡。

### `sidepanel.js`

- AI 讲解成功后允许保存一次生词；保存期间禁用按钮，失败时允许重试。
- 读取并渲染当前视频或全部视频生词；所有外部文本进入 DOM 前进行转义。
- 复用既有时间跳转行为：同一视频原地跳转，其他视频打开带时间戳的新标签页。
- 提供复制词语、复制时间戳链接和删除操作，并显示可观察反馈。
- 把导出序列化拆成可独立测试的纯函数，再由下载函数负责浏览器副作用。

### `options.html` 与 `options.js`

- 数据控制区加入“删除全部生词”。
- 英文和简体中文文案覆盖按钮、成功反馈、数据说明和全量重置确认。
- 全量重置继续保留界面语言及主题偏好，其余扩展数据（包括生词）全部删除。

### 用户文档

- 将 `README.md`、`README.zh-CN.md` 收敛为项目定位、仓库对比、安装配置、使用、
  隐私与限制、开发检查六个主要区块，保持中英文事实一致。
- 当前仓库作为安装入口，原仓库作为上游来源；使用表格对比长视频时间戳、主题、
  字幕搜索、概览模板、生词本、导出和可访问性/可靠性优化。
- 删除重复的编程 Agent 安装话术、逐项价格推算和过长故障排查；易变化的额度与
  价格只保留官方页面链接。
- 更新 `PRIVACY.md`，明确生词内容、AI 讲解、来源元数据的存储位置、保留上限及删除方式。
- 将生词本和 Markdown/CSV 导出从“可尝试的二开想法”移动到当前功能描述。

## 模块交互

### 保存生词

```text
用户选择字幕 -> Explain -> DeepSeek 返回讲解
-> 用户点击保存 -> 侧边栏获取当前播放秒数
-> saveVocabulary -> 后台校验并写入本地存储
-> 返回已保存条目 -> 刷新当前视频生词列表并显示成功状态
```

### 浏览和回看

```text
用户打开 Vocabulary -> getVocabulary(当前 videoId 或 null)
-> 后台返回过滤记录 -> 侧边栏安全渲染
-> 点击时间戳/播放 -> 同视频 seekTo；不同视频打开 timestampedUrl
```

### 导出

```text
用户点击导出 -> getNotes/getVocabulary(null)
-> 纯函数生成 Markdown/CSV -> Blob 下载
-> 空数据或读取失败时显示明确状态，不产生空文件
```

## 文件组织

```text
youtube-digest/
├── background.js               后台生词消息与本地存储
├── settings.js                 共享时间戳及 URL 规则
├── sidepanel.html              生词页与导出控件
├── sidepanel.css               生词及导出交互样式
├── sidepanel.js                生词工作流、导出序列化和下载
├── options.html                数据清理控件
├── options.js                  中英文文案与清理逻辑
├── README.md                   英文功能与使用文档
├── README.zh-CN.md             中文功能与使用文档
├── PRIVACY.md                  本地数据与服务商数据流
├── tests/vocabulary.test.js    生词后台行为测试
├── tests/export.test.js        导出格式与特殊字符测试
├── tests/remix-ui.test.js      二开 UI 接线与可访问状态测试
├── spec.md                     中文需求规格
└── plan.md                     中文技术实施方案
```

## 技术决策

| 决策点 | 选择 | 理由 |
|---|---|---|
| 数据位置 | `chrome.storage.local` | 与笔记和现有隐私模式一致，不引入账号或云端 |
| 生词来源 | 用户在讲解结果中显式保存 | 避免自动采集噪声和不必要的 AI/存储成本 |
| 容量策略 | 最新 500 条 FIFO | 限制本地存储增长，同时满足长期复习需求 |
| 导出范围 | 导出全部本地记录 | 结果稳定明确，不受当前筛选视图影响 |
| 导出实现 | 纯序列化函数 + 浏览器下载薄封装 | 可对边界字符做可靠自动化测试 |
| UI 风格 | 复用现有 token 和列表组件 | 保持侧边栏一致性，避免引入新的视觉系统 |
| 测试方式 | Node 单元/静态契约 + Chrome 实机 | 兼顾核心逻辑、接线和真实扩展 API 行为 |
| API Key | 仅临时运行时使用 | 防止凭据进入文件、Git 差异或测试输出 |
| README 篇幅 | 每种语言不超过 150 行 | 用可扫描结构保留关键操作，减少重复和易过期信息 |
| 仓库关系 | 当前仓库为安装入口，原仓库为上游来源 | 让用户明确二开归属，同时保留原作者项目链接 |

## 实施顺序

1. 修复现有生词测试加载问题，先让后台处理函数得到真实覆盖。
2. 加固后台数据校验、唯一标识和损坏存储容错。
3. 拆分并完善导出序列化，增加 CSV/Markdown 边界测试和用户反馈。
4. 完善侧边栏与设置页状态、文案、可访问性和窄宽度布局。
5. 同步英文、中文 README 与隐私文档。
6. 为主题、字幕搜索、模板和新 UI 接线补充回归测试。
7. 运行完整测试、语法检查、`git diff --check` 和发布检查。
8. 在真实浏览器检查两种主题、窄/宽侧边栏、搜索、模板、生词和导出流程。
9. 用用户提供的 DeepSeek Key 进行仅内存的最小接口验证，不记录请求头或完整响应。

## 测试与验收

### 自动化测试

- 生词：合法保存、字段裁剪、非法 term/videoId、时间戳格式、视频筛选、删除、500 条上限、
  损坏存储容错和 ID 唯一性。
- 导出：空集合、按视频分组、中文、逗号、双引号、CR/LF、多行讲解、Markdown 换行、
  UTF-8 BOM、文件名日期。
- UI 契约：生词标签与筛选状态、四个导出按钮、保存按钮状态、设置清理按钮及双语文案。
- 回归：长时间戳、主题持久化、搜索高亮/导航、模板切换及已有翻译测试。

### 工程检查

```text
npm test
node --check background.js
node --check content.js
node --check settings.js
node --check sidepanel.js
node --check options.js
git diff --check
npm run check
```

### 浏览器验收场景

1. 加载未打包扩展并打开有字幕的普通 YouTube 视频。
2. 切换明亮/深色主题，在窄侧边栏确认标签和按钮无溢出。
3. 搜索字幕并用 Enter、Shift+Enter 导航匹配项。
4. 切换四种概览模板，确认模板变化会重新分析且结果结构完整。
5. 选择字幕获取讲解，保存到生词本，验证当前/全部筛选、复制、回播和删除。
6. 创建包含逗号、引号或换行内容的数据，下载四种导出文件并验证可读性。
7. 在设置页单独清空生词，确认笔记和 API 设置仍存在；执行全量重置后确认生词被删除。

### API 验收

- 首选按仓库要求通过 Context7 核对 DeepSeek 当前接口约定；若当前运行环境未提供
  Context7，则记录该限制，并以官方 DeepSeek 文档和 API 自描述结果作为替代证据。
- Key 只进入单次进程环境变量或扩展本地存储，命令、日志、截图和报告不得回显 Key。
- 最小请求成功返回非空内容即通过；鉴权、余额或模型可用性失败必须记录脱敏状态码和
  服务端错误类型，不把外部失败伪报为实现通过。
