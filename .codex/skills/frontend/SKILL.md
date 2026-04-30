---
name: frontend
description: 仅在当前仓库的 `frontend/` 目录下创建、生成、修改或重构 React 18 的 JS/TS/TSX 代码，覆盖页面组件、业务逻辑、路由、请求调用、工具函数、常量、hooks 与数据处理。用于用户提到“新增 frontend 页面”“修改 frontend 代码”“改 TSX 组件”“新增 React 组件”“重构前端组件”“调整 hooks 用法”“处理 useEffect/useCallback”“抽公共方法”“新增工具函数”“整理常量配置”“新增页面路由”“修改 frontend/src 下文件”“在 frontend 目录下开发功能”等场景；当请求重点是组件结构、事件逻辑、状态流转、接口调用、路由、工具方法、常量、TSX/TypeScript，而不是 Less/CSS/布局视觉时，优先使用此 skill。若任务主要是样式、class、Less、CSS、主题 token、间距、颜色、圆角、阴影、页面布局视觉，则不要使用本 skill，而应交给 `web-style`。若任务不涉及 `frontend/` 目录也不要使用。强制遵循仓库约束：使用 React 18.x、`useEffect` 只在初始化或明确需要监听时使用、优先用函数调用而非副作用驱动、`useCallback` 一般不监听依赖、重复代码出现 3 次及以上必须抽取、跨页面复用代码放 `frontend/src/tools/common.ts` 或 `frontend/src/tools/utils.ts`、全局或多页面共用的状态/类型定义及接口返回相关共享定义放入 `frontend/src/tools/constant.ts`、生成代码添加简短注释。
---

# Frontend

## 目标

在 `frontend/` 目录内输出符合当前仓库结构的 React 18 代码，优先保持简单、可复用、低副作用。

只在 `frontend/` 范围内工作，不扩散到 `service/`、根目录脚本或其他模块。

## 执行流程

1. 先确认改动目标是否位于 `frontend/`。
2. 检查现有目录与可复用文件：
   - `frontend/src/pages/`
   - `frontend/src/components/`
   - `frontend/src/tools/common.ts`
   - `frontend/src/tools/utils.ts`
   - `frontend/src/tools/constant.ts`
3. 先复用已有页面、组件、工具方法与常量结构，再决定是否新增文件；若 `frontend/src/components/` 下已有相同功能组件，优先复用，不重复创建。
4. 代码实现优先使用普通函数调用；仅在初始化和明确依赖监听场景下使用 `useEffect`。
5. 出现重复逻辑达到 3 次或预期跨页面复用时，立即抽取到公共位置。
6. 提交前按 `references/frontend-rules.md` 自检。

## 强制规则

- React 代码按 18.x 语法与生态实现。
- `useEffect` 只允许用于：
  - 初始化执行一次的逻辑
  - 明确需要监听依赖变化的逻辑
- 其他场景一律优先改为普通函数调用，不要为了触发执行而滥用 `useEffect`。
- 使用 `useCallback` 时，一般不监听任何东西；优先保持空依赖并通过函数调用触发。
- 同一段逻辑重复达到 3 次及以上必须拆分提取。
- `frontend/src/components/` 用于存放全局组件；若已有相同功能组件，优先使用该目录下组件，不重复实现。
- 跨页面复用的业务型逻辑提取到 `frontend/src/tools/common.ts`。
- 跨页面复用的工具型逻辑提取到 `frontend/src/tools/utils.ts`。
- `frontend/src/models/` 目录用于全局 hooks。
- `models` 下文件命名统一以 `use` 开头，例如 `useCommon`、`useUserState`，导出内容也保持相同命名语义。
- 新增全局 hooks 后，需要在 `frontend/src/App.tsx` 中引入，并在 `ModelProvider` 的 `models` 属性中注册对应 model。
- 使用全局 hooks 时，统一先引入：

```ts
import { useModel } from '@deepinnet/model-context';
```

- 然后通过以下方式获取方法或变量：

```ts
const { name } = useModel('useCommon');
```

- 全局或多页面共用的状态定义、枚举映射、接口返回相关共享定义统一放入 `frontend/src/tools/constant.ts`。
- 页面内仅当前场景使用的静态文案不必强制抽到常量文件；只有存在全局复用、多页面复用或接口语义复用时，才进入 `frontend/src/tools/constant.ts`。
- 共享常量命名使用大写加下划线，最多 3 个名词，例如 `USER_TYPE`、`PAGE_STATUS`。
- 共享类型定义命名使用 PascalCase，例如 `UserTypeItem`、`OrderStatusItem`。
- 常量内容使用如下结构：

```ts
export const USER_TYPE = {
  customer: { label: '客户', value: 'customer' },
  supplier: { label: '服务商', value: 'supplier' },
};
```

- 新生成代码需要添加简短注释，注释保持简单直接，不写无价值描述。
- 样式相关实现遵循 `web-style` 已定义的 Less/Antd 约束。
- 若当前任务核心是 JS/TS/TSX、组件逻辑、hooks、路由、请求与工具代码，优先使用本 skill。
- 若当前任务核心是 Less/CSS、class、布局视觉与主题 token，转交 `web-style`。

## 目录落点

- 页面：`frontend/src/pages/<page>/`
- 通用组件：`frontend/src/components/`
- 全局 hooks：`frontend/src/models/`
- 业务型公共代码：`frontend/src/tools/common.ts`
- 工具型公共代码：`frontend/src/tools/utils.ts`
- 常量：`frontend/src/tools/constant.ts`

## 实现准则

- 先读后写，优先延续现有文件组织与命名方式。
- 不要因为图省事把本应抽离的逻辑塞回页面组件。
- 不要为了“响应式风格”滥用 hooks；能直接函数调用就直接调用。
- 不要提前抽象未来需求，只在重复和跨页面复用明确出现时抽取。
- 注释只写关键意图、边界或步骤，避免逐行解释代码。

## 示例

```ts
// 页面状态常量
export const PAGE_STATUS = {
  loading: { label: '加载中', value: 'loading' },
  success: { label: '成功', value: 'success' },
};
```

```ts
// 初始化查询
useEffect(() => {
  loadList();
}, []);
```

```ts
// 点击后执行查询
const handleSearch = useCallback(() => {
  loadList();
}, []);
```

## 参考

- 详细规则、拆分判断和常量示例见 `references/frontend-rules.md`。
