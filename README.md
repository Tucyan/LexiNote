# LexiNote 📖✨

> **AI 辅助英语词汇查询、结构化笔记与语境复习应用**  
> 基于 React Native + Expo (SDK 57) + TypeScript 构建，Android 优先，本地优先。

---

## 🌟 核心设计原则

- **词库优先**：查询时优先检索已保存的本地词库，已有记录直接呈现，按需补充。
- **AI 辅助**：支持 DeepSeek 等主流 LLM，具备多模态识图（Vision）理解、语境释义及分步提示能力。
- **按需记录**：字段级选择性保存，可自主勾选待记录的中文释义、英文释义、例句、批注等。
- **结构化笔记**：通过树形结构层级化组织笔记，支持多个笔记分类共享引用同一词汇实体。
- **便捷操作**：支持双模式放大勾画图文提取、笔记就地快捷编辑与批量管理。
- **本地优先**：全部笔记数据持久化保存在本地，支持离线管理、筛选导出与全量安全备份恢复。

---

## 📱 主要功能模块

### 1. 查询和记录 (Search & Record)
- **多途径输入**：支持纯文本输入、图片输入及「图片 + 附加要求」组合查询。
- **全屏双模式图片勾画**：
  - **放大与移动模式 (Zoom & Pan)**：支持双指捏合缩放、拖拽移动与快速双击缩放。
  - **精准框选模式 (Draw & Select)**：锁定底图后自由拉框，精确选定目标词汇或段落。
- **图文提取与 AI 解析**：适配多模态 Vision 模型（如 `deepseek-flash` 等），智能 OCR 并结合上下文进行深度释义。
- **可折叠 / 全屏 AI 对话助手**：针对当前词条无缝展开追问与语境探讨。
- **最近 10 条查询快照**：FIFO 自动维护历史记录，支持完整状态重开与清理。

### 2. 猜词辅助 (Context Guessing)
- 提供沉浸式 4 阶段启发式猜词引导：
  - 阶段 1：语境背景与词性线索
  - 阶段 2：词根词缀及构词分析
  - 阶段 3：近义词对比与语义范围
  - 阶段 4：最终释义揭晓与用法详解
- 支持一键将猜测内容无缝转入「查询和记录」页面沉淀为笔记。

### 3. 笔记管理 (Notebooks)
- **全局词库视图**：内置系统级「全部词汇」与「默认笔记」。
- **分类与目录管理**：支持自定义分类、重命名、嵌套子目录。
- **词汇条目就地快速编辑**：
  - 弹窗内快速修改拼写、音标、词性、中英文释义、例句、个人备注与标签。
  - 支持多笔记本分类勾选归属（多对多引用）。
- **层级安全删除**：
  - 支持「仅从当前笔记移除引用」与「彻底从词库删除实体」双重选择。
- **批量管理模式**：
  - 支持多选勾选、一键全选。
  - 批量移入指定分类、批量从当前分类移除、批量彻底删除。
- **数据导出与全量备份**：
  - 条件筛选导出（Markdown / JSON）。
  - 一键全量数据快照备份与导入恢复（不含 API Key 等敏感信息）。

### 4. 设置与我的 (Settings & Profile)
- **LLM 供应商灵活配置**：
  - 预设 DeepSeek 供应商，支持自定义 Base URL、Model ID 及视觉多模态模型开关。
  - API Key 采用系统级安全存储（Expo SecureStore），防泄露。
- **外观个性化**：浅色、深色、跟随系统，以及 6 款精心调配的预设强调色。

---

## 🛠️ 技术栈

| 模块 | 技术选型 |
| :--- | :--- |
| **运行时框架** | React Native 0.86.3 |
| **应用套件** | Expo SDK ~57.0.27 (New Architecture) |
| **开发语言** | TypeScript ~6.0.3 |
| **路由导航** | Expo Router ~57.0.25 (基于文件系统的路由 `src/app/`) |
| **本地持久化** | `@react-native-async-storage/async-storage` |
| **安全凭据存储** | `expo-secure-store` (Android Keystore 加密) |
| **多媒体与文件** | `expo-image-picker`, `expo-file-system`, `expo-sharing` |
| **矢量图标** | `@expo/vector-icons` (Ionicons) |

---

## 🚀 本地开发与构建

### 1. 安装依赖
```bash
npm install
```

### 2. 启动开发服务器
```bash
npx expo start
```

### 3. 静态检查
```bash
npx tsc --noEmit        # TypeScript 类型检查
npx expo-doctor         # Expo 配置与依赖诊断
```

### 4. 本地 Android 构建
```bash
# 导出 Debug APK
cd android && gradlew.bat :app:assembleDebug

# 导出 Release APK
cd android && gradlew.bat :app:assembleRelease
```
产物目录：`android/app/build/outputs/apk/release/app-release.apk`

---

## 📄 开源许可证

本项目采用 [MIT License](LICENSE) 授权。
