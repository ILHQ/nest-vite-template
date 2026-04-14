# Web Style 规则参考

## 仓库锚点

- 全局主题入口：`frontend/src/App.tsx`
- 全局重置样式：`frontend/src/index.less`
- 公共 Less mixin：`frontend/src/styles/mixin.less`
- 页面目录：`frontend/src/pages/`

## Less 规则

### 页面根类

- 每个页面样式文件只能有一个页面级根类。
- 所有子元素样式都嵌套在根类下。
- 不要把页面样式直接写成全局类或标签选择器。

推荐：

```less
.user-center-page {
  min-height: 100%;

  .page-header {
    display: flex;
    align-items: center;
  }

  .user-card {
    padding: 16px;
  }
}
```

### 类名命名

- 使用 kebab-case。
- 单个类名最多 3 个名词。
- 超过时压缩次要词，不继续叠长前缀。

推荐：

- `user-card`
- `user-card-hd`
- `order-stat-tab`
- `goods-list-page`

避免：

- `user-profile-content-header-title`
- `page-wrapper-left-content-container`

### 字体

- 禁止使用 `font-family`。
- 仅保留字号、字重、行高、颜色等必要信息。

### 布局方式

- 默认使用 `display: flex` 处理布局。
- 只有明确存在二维网格排布需求时，才使用 `display: grid`。

## 全局边界

`frontend/src/index.less` 已定义：

```less
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
```

因此：

- 不要再次写全局 reset。
- 不要把盒模型改成 `content-box`。
- 不要给标签补默认 margin、padding。

## Antd 与主题规则

### 优先用 Antd

优先使用：

- `Button`
- `Input`
- `Select`
- `Tabs`
- `Table`
- `Modal`
- `Form`
- `Tag`
- `Pagination`

### 判断改 theme 还是改页面类

#### 进入 `ConfigProvider.theme`

适用于：

- 主色
- 圆角
- 通用字号层级
- 通用按钮或输入框 token

#### 保留在页面 Less

适用于：

- 单页卡片布局
- 页面局部背景
- 当前业务块的间距和定位
- 局部特殊状态

## mixin 规则

- 优先复用 `frontend/src/styles/mixin.less`。
- 现有 mixin 足够时，不重复声明同义能力。
- 只有跨页面复用成立时，才补充新的公共 mixin。

当前优先复用：

- `.mixin-hiddenScrollbar()`
- `.mixin-defaultScrollbar()`
- `.mixin-oneRowOmit()`
- `.mixin-doubleRowOmit()`
- `.mixin-shadow()`

## 滚动条

- 默认隐藏滚动条。
- 可滚动容器优先使用 `.mixin-hiddenScrollbar()`。
- 除非需求明确要求展示滚动条，否则不要打开默认滚动条样式。

## 自检清单

- 是否使用 `.less`
- 是否只有一个页面根类
- 是否保持嵌套结构
- 类名是否全部为 kebab-case
- 是否存在超过 3 个名词的长类名
- 是否出现 `font-family`
- 布局是否默认使用 `display: flex`，仅在必要时使用 `display: grid`
- 是否误改全局 reset 或盒模型
- 是否把全局问题错误写到页面局部
- 是否优先复用 Antd 与 `styles/mixin.less`
- 是否默认隐藏滚动条
