---
name: pixso-mcp
description: 使用 Pixso MCP 在当前仓库中读取 Pixso 设计稿、节点、标注、切图与样式信息，并落地为 React + Antd + Less 页面实现。用于用户提到“Pixso MCP”“Pixso 设计稿还原”“按设计稿开发页面”“根据设计稿生成前端页面”“下载切图并接入页面”“把设计稿转成 Antd 页面”“把 Pixso 页面做成 React 页面”等场景；当用户消息中直接提供包含 `pixso`、`pixso.cn`、`app.pixso.cn` 或明显属于 Pixso 设计稿分享页的链接时，也优先使用此 skill。强制遵循当前仓库的前端约束：页面样式使用 Less、每页仅一个根类且保持嵌套、类名使用 kebab-case、禁止 font-family、全局通用视觉优先走 ConfigProvider theme、局部样式走页面类名、默认隐藏滚动条、切图压缩后放入 frontend/src/assets。
---

# Pixso MCP

## 目标

基于 Pixso MCP 提取设计信息，并在当前仓库的 `frontend/` 中实现可维护的页面代码。

先复用现有工程能力，再落地最小必要代码，不额外引入新的样式体系或无关抽象。

## 执行流程

1. 使用 Pixso MCP 读取页面结构、尺寸、间距、颜色、状态、素材与交互层级。
2. 先检查仓库现有约束：
   - `frontend/src/App.tsx`
   - `frontend/src/index.less`
   - `frontend/src/styles/mixin.less`
3. 判断页面哪些部分可直接使用 Antd 基础组件，哪些部分需要补充局部 Less。
4. 为每个页面创建或更新对应 `index.tsx` 与 `index.less`，确保 Less 以页面根类包裹并保持嵌套结构。
5. 若需要切图，先压缩，再放入 `frontend/src/assets/`，并以语义化文件名引用。
6. 提交前按 `references/implementation-rules.md` 自检。

## 强制约束

- 使用 `.less` 作为页面样式文件；不要改用 CSS Modules、styled-components、Tailwind 或内联大段样式。
- 每个页面样式文件只保留一个页面级根类，例如 `.home-page`、`.user-center-page`；其余样式全部嵌套在根类下。
- 类名统一使用 kebab-case，单个类名最多保留 3 个名词；超过时优先缩写或省略弱语义前缀。
- 不写任何 `font-family`。
- `frontend/src/index.less` 已定义全局 `margin`、`padding`、`box-sizing`，不要重复重置，也不要覆盖成其他盒模型。
- 基础组件优先使用 Antd；如果改的是全局通用视觉规则，优先修改 `frontend/src/App.tsx` 中 `ConfigProvider` 的 `theme`。
- 仅对局部特定样式使用页面类名做覆盖，不要把全局 token 改动塞进页面 Less。
- 滚动条默认隐藏；优先复用 `frontend/src/styles/mixin.less` 中的 `.mixin-hiddenScrollbar()`。
- 需要素材时，优先下载压缩后的文件并存入 `frontend/src/assets/`，文件名必须表达真实用途。

## 实现准则

- 先还原信息架构，再补视觉细节，避免一开始就写碎片样式。
- 优先复用 Antd 的 `Button`、`Input`、`Select`、`Tabs`、`Table`、`Modal`、`Form` 等基础能力。
- 判断样式归属：
  - 全局复用：进入 `ConfigProvider.theme`
  - 页面局部：留在对应页面 `index.less`
  - 通用 Less 能力：补充到 `frontend/src/styles/mixin.less`
- 保持 KISS：只实现设计稿当前需要的结构和状态，不预埋未来未确认变体。
- 保持 DRY：相同视觉块先抽象成组件或 mixin，再复制第二次。

## Less 示例

```less
.order-list-page {
  padding: 24px;

  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .header-title {
    font-size: 20px;
    font-weight: 600;
  }

  .table-wrap {
    overflow: auto;
    .mixin-hiddenScrollbar();
  }
}
```

## 参考

- 详细规则、自检清单与命名示例见 `references/implementation-rules.md`。
