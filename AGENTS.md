This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Project Documentation & Codebase Index (项目文档与工程索引)

### 1. 项目文档索引 (Documentation Index)

- **产品需求文档 (PRD v1.1)**: [`docs/PRD.md`](docs/PRD.md)
  - 核心业务基准：Android 优先定位、词库优先原则、按需选择记录、结构化笔记树形规则（Uniform Children Rule）、词汇多对多共享引用模型、五大模块规格、首版开发范围。
- **项目综合架构说明文档**: [`README.md`](README.md)
  - 项目全局介绍：功能特性详述（双模式缩放裁剪勾画、查看页就地笔记整理与中英二选一、Markdown 流式 AI 答疑、智能拼写纠错等）、技术栈选型、目录结构、本地开发与 Release 打包指南。
- **开发者与 AI 协作规范**: [`AGENTS.md`](AGENTS.md)（本文件）
  - Expo SDK 57 / React Native 开发准则、全项目文档与源码架构索引、CNG 原生目录维护规范。
- **开源许可证**: [`LICENSE`](LICENSE)
  - MIT License 开源协议。

### 2. 核心架构与源码目录索引 (Codebase Architecture Index)

- **`src/app/` (Expo Router 页面路由与导航)**:
  - `(tabs)/index.tsx`: 核心查询与记录主页面（图文多模态查询、就地整理笔记、流式 AI 助教、最近 10 条快照）
  - `(tabs)/guess.tsx`: 猜词辅助页面（4 阶段引导式启发猜词，支持一键沉淀为笔记）
  - `(tabs)/notebooks.tsx`: 笔记管理页面（树形笔记层级、词汇就地快捷编辑、批量管理操作、筛选导出与备份）
  - `(tabs)/review.tsx`: 词汇复习主页
  - `(tabs)/profile.tsx`: 我的与设置（LLM 供应商配置、模型选择、多模态视觉开关、强调色与明暗主题）
  - `vocabulary/[id].tsx`: 词汇详情页面（全字段查看、就地编辑与多笔记归属调整）
- **`src/components/` (业务与公共 UI 组件)**:
  - `query/`: 查询与记录模块（`InfoView.tsx`, `QueryInputSection.tsx`, `RegionDrawer.tsx`, `AssistantSheet.tsx`, `OrganizeBar.tsx`, `OrganizeModal.tsx`, `RecentQueriesModal.tsx`）
  - `notebook/`: 笔记模块（`VocabularyItem.tsx`, `QuickEditVocabModal.tsx`, `BatchManageModal.tsx`, `ExportModal.tsx`, `AnnotationModal.tsx`）
  - `guess/`: 猜词模块（`GuessClueCard.tsx`）
  - `common/`: 基础公共 UI 组件（`Button.tsx`, `Card.tsx`, `Badge.tsx`, `Input.tsx`, `MarkdownView.tsx`）
- **`src/context/` (全局状态管理)**:
  - `NotebookContext.tsx`: 笔记与词汇数据中心（本地持久化存储、多对多实体引用、导入导出与全量备份恢复）
  - `HistoryContext.tsx`: 最近 10 条查询快照隔离管理
  - `SettingsContext.tsx`: 设置与 LLM 供应商管理（含 SecureStore API Key 安全持久化）
  - `ThemeContext.tsx`: 强调色、字体缩放与明暗主题管理
- **`src/services/` (数据与服务层)**:
  - `llm/client.ts`: LLM 客户端（OpenAI 兼容协议、多模态视觉识图、SSE 流式聊天、错误分类与友好提示）
  - `llm/prompts.ts`: 核心 System Prompt 定义（词汇深度解析、图片提取、4 阶段猜词、结构化错误与建议返回）
  - `llm/errors.ts`: 结构化 LLM 异常体系与错误分类枚举定义
  - `storage/`: 本地数据存储与备份服务（AsyncStorage + SecureStore）
- **`src/types/` (TypeScript 类型系统)**:
  - `src/types/index.ts`: 全局数据类型定义（Vocabulary, Meaning, Notebook, QueryResult, QueryFeedback 等）
- **`src/utils/` (通用工具库)**:
  - `phonetic.ts`: 国际音标（IPA）规范化与字体安全清洗
  - `id.ts`: 唯一 ID 生成器
  - `date.ts`: 日期与时间格式化工具

### 3. 构建产物与发布索引 (Release Artifacts)

- **本地打包 Release APK**: `android/app/build/outputs/apk/release/app-release.apk`
- **GitHub 远端公开仓库**: `https://github.com/Tucyan/LexiNote` (主分支: `master`)

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
