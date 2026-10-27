# 🛡️ PengProxy

Peng's Personal Proxy & Routing Configuration Repository.

---

## ⚡ Surge Visual Workspace (网页端可视化工作台)

为非编程用户量身打造的 **Surge 可视化配置工作台**，采用 Notion Database 风格双表联动与无损 AST 引擎，支持零风险虚拟编辑、实时 Diff 对比与 AI Agent 导出。

🔗 **线上直达链接 (Cloudflare Pages)**:  
👉 **[https://surge-visual-workspace.pages.dev/](https://surge-visual-workspace.pages.dev/)**

---

## 📂 仓库目录结构

```
PengProxy/
├── surge-visual-workspace/   # ⚡ Surge 可视化配置工作台源码 (React + Vite + Tailwind)
├── Rules-Peng/               # 📋 Surge 规则分流配置集合
└── Archive/                  # 📦 历史配置文件归档 (Loon, QuantumultX)
```

---

## 🔒 隐私与安全说明

- **100% 本地内存解析**：无论是打开本地文件还是粘贴配置，均在你的浏览器客户端沙箱中离线运行，**绝不向任何云端上传**节点与凭证信息。
- **只读零风险保护**：网页端完全只读，绝不自动覆盖或改写你本地的 `Surge-Peng.conf` 文件。
