# Frontend 规则参考

## 适用范围

- 仅在 `frontend/` 目录下创建、生成、修改或重构代码时使用。
- 如果任务目标在 `service/` 或仓库其他目录，不使用本 skill。

## React 版本

- 使用 React 18.x 代码风格与 API。
- 保持与 `frontend/package.json` 中的 React 版本声明一致。

## Hook 规则

### `useEffect`

只在以下场景使用：

- 页面初始化执行一次
- 明确要监听依赖变化

避免：

- 用 `useEffect` 代替普通函数调用
- 因为按钮点击、表单提交、显式事件触发而包一层 `useEffect`

推荐：

```ts
// 初始化加载
useEffect(() => {
  loadDetail();
}, []);
```

不推荐：

```ts
useEffect(() => {
  if (visible) {
    submitForm();
  }
}, [visible]);
```

若逻辑由点击、提交、切换等动作触发，直接调用函数。

### `useCallback`

- 一般不监听任何东西，优先使用空依赖数组。
- 主要目标是稳定函数引用，而不是承载复杂依赖关系。
- 若函数依赖过多，优先回退到普通函数或调整数据流。

推荐：

```ts
const handleRefresh = useCallback(() => {
  loadList();
}, []);
```

## 拆分规则

### 重复 3 次及以上

- 同一逻辑、格式化、映射、校验、构造参数等代码重复达到 3 次及以上，必须抽离。

### 跨页面复用

- 业务型公共代码放 `frontend/src/tools/common.ts`
- 工具型公共代码放 `frontend/src/tools/utils.ts`

#### 业务型代码示例

- 用户状态映射
- 页面请求参数整理
- 与当前业务域强相关的数据转换

#### 工具型代码示例

- 字符串处理
- 数组去重
- URL 参数处理
- 时间格式化

## 全局 hooks 规则

- `frontend/src/models/` 目录用于放置全局 hooks。
- 文件命名统一以 `use` 开头，例如 `useCommon.ts`、`useUser.ts`、`useUserState.ts`。
- 新增 model 后，需要在 `frontend/src/App.tsx` 中完成注册。

推荐流程：

1. 在 `frontend/src/models/` 下创建一个以 `use` 开头命名的全局 hook 文件
2. 在 `frontend/src/App.tsx` 中引入对应 hook
3. 在 `ModelProvider` 的 `models` 中添加对应项

示例：

```ts
import useCommon from '@/models/useCommon';

<ModelProvider
  models={{
    useCommon,
  }}
>
```

- 页面或组件中使用全局 hooks 时，统一通过 `useModel` 获取。

推荐写法：

```ts
import { useModel } from '@deepinnet/model-context';

const { name } = useModel('useCommon');
```

- 不要绕过 `ModelProvider` 直接用其他方式注入全局 model。
- 不要把仅当前页面使用的局部 hook 放进 `models/`。
- 只有明确需要跨页面共享状态、方法或全局能力时，才进入 `models/`。

## 常量规则

- 页面中出现的静态字符都需要进入 `frontend/src/tools/constant.ts`
- 优先复用已有常量，不重复创建同义常量

### 命名规范

- 名称大写
- 使用 `_` 连接
- 最多 3 个名词

推荐：

- `USER_TYPE`
- `PAGE_STATUS`
- `ORDER_TAB`

避免：

- `USER_PROFILE_HEADER_STATUS`
- `PAGE_LIST_FILTER_BUTTON_TEXT`

### 结构规范

```ts
export const USER_TYPE = {
  customer: { label: '客户', value: 'customer' },
  supplier: { label: '服务商', value: 'supplier' },
};
```

## 注释规则

- 生成代码需要添加简单注释。
- 注释只说明关键目的、步骤或边界。
- 不写无信息量注释，例如“定义变量”“调用方法”。

推荐：

```ts
// 查询列表数据
const loadList = async () => {};
```

## 自检清单

- 是否只修改了 `frontend/`
- 是否使用 React 18.x 风格
- 是否只在初始化或监听场景使用 `useEffect`
- 是否把事件驱动逻辑直接改成函数调用
- 是否谨慎使用 `useCallback`，且一般不监听依赖
- 是否将重复达到 3 次的代码抽离
- 是否把跨页面公共逻辑放入 `tools/common.ts` 或 `tools/utils.ts`
- 全局共享 hook 是否放在 `frontend/src/models/`
- 新增 model 后是否已在 `frontend/src/App.tsx` 的 `ModelProvider.models` 中注册
- 页面取用全局 model 时是否使用 `useModel('useCommon')` 这类方式
- 是否把静态字符抽到 `tools/constant.ts`
- 常量名是否符合大写下划线规则
- 是否添加了简短有效注释
