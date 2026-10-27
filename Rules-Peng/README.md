# Rules-Peng 规则集架构说明

本目录存放 Peng 自维护的代理分流规则集（Policy-less generic RULE-SET，兼容 Surge / Loon / Shadowrocket）。本文档供 **用户本人** 和后续维护配置的 **AI Agent** 参考，说明文件职责、归类原则、推荐优先级，以及尚未完成的客户端切换步骤。

> 2026-10-27：原 `AI.list` 已拆分为 `ChatGPT-Peng.list`、`Apple-Intelligence-Peng.list`、`Other-AI-Peng.list`，Notion 规则迁入 `Proxy-Peng.list`，原文件原样归档至 `archive/AI.list`。拆分为**机械拆分**：规则行逐字节复制，没有删除、改写或去重（共 122 条，全部有去处）。根目录下所有规则文件统一采用 `-Peng.list` 命名规范。

---

## 一、架构总览（根目录 6 个 + Google 3 个 = 9 个有效 .list）

```
Rules-Peng/
├── Google/                     # Google 全生态三层正交规则集（详见 Google/README.md）
│   ├── Gemini&Antigravity.list
│   ├── Google-General.list
│   └── YouTube&Music.list
├── ChatGPT-Peng.list           # OpenAI / ChatGPT 专属 + 其依赖的第三方服务
├── Apple-Intelligence-Peng.list # Apple Intelligence / Siri / iCloud Private Relay
├── Other-AI-Peng.list          # 其他 AI：Copilot、Claude、OpenRouter/Groq/Agnes、共享 AI 基础设施
├── Clubhouse-Peng.list         # Clubhouse 控制面与静态资源
├── Proxy-Peng.list             # 普通代理：小众站点、Notion、Tabbit、RemNote、Reddit 等
├── Direct-Peng.list            # 直连：欧路词典、Agora RTC、SEAGM 等
└── archive/                    # 已停用的历史规则集（不被任何配置引用）
```

| 文件 | 有效规则 | 职责边界 |
|---|---:|---|
| `ChatGPT-Peng.list` | 60 | OpenAI 一方域名、登录/支付/客服/遥测依赖、LiveKit 语音、Google 登录链（§12）及精准补漏域名 |
| `Apple-Intelligence-Peng.list` | 17 | Siri / Apple Intelligence 端点，以及 Private Relay（`mask*.icloud.com`、`apple-relay.*`） |
| `Other-AI-Peng.list` | 43 | Microsoft Copilot / Bing AI、Claude、OpenRouter / Groq / Agnes、Shared AI Infrastructure |
| `Clubhouse-Peng.list` | 7 | Clubhouse 控制面与静态资源；RTC 音视频已迁至 Direct-Peng |
| `Proxy-Peng.list` | 54 | 不需要专属节点的普通代理服务 |
| `Direct-Peng.list` | 30 | 需要绕过代理的服务 |

## 二、归类原则

1. **专属策略优先，规模其次**：需要独立出口（特定地区、纯净 IP）的服务才单独建文件；域名多只是次要理由。
2. **AI 服务与普通服务分开**：AI 相关域名放进 `ChatGPT-Peng.list` / `Apple-Intelligence-Peng.list` / `Other-AI-Peng.list`；非 AI 的小众服务放进 `Proxy-Peng.list`。仅仅带有 AI 功能的通用工具（如 Notion）算普通服务。
3. **Google 体系独立维护**：Google 相关规则只在 `Google/` 中维护，不要另建 Google 综合文件。
4. **新增服务时**：先判断是否需要专属策略，再决定放入哪个已有文件；不要轻易新建文件。

## 三、推荐优先级（Surge 自上而下，首次命中即终止）

```
Google/Gemini&Antigravity → Google/Google-General → Google/YouTube&Music
→ Direct-Peng（保持当前位置）
→ ChatGPT-Peng → Apple-Intelligence-Peng → Other-AI-Peng
→ Proxy-Peng
```

`Clubhouse-Peng.list` 在 Surge 中目前被注释掉，维持现状即可。

## 四、已知风险（拆分时按原样保留，后续可单独审查）

- **`IP-ASN,14061,no-resolve`**（Other-AI-Peng.list）：AS14061 = DigitalOcean，整个网段都会被匹配，并非 AI 专属。
- **宽泛 SaaS 后缀**（Other-AI-Peng.list）：`stripe.com`、`sentry.io`、`segment.io`、`algolia.net`、`launchdarkly.com` 等会把其他网站的同类流量一并引到 AI 策略。
- **DOMAIN-KEYWORD**（Other-AI-Peng.list）：`claude`、`anthropic`、`openrouter`、`groq`、`agnes-ai` 会匹配所有含该字符串的主机名。
- **跨文件重复 5 条**（ChatGPT-Peng.list 与 Other-AI-Peng.list）：`browser-intake-datadoghq.com`、`featuregates.org`、`intercom.io`、`intercomcdn.com`、`turn.livekit.cloud`；实际由排在前面的规则集生效。
- **Google 登录链**（ChatGPT-Peng.list §12）：Surge 中被 `Google/` 先行命中，不会生效；在没有引用 `Google/` 的 Loon / Shadowrocket 中仍然生效。

## 五、客户端切换清单（⚠️ 尚未执行）

> [!WARNING]
> Surge / Shadowrocket / Loon 目前仍从 GitHub raw `main` 分支引用 `Rules-Peng/AI.list`。**完成下面的配置切换之前，不要 push 本次拆分的 commit**，否则该 URL 会返回 404，三个新文件也不会生效。

**第一步：行为不变的替换。** 把原 `AI.list` 那一行替换成三行，放在原位置，并绑定同一个策略：

| 客户端 | 现有行 | 替换为 |
|---|---|---|
| Surge (`Surge-Peng.conf`) | `RULE-SET,…/Rules-Peng/AI.list,"💬 AI",…` | `…/Rules-Peng/ChatGPT-Peng.list`、`…/Rules-Peng/Apple-Intelligence-Peng.list`、`…/Rules-Peng/Other-AI-Peng.list`，三行都绑定 `"💬 AI"` |
| Shadowrocket (`Shadowrocket-Peng.conf`) | `RULE-SET,…/Rules-Peng/AI.list,💬 AI,…` | 同上，三行都绑定 `💬 AI` |
| Loon (`Loon-Peng.conf`) | `…/Rules-Peng/AI.list, policy=Select, tag=AI, …` | 三行 `policy=Select`，tag 分别为 `ChatGPT` / `Apple-Intelligence` / `Other-AI` |

唯一的行为变化：**Notion** 会从 `💬 AI`（Loon 里是 `Select`）改走 `🌐 Proxy-Peng`（Loon 里是 `GitHub&OtherProxy`）。

**第二步（可选）**：新文件运行稳定后，再为 ChatGPT / Apple-Intelligence 建立专属策略组（例如 Apple 绑定美国节点）。

**验证**：在 Surge 请求日志中确认 `chatgpt.com`、`claude.ai`、`copilot.microsoft.com`、`guzzoni.apple.com`、`notion.so` 分别命中预期的规则集，然后再 push PengProxy 仓库。
