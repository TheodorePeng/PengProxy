# 🤖 Surge Visual Workspace - AI Agent 集成指南 (Agent Integration Guide)

`Surge Visual Workspace` 采用 **Agent-Ready 双模人机协同架构**。AI Agent 可以通过浏览器自动化运行时（如 `ego-browser`、Playwright、Puppeteer 或 Chrome DevTools Protocol），直接与全局挂载的安全接口 `window.__SURGE_WORKSPACE__` 通信。

Agent **完全无需截图辨识或脆弱的 OCR 鼠标点击**，即可在 **10 毫秒** 内完成状态读取、策略编排、动画演示与 Diff 对比拉起。

---

## 🚀 极速上手：Agent 调用示例 (Playwright / Ego-Browser)

```typescript
// 在 Playwright / Ego-Browser 会话中直接执行：
await page.evaluate(() => {
  // 1. 瞬间感知当前配置状态
  const state = window.__SURGE_WORKSPACE__.getState();
  console.log(`当前共有 ${state.policyGroupCount} 个策略组，${state.routingRuleCount} 条规则`);

  // 2. 批量注入优化策略，并触发页面实时演示
  return window.__SURGE_WORKSPACE__.batchApplyPlan({
    message: '✨ AI Agent 已自动将 4 条流媒体规则聚合至 [Media-Proxy] 策略组',
    // 新增策略组
    addGroups: [
      {
        id: 'group-media-proxy',
        name: 'Media-Proxy',
        type: 'url-test',
        members: ['DIRECT'],
        options: {
          'policy-regex-filter': '^🇭🇰|^🇯🇵',
          interval: '300',
          tolerance: '50',
          url: 'http://cp.cloudflare.com/generate_204',
        },
        rawLineIndex: -1,
      },
    ],
    // 新增并重定向规则
    addRules: [
      { ruleType: 'DOMAIN-SUFFIX', pattern: 'netflix.com', targetPolicy: 'Media-Proxy' },
      { ruleType: 'DOMAIN-SUFFIX', pattern: 'disneyplus.com', targetPolicy: 'Media-Proxy' },
    ],
    // 聚焦高亮新策略组
    focusGroupName: 'Media-Proxy',
    // 自动弹出红绿 Diff 对比供人类用户终审
    openReviewModal: true,
  });
});
```

---

## 📋 API 完整参考手册 (`window.__SURGE_WORKSPACE__`)

### 1. 状态感知与 Diff 对账 (Read & Diff)

- **`getState(): SurgeWorkspaceState`**
  - 返回当前工作台的运行版本、文件名、是否为 Demo、策略组数量、规则数量及全量 AST 数据。
- **`getRawText(): string`**
  - 获取当前原始配置文件的全文纯文本。
- **`getModifiedText(): string`**
  - 获取基于当前内存虚拟草稿序列化后的 Surge 配置文件全文。
- **`getDiff(): { summary: { addedLines, removedLines }, hasChanges: boolean }`**
  - 获取行级变动统计及统一 Git 风格 Diff。

---

### 2. UI 演示与视区定位 (UI Orchestration)

- **`focusGroup(groupName: string): boolean`**
  - 平滑滚动至指定策略组行，并触发持续 3 秒的**紫色脉冲光环（Pulse Glow）**。
- **`focusRule(ruleIdOrPattern: string): boolean`**
  - 清除单组过滤，平滑滚动至目标规则行居中，并触发光环高亮。
- **`openGroupDetail(groupName: string): boolean`**
  - 滑出右侧高级设置抽屉（非模态，零模糊）。
- **`closeGroupDetail(): void`**
  - 关闭右侧高级设置抽屉。
- **`openChangesModal(): void`**
  - 弹出全屏红绿 Diff 对比与导出窗口。
- **`closeChangesModal(): void`**
  - 关闭 Diff 弹窗。
- **`filterByGroup(groupName: string | null): void`**
  - 联动过滤规则表，仅显示指向该策略组的规则（传入 `null` 清除过滤）。

---

### 3. 单项原子修改 (Atomic Mutations)

- **`loadProfile(content: string, fileName?: string): void`**
  - 载入新的配置纯文本。
- **`resetDraft(): void`**
  - 瞬间放弃所有未导出的草稿改动，复原为原始文件状态。
- **`addGroup(newGroup: PolicyGroup): void`**
  - 添加单个策略组。
- **`updateGroup(groupName: string, patch: Partial<PolicyGroup>): boolean`**
  - 更新策略组的属性（如类型、成员数组、`options` 正则与测速参数）。
- **`deleteGroup(groupName: string): boolean`**
  - 删除指定策略组。
- **`addRule(rule: Partial<RoutingRule>, targetGroup?: string, insertIndex?: number): void`**
  - 新增分流规则，可选插入优先级位置。
- **`updateRule(ruleId: string, patch: Partial<RoutingRule>): boolean`**
  - 修改指定规则的匹配条件、类型或目标策略组。
- **`deleteRule(ruleIdOrPattern: string): boolean`**
  - 根据规则 ID 或匹配条件删除规则。

---

### 4. 批量智能方案执行 (Batch Plan Execution)

- **`batchApplyPlan(plan: AgentActionPlan): Result`**
  - **最推荐使用的综合接口**。Agent 规划好的策略只需一次调用，系统以原子化方式更新 React 状态，并自动向人类用户呈现：
    1. 右上角弹出精致的 **Agent Toast 简报**；
    2. 受影响的组和规则行**实时闪烁紫色高光**；
    3. 视区平滑滚动居中；
    4. 自动打开红绿 Diff 对比弹窗，供人类一键终审。

---

## 🎯 语义化 DOM 属性查询表 (`data-agent-*`)

若需要配合 Playwright 的 DOM 断言，页面各关键组件均内置了标准语义化属性：

| 选择器 (Selector) | 作用 |
| :--- | :--- |
| `[data-agent-group="<groupName>"]` | 定位左侧策略组表格中的特定策略组行 |
| `[data-agent-rule="<ruleId>"]` | 定位右侧分流规则表格中的特定规则行 |
| `[data-agent-pattern="<pattern>"]` | 根据规则匹配条件（如 `*.google.com`）快速定位 |
