# ⚡ Surge Visual Workspace

> 为非编程用户打造的 **Surge 可视化配置工作台**。采用 **Notion Database 风格的左右对比双表（Resizable Stack View）**，让复杂的策略组与分流规则一目了然，支持零风险虚拟编辑、实时红绿 Diff 对比与 AI Agent（`surge-operator-peng`）自动化变更导出。

🚀 **线上直达链接 (Cloudflare Pages)**: [https://surge-visual-workspace.pages.dev/](https://surge-visual-workspace.pages.dev/)

---

## ✨ 核心特性

- **🛡️ 纯前端本地安全优先（Local-First & Zero-Risk）**：
  - 本地配置文件仅在浏览器内存中解析，**绝不上云**，节点凭证与隐私 100% 安全。
  - 网页对本地配置完全只读，绝不自动静默改写本地原文件。
- **📊 Notion Database 风格双表联动**：
  - **策略组表（Policy Groups）**：管理 `select`、`url-test`、`fallback`、测速容差与成员。
  - **分流规则表（Routing Rules）**：清晰呈现 `RULE-SET`、`PROCESS-NAME`、`DOMAIN-SUFFIX` 等。
  - **双向关系联动（Relation）**：点击策略组，右侧规则表自动联动过滤出指向该组的全部规则；修改规则目标策略组时，下拉框实时绑定所有可用策略组。
- **🎛️ 左右自由对比与宽度调节（Resizable Split View）**：
  - 左右并排对比，中间分割条支持鼠标任意拖拽或滚轮滑动调宽。
  - 支持一键互换左右表格位置（策略组 ⇋ 规则表）。
- **✋ 基于 @dnd-kit 的平滑拖拽重排**：
  - 规则优先级支持拖拽手柄直观调整上下匹配顺序。
- **🔍 强大变更工作区（Changes & Diff Workspace）**：
  - **Git 风格 Diff 对比**：直观高亮新增与删除行。
  - **配置代码段复制**：仅复制变更部分，方便手动粘贴。
  - **整文件导出**：无损保留 `[General]`、`[Host]` 等所有未改动段落与注释。
  - **AI Agent 执行指令**：一键生成符合 `surge-operator-peng` 规范的自动化变更计划，直接发给本机 Agent 即可先备份再打补丁。

---

## 🛠️ 本地运行与开发

```bash
# 进入工程目录
cd surge-visual-workspace

# 安装依赖
npm install

# 启动本地开发服务 (默认 http://localhost:5173)
npm run dev

# 运行无损解析还原单测 (基于真实 Surge-Peng.conf 验证)
npm test

# 生产环境打包
npm run build
```

---

## ☁️ Cloudflare Pages 免费部署向导 (100% Free Plan)

本项目为纯静态 SPA，无需任何后端服务器与数据库，**完全在 Cloudflare Pages 免费配额内运行，终身 $0 费用**。

### 部署步骤：

1. **登录 Cloudflare 控制台**：
   访问 [Cloudflare Dashboard](https://dash.cloudflare.com/)，在左侧导航栏点击 **Compute (Workers) -> Workers & Pages**。
2. **创建 Pages 应用**：
   点击 **Create application** -> 选择 **Pages** 选项卡 -> 点击 **Connect to Git**。
3. **关联 GitHub 仓库**：
   选择并授权 `TheodorePeng/PengProxy` 仓库。
4. **填写构建设置（关键步骤）**：
   - **Project name**: `surge-visual-workspace`（或您喜欢的项目名）
   - **Production branch**: `main`
   - **Framework preset**: `Vite`
   - **Root directory**: `surge-visual-workspace` 👈 **【重要】务必填入此项，指向当前子目录！**
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Environment variables**: 无需配置任何变量。
5. **点击 Save and Deploy**：
   稍等数十秒构建完成，即可获得专属免费域名（如 `https://surge-visual-workspace.pages.dev`）。

---

## 🔒 隐私与安全说明

- 本工具部署在 Cloudflare Pages 上仅提供 HTML/JS/CSS 静态文件托管。
- 当您在网页中点击“打开本地配置”载入 `Surge-Peng.conf` 时，浏览器仅在客户端本地沙箱中读取并解析，**没有任何网络上传行为**。
- 您可在浏览器 DevTools 网络（Network）面板随时审查，所有虚拟编辑与 Diff 计算均在您的设备离线完成。
