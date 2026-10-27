# Google 全生态三层正交分流规则集 (Google 3-Tier Orthogonal Rule-Sets)

本目录存放经过本机流量实测、二进制逆向提取与正交去重后的 **Google 全生态三层分流规则集**。本说明文档旨在为 **用户本人** 以及后续维护配置的 **AI Agent** 提供明确的设计原则、优先级契约与防串线维护铁律。

---

## 一、 核心设计理念：为什么要拆分为三层？

在代理日常使用中，Google 旗下的不同业务对 **节点 IP 纯净度/地区** 与 **流量带宽成本** 有着截然不同的诉求。本目录通过三张正交规则列表，实现按「业务价值 + 流量成本」的精准分流：

| 优先级排序 | 规则集文件 | 对应策略组 (示例) | 节点质量与成本画像 | 核心承载业务范围 |
| :--- | :--- | :--- | :--- | :--- |
| **第 1 优先级**<br>*(最上方)* | [`Google-Gemini&Antigravity.list`](./Google-Gemini&Antigravity.list) | `Gemini&Antigravity` | **顶级纯净节点**<br>*(IP 纯净度极高、锁美区/原生、价格昂贵、流量额度低)* | • **Antigravity 全家桶**：App / IDE / Tools / `agy` CLI 专属通信、Cloud Code 后端、Cloud Run 自动更新服务<br>• **Google AI 生态**：Gemini、AI Studio、NotebookLM、Vertex AI、DeepMind、Colab<br>• **统一登录鉴权链**：Google OAuth2 / STS / Account 令牌交换（确保登录态 IP 与 AI 服务一致） |
| **第 2 优先级**<br>*(中间层)* | [`Google-General.list`](./Google-General.list) | `🔍 Google` | **优质生产力节点**<br>*(连接稳定、低延迟、质量极高、配额相对有限)* | • **Google 搜索与门户**：`google.com` 及全球各国家/地区域名后缀<br>• **Google Workspace 办公与云盘**：Google Drive、Docs、Sheets、Slides、Gmail、Calendar、Meet<br>• **公共 API 与基础设施**：GCP、Firebase、Play 商店、Android/Chrome 同步、`gstatic.com`、`googleapis.com`、`googleusercontent.com`<br>• **Google 核心 IP 段**：`AS15169` / `AS396982` 全球核心 IPv4/IPv6 网段 |
| **第 3 优先级**<br>*(最下方)* | [`Google-YouTube.list`](./Google-YouTube.list) | `📹 YouTube&Music` | **便宜大流量节点**<br>*(带宽充裕、价格低廉或低倍率，专为高吞吐流媒体准备)* | • **核心视频流切片 (占 99%+ 流量)**：`*.googlevideo.com`（如 `rr1---sn-*.googlevideo.com` 4K/1080p 视频流）<br>• **YouTube & Music 主站**：`youtube.com`、`music.youtube.com`、`studio.youtube.com`、`tv.youtube.com`、`youtu.be`<br>• **媒体静态资源 CDN**：视频缩略图 (`*.ytimg.com`)、频道头像 (`*.ggpht.com`) 与专属流媒体 IP 段 |

---

## 二、 路由匹配流程与穿透原理

在 Surge / Loon / Shadowrocket 中，规则自上而下按 **First-Match（首次命中即终止）** 原则执行：

```text
[Google 系网络请求]
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│ 第 1 层：Google-Gemini&Antigravity.list                  │
│ 命中 Gemini / Antigravity / AI Studio / NotebookLM / 鉴权 │──命中──> 🚀 走顶级纯净节点 (高质/低额度)
└──────────────────────────────────────────────────────────┘
       │ 未命中
       ▼
┌──────────────────────────────────────────────────────────┐
│ 第 2 层：Google-General.list                             │
│ 命中 Google 搜索 / Drive 网盘 / Gmail / Docs / 常规 API  │──命中──> 🔍 走优质生产力节点 (高质/高稳定)
│ (注：已专门剥离 DOMAIN-KEYWORD,google，不拦截 googlevideo)│
└──────────────────────────────────────────────────────────┘
       │ 未命中 (YouTube 视频流与主站 100% 平滑穿透)
       ▼
┌──────────────────────────────────────────────────────────┐
│ 第 3 层：Google-YouTube.list (置于最下方)                 │
│ 命中 googlevideo.com / youtube.com / ytimg.com / ggpht   │──命中──> 📹 走便宜大流量节点 (大带宽/低成本)
└──────────────────────────────────────────────────────────┘
```

### 实测全链路路由匹配仿真表（严格按照 1 → 2 → 3 顺序）

以下为根据本目录最新规则集，对各典型业务域名的实测流向验证基准表（后续修改规则后，可用于回归核验）：

| 访问域名 | 业务真实属性 | 实际命中的规则层级 | 匹配到的底层规则 | 走向的策略组与节点定位 |
| :--- | :--- | :--- | :--- | :--- |
| `gemini.google.com` | Gemini 网页交互 | **1. Gemini&Antigravity** | `DOMAIN,gemini.google.com` | 🚀 **顶级纯净节点** |
| `antigravity.goog` | Antigravity 内部端点 | **1. Gemini&Antigravity** | `DOMAIN-SUFFIX,antigravity.goog` | 🚀 **顶级纯净节点** |
| `generativelanguage.googleapis.com` | Gemini 模型 API | **1. Gemini&Antigravity** | `DOMAIN,generativelanguage.googleapis.com` | 🚀 **顶级纯净节点** |
| `daily-cloudcode-pa.googleapis.com` | Antigravity 编程后端 | **1. Gemini&Antigravity** | `DOMAIN,daily-cloudcode-pa.googleapis.com` | 🚀 **顶级纯净节点** |
| `www.google.com` | Google 网页搜索 | **2. Google General** | `DOMAIN,www.google.com` | 🔍 **优质生产力节点** |
| `drive.google.com` | Google Drive 网盘 | **2. Google General** | `DOMAIN-SUFFIX,google.com` | 🔍 **优质生产力节点** |
| `docs.google.com` | Google Docs 文档协同 | **2. Google General** | `DOMAIN-SUFFIX,google.com` | 🔍 **优质生产力节点** |
| `mail.google.com` | Gmail 邮件收发 | **2. Google General** | `DOMAIN-SUFFIX,google.com` | 🔍 **优质生产力节点** |
| `storage.googleapis.com` | Google 云存储公共 API | **2. Google General** | `DOMAIN,storage.googleapis.com` | 🔍 **优质生产力节点** |
| `fonts.gstatic.com` | 字体 CDN 静态资源 | **2. Google General** | `DOMAIN-SUFFIX,gstatic.com` | 🔍 **优质生产力节点** |
| **`rr1---sn-a5mekndd.googlevideo.com`** | **YouTube 4K/1080p 视频切片** | **3. Google-YouTube** | `DOMAIN-SUFFIX,googlevideo.com` | 📹 **便宜大流量节点** |
| **`rr2---sn-5n5ip-ioqd.googlevideo.com`** | **YouTube 视频流分发分块** | **3. Google-YouTube** | `DOMAIN-SUFFIX,googlevideo.com` | 📹 **便宜大流量节点** |
| **`www.youtube.com`** | **YouTube 网页端主站** | **3. Google-YouTube** | `DOMAIN-SUFFIX,youtube.com` | 📹 **便宜大流量节点** |
| **`music.youtube.com`** | **YouTube Music 流媒体** | **3. Google-YouTube** | `DOMAIN,music.youtube.com` | 📹 **便宜大流量节点** |
| **`i.ytimg.com`** | **YouTube 视频封面与缩略图** | **3. Google-YouTube** | `DOMAIN-SUFFIX,ytimg.com` | 📹 **便宜大流量节点** |
| **`yt3.ggpht.com`** | **YouTube 频道图标与头像** | **3. Google-YouTube** | `DOMAIN,yt3.ggpht.com` | 📹 **便宜大流量节点** |
| **`youtu.be`** | **YouTube 短链跳转** | **3. Google-YouTube** | `DOMAIN-SUFFIX,youtu.be` | 📹 **便宜大流量节点** |

---

## 三、 AI Agent 与维护者必须遵守的「五大防串线铁律」

后续任何 AI Agent 或自动化脚本在修改、扩充本目录下的规则文件或生成客户端配置时，**必须严格遵守以下不可违背的约束（Invariants）**：

### 铁律 1：严禁颠倒三张列表的上下优先级顺序
* 在客户端 `[Rule]` 中，**必须严格固定**为：
  1. `Google-Gemini&Antigravity.list`
  2. `Google-General.list`
  3. `Google-YouTube.list`
* **严禁**为了偷懒而将 `Google-YouTube.list` 移到 `Google-General.list` 上方；任何由顺序引发的潜在拦截冲突，都必须通过**净化第 1、2 层的规则精度**来解决，而非改动用户的优先级顺序。

### 铁律 2：`Google-General.list` 严禁包含 `DOMAIN-KEYWORD,google` 等宽泛通配
* 由于 `Google-General.list`（第 2 层）排在 `Google-YouTube.list`（第 3 层）上方：
  * **绝对禁止**在 `Google-General.list` 中添加 `DOMAIN-KEYWORD,google`、`USER-AGENT,*Google*` 或 `USER-AGENT,com.google.*`！
  * **原因**：YouTube 的核心视频流域名 `*.googlevideo.com` 中包含子串 `google`。一旦第 2 层存在 `DOMAIN-KEYWORD,google`，所有 4K/1080p 视频流量都会在第 2 层被提前截留到昂贵节点，导致第 3 层的便宜大流量节点彻底被架空！
  * **同理**：`Google-General.list` 中严禁出现 `googlevideo.com`、`youtube.com`、`youtu.be`、`yt.be`、`ytimg.com`、`ggpht.com`。

### 铁律 3：`Google-Gemini&Antigravity.list` 严禁混入通用搜索与云盘域名
* 第 1 层对应最昂贵、额度最珍贵的节点，必须保持极度克制：
  * **绝对禁止**写入 `DOMAIN,www.google.com`、`DOMAIN-SUFFIX,google.com`、`DOMAIN-SUFFIX,gstatic.com`、`DOMAIN-SUFFIX,googleusercontent.com`、`DOMAIN,www.googleapis.com`、`DOMAIN,storage.googleapis.com` 或 `DOMAIN,jnn-pa.googleapis.com`。
  * 上述通用域名必须留在第 2 层 `Google-General.list`，防止日常网页搜索或 Google Drive 下载大文件耗尽第 1 层的昂贵额度。

### 铁律 4：`Google-YouTube.list` 严禁混入通用 Google 域名或 AI 域名
* **绝对禁止**在 `Google-YouTube.list` 中写入 `DOMAIN-SUFFIX,google.com`、`DOMAIN-SUFFIX,gstatic.com` 或 `notebooklm` 相关规则。
* *(历史背景：已归档至 `../archive/YouTube&Music.list` 的旧版列表中曾误包含 `google.com` 与 `notebooklm.google`，导致 Google 搜索与 NotebookLM 被错误路由至 YouTube 节点，现已彻底根除。)*

### 铁律 5：保持纯净的 Policy-less 跨客户端兼容语法
* 三张列表均采用**不带策略名后缀**的通用 `RULE-SET` 格式，以便同时在 **Surge (macOS / iOS)**、**Loon** 与 **Shadowrocket** 中复用。
* 除 `IP-CIDR` / `IP-CIDR6` 规则末尾必须附带 `,no-resolve` 外，所有 `DOMAIN`、`DOMAIN-SUFFIX`、`DOMAIN-KEYWORD`、`USER-AGENT` 规则末尾**不得附带** `,PROXY`、`,DIRECT` 或具体策略组名称。

---

## 四、 客户端配置引用示例

### 1. Surge (`Surge-Peng.conf`) — 本地路径引用（适合本机测试）
```ini
[Rule]
# 1. 优先级第一：Gemini 与 Antigravity -> 顶级纯净节点
RULE-SET,/Users/peng/Documents/GitHub-Peng/Proxy-Peng/PengProxy/Rules-Peng/Google/Google-Gemini&Antigravity.list,Gemini&Antigravity,no-resolve

# 2. 优先级第二：Google General 生产力与通用服务 -> 优质高稳定节点
RULE-SET,/Users/peng/Documents/GitHub-Peng/Proxy-Peng/PengProxy/Rules-Peng/Google/Google-General.list,"🔍 Google","update-interval=86400"

# 3. 优先级第三（最下方）：YouTube & YouTube Music -> 便宜大流量节点
RULE-SET,/Users/peng/Documents/GitHub-Peng/Proxy-Peng/PengProxy/Rules-Peng/Google/Google-YouTube.list,"📹 YouTube&Music","update-interval=86400"
```

### 2. Surge / Shadowrocket — GitHub Raw 远程引用（推送至仓库后跨设备同步）
```ini
[Rule]
# 1. 优先级第一：Gemini 与 Antigravity -> 顶级纯净节点
RULE-SET,https://raw.githubusercontent.com/TheodorePeng/PengProxy/refs/heads/main/Rules-Peng/Google/Google-Gemini%26Antigravity.list,Gemini&Antigravity,no-resolve

# 2. 优先级第二：Google General 生产力与通用服务 -> 优质高稳定节点
RULE-SET,https://raw.githubusercontent.com/TheodorePeng/PengProxy/refs/heads/main/Rules-Peng/Google/Google-General.list,"🔍 Google","update-interval=86400"

# 3. 优先级第三（最下方）：YouTube & YouTube Music -> 便宜大流量节点
RULE-SET,https://raw.githubusercontent.com/TheodorePeng/PengProxy/refs/heads/main/Rules-Peng/Google/Google-YouTube.list,"📹 YouTube&Music","update-interval=86400"
```

---

## 五、 历史归档记录 (`../archive/`)

原位于 `Rules-Peng/` 根目录下的以下两张旧表已被本目录的三层新表正式替代，并移入 [`../archive/`](../archive/) 归档备查：
1. [`../archive/Gemini&Antigravity.list`](../archive/Gemini&Antigravity.list) ➔ 由 [`Google-Gemini&Antigravity.list`](./Google-Gemini&Antigravity.list) 替代（剔除了误混入的 `www.google.com`、`gstatic.com`、`googleusercontent.com` 等通用域名，并新增了本机逆向提取的 Antigravity 4 端二进制全量端点）。
2. [`../archive/YouTube&Music.list`](../archive/YouTube&Music.list) ➔ 由 [`Google-YouTube.list`](./Google-YouTube.list) 替代（剔除了导致严重串线的 `google.com`、`gstatic.com` 与 `notebooklm` 规则，补充了浏览器实测捕获的流媒体与头像 CDN 域名）。
