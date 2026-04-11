---
name: web-style
description: 在当前仓库中为 React 页面实现、修改或重构前端样式，输出符合 Less、Antd 与现有全局样式约束的页面代码。用于用户提到“写页面样式”“补 less/css 样式”“写页面布局”“还原设计稿样式”“优化前端视觉”“调整页面间距/颜色/圆角/阴影”“修改 class 名样式”“改 Antd 组件样式”“改 theme token”“抽取公共样式”“新增页面样式文件”“重写页面 less”“处理滚动区域样式”等场景；当请求重点是样式、页面视觉、布局、class、Less、CSS、Antd 样式或主题 token，而不是业务逻辑时，也优先使用此 skill。强制遵循仓库规则：页面样式使用 Less、每页仅一个根类且保持嵌套、类名使用 kebab-case 且最多 3 个名词、禁止 font-family、全局通用视觉优先走 ConfigProvider theme、局部样式走页面类名、全局 margin/padding/box-sizing 不重置、优先复用 styles/mixin.less、默认隐藏滚动条。
---

# Web Style

## 目标

在 `frontend/` 中创建或修改页面样式时，优先输出可维护、可复用、边界清晰的 Less 与 Antd 实现。

先判断全局与局部职责，再写最小必要样式，避免把页面问题写成全局问题，也避免重复定义已有样式能力。

## 执行流程

1. 先检查当前仓库已有样式入口：
   - `frontend/src/App.tsx`
   - `frontend/src/index.less`
   - `frontend/src/styles/mixin.less`
2. 判断当前需求属于：
   - 全局通用视觉：进入 `ConfigProvider.theme`
   - 页面局部结构与视觉：写到页面 `index.less`
   - 跨页面通用 Less 能力：补到 `styles/mixin.less`
3. 页面样式统一以单一根类包裹，内部保持嵌套，不写散落的全局类。
4. 基础交互与结构优先复用 Antd 组件，只对必要部分做局部覆盖。
5. 提交前按 `references/style-rules.md` 自检。

## 强制规则

- 样式文件必须使用 `.less`。
- 每个页面样式文件必须只有一个页面级最大根类，例如 `.home-page`、`.user-center-page`。
- Less 必须有嵌套关系，子块全部挂在页面根类下。
- 类名使用 kebab-case，中间用 `-` 连接。
- 单个类名最多 3 个名词；超过时缩写次要词或省略冗余前缀。
- 禁止出现任何 `font-family`。
- 基础组件优先使用 Antd。
- 若样式影响多个页面或属于设计系统 token，优先改 `ConfigProvider` 下的 `theme`。
- 若样式只影响当前页面或局部业务块，直接在页面根类下追加类名修改。
- 全局样式已定义：

```less
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
```

- 因此不要重新声明全局 reset，不要改成其他盒模型，不要凭空补默认 margin、padding。
- `styles/mixin.less` 是公共样式文件，已有能力优先复用；确有复用价值时再补充公共 mixin。
- 滚动条默认隐藏；可滚动容器优先复用隐藏滚动条的 mixin。

## 实现准则

- 先做页面结构，再做视觉细节，避免直接堆零散样式。
- 相同视觉块重复出现时，优先抽公共组件或公共 mixin，避免复制粘贴。
- 不为未被需求明确要求的状态、主题或响应式分支预留复杂实现。
- 优先用 Antd 完成表单、列表、弹窗、按钮、分页、标签等基础能力。
- 页面样式命名保持短、准、稳定，不引入冗长前缀。

## Less 示例

```less
.goods-list-page {
  padding: 24px;

  .filter-bar {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .goods-card {
    padding: 16px;
    border-radius: 12px;

    .card-title {
      font-size: 16px;
      font-weight: 600;
    }
  }

  .table-wrap {
    overflow: auto;
    .mixin-hiddenScrollbar();
  }
}
```

## 参考

- 详细规则、自检清单与命名示例见 `references/style-rules.md`。
