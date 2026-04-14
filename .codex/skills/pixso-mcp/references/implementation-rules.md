# Pixso MCP 实现规则

## 仓库锚点

- 全局 Antd 主题入口：`frontend/src/App.tsx`
- 全局重置样式：`frontend/src/index.less`
- 公共 Less mixin：`frontend/src/styles/mixin.less`
- 页面目录：`frontend/src/pages/`
- 素材目录：`frontend/src/assets/`

## 页面与样式规则

### 1. Less 结构

- 为每个页面保留一个根类，命名形如 `.home-page`、`.goods-list-page`。
- 所有子元素样式都嵌套在该根类下面。
- 不要写散落的全局类，不要把页面样式直接挂到标签选择器上。

推荐写法：

```less
.goods-list-page {
  min-height: 100%;

  .filter-bar {
    display: flex;
    gap: 12px;
  }

  .goods-card {
    padding: 16px;

    .card-title {
      font-size: 16px;
      font-weight: 600;
    }
  }
}
```

### 2. 类名规范

- 使用 kebab-case。
- 单个类名最多 3 个名词。
- 超出时缩写次要词，不要继续堆长前缀。

推荐：

- `user-card`
- `user-card-title`
- `order-stat-tab`
- `order-stat-hd`

避免：

- `user-profile-content-header-title`
- `page-wrapper-left-content-container`

### 3. 全局样式边界

`frontend/src/index.less` 已有：

```less
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
```

因此：

- 不要再次写全局 reset。
- 不要把盒模型改回 `content-box`。
- 不要凭空补默认 `margin`、`padding`。

### 4. 字体规则

- 禁止出现任何 `font-family`。
- 如设计稿有字体要求，仅保留字号、字重、行高、字色等可落地信息。

### 5. 布局规则

- 默认使用 `display: flex` 处理布局。
- 只有明确存在二维网格排布需求时，才使用 `display: grid`。

## Antd 使用规则

### 1. 优先复用基础组件

可直接优先选择：

- `Button`
- `Input`
- `InputNumber`
- `Select`
- `DatePicker`
- `Tabs`
- `Table`
- `Tag`
- `Modal`
- `Form`
- `Pagination`

### 2. 判断全局还是局部

#### 全局样式

若设计变更影响多个页面或属于通用品牌风格，优先修改 `frontend/src/App.tsx` 中：

```tsx
<ConfigProvider theme={{ token: {} }} />
```

典型场景：

- 主色
- 圆角
- 主字号层级
- 按钮/输入框通用 token

#### 局部样式

若只影响单个页面或单个业务块，在页面根类下增加类名覆盖，不要污染全局 token。

典型场景：

- 某个卡片区域的背景和布局
- 某个列表头部的特殊间距
- 仅单页存在的装饰元素

## 公共 Less 规则

- 优先复用 `frontend/src/styles/mixin.less`。
- 已有 mixin 能覆盖需求时，不要重复造一个语义相同的方法。
- 若确实是跨页面复用的 Less 能力，可以补充进 `frontend/src/styles/mixin.less`。

当前特别有用的能力：

- `.mixin-hiddenScrollbar()`
- `.mixin-defaultScrollbar()`
- `.mixin-oneRowOmit()`
- `.mixin-doubleRowOmit()`
- `.mixin-shadow()`

## 滚动条规则

- 默认隐藏滚动条。
- 可滚动容器优先使用 `.mixin-hiddenScrollbar()`。
- 只有设计稿明确要求展示滚动条时，才使用 `.mixin-defaultScrollbar()` 或单独补充样式。

## 切图与素材规则

### 1. 下载位置

- 下载后的素材默认放入 `frontend/src/assets/`。
- 仅在必须以静态公共资源方式暴露时，才考虑 `public/`。

### 2. 文件压缩

- 下载后先压缩。
- 优先根据素材类型选择更合适格式：
  - 图标/线稿：`svg`
  - 位图大图：`webp`
  - 需要透明背景时：`png`
  - 非必要不要保留超大原图

### 3. 命名规范

- 文件名表达真实用途，不用 `切图1.png`、`image.png`、`banner-new-final.png`。
- 推荐格式：`模块-用途[-状态].扩展名`

推荐：

- `login-banner.webp`
- `goods-empty-state.png`
- `user-center-bg.png`
- `order-success-icon.svg`

## 交付前自检

- 页面样式是否只有一个页面根类。
- 类名是否全部使用 kebab-case。
- 是否存在超过 3 个名词的超长类名。
- 是否出现 `font-family`。
- 布局是否默认使用 `display: flex`，仅在必要时使用 `display: grid`。
- 是否误改全局 `margin`、`padding`、`box-sizing`。
- 是否把全局视觉问题错误地写进页面局部样式。
- 是否优先复用了 Antd 与 `mixin.less`。
- 是否默认隐藏滚动条。
- 切图是否已压缩并放进 `frontend/src/assets/`，命名是否语义化。
