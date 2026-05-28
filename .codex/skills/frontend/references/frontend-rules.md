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

## 展示性质列表规则

- 页面中的信息展示列表、资料卡字段列表、详情字段列表等“只读展示型列表”，优先使用字段配置数组驱动渲染。
- 推荐字段项至少包含：
  - `label`
  - `value`
  - `render(value, record, index)`
- `value` 优先表示原始字段 key 或原始值本身。
- `render` 负责格式化、兜底值和特殊展示，不负责外围通用样式。
- 通用展示样式统一放在 `map` 循环里包裹，避免每个 `render` 重复写相同 class。
- 若多个展示项都只是纯文本输出，仍保留 `render`，保证结构统一，便于后续单项升级。

推荐：

```tsx
type DisplayField = {
  label: string;
  value: keyof UserInfo;
  render: (
    value: UserInfo[keyof UserInfo] | undefined,
    record: UserInfo,
    index: number
  ) => React.ReactNode;
};

const fields: DisplayField[] = [
  {
    label: '手机号',
    value: 'phone',
    render: (value) => (typeof value === 'string' ? value : '-'),
  },
];

{fields.map((field, index) => (
  <div key={index}>
    <div>{field.label}</div>
    <div className="value">{field.render(record?.[field.value], record, index)}</div>
  </div>
))}
```

避免：

```tsx
<div className="item">
  <div className="label">手机号</div>
  <div className="value">{phone || '-'}</div>
</div>
<div className="item">
  <div className="label">邮箱</div>
<div className="value">{email || '-'}</div>
</div>
```

## Antd Form 规则

- 使用 Antd `Form` 时，不要通过数组 `map`、配置驱动或循环批量创建 `Form.Item`。
- 表单项必须直接平铺写出，保持每个字段的名称、校验、占位文案和差异逻辑清晰可见。
- 只有在用户明确要求做动态表单生成时，才允许使用循环或配置式创建。

推荐：

```tsx
<Form>
  <Form.Item name="name" label="姓名">
    <Input placeholder="请输入姓名" />
  </Form.Item>

  <Form.Item name="phone" label="手机号">
    <Input placeholder="请输入手机号" />
  </Form.Item>
</Form>
```

避免：

```tsx
const fields = [
  { name: 'name', label: '姓名' },
  { name: 'phone', label: '手机号' },
];

<Form>
  {fields.map((field) => (
    <Form.Item key={field.name} name={field.name} label={field.label}>
      <Input />
    </Form.Item>
  ))}
</Form>
```

## Antd Modal 规则

- 使用 Antd `Modal` 时，默认保留其标题、关闭按钮、取消按钮、确认按钮的默认样式。
- 不要自定义 Modal 头部来替代默认标题和关闭按钮。
- 不要额外覆盖 `.ant-modal-title`、关闭按钮、默认 footer 按钮样式。
- 只有用户明确要求修改这些区域时，才允许定制对应样式或结构。

推荐：

```tsx
<Modal
  open={open}
  title="新增地址"
  onOk={handleSubmit}
  onCancel={handleCancel}
/>
```

避免：

```tsx
<Modal footer={null}>
  <div className="modal-head">
    <span className="modal-title">新增地址</span>
    <button type="button">关闭</button>
  </div>
</Modal>
```

## 中台/后台目录规则

- 中台/后台管理系统页面必须按“业务目录 + 子业务目录”组织。
- 先创建业务目录，业务目录下必须保留：
  - `index.tsx`
  - `index.less`
- 详情、创建、编辑、列表、配置等二级页面必须在业务目录下创建对应子目录。
- 子目录命名保持简洁，不使用冗长业务前缀。
- 业务入口 `index.tsx` 负责承接路由层级，必须使用 React `Outlet`。

推荐目录：

```text
frontend/src/pages/admin/order/
  index.tsx
  index.less
  detail/
    index.tsx
    index.less
  edit/
    index.tsx
    index.less
  create/
    index.tsx
    index.less
```

避免：

```text
frontend/src/pages/admin/
  OrderListPage.tsx
  OrderDetailPage.tsx
  OrderCreatePage.tsx
```

推荐入口：

```tsx
import { Outlet } from 'react-router-dom';

export default function OrderPage() {
  return <Outlet />;
}
```

## 中台/后台路由规则

- 中台/后台业务路由必须使用嵌套路由结构。
- 外层业务路由统一写成 `{ path: '', element: '', children: [] }` 形式。
- 详情、增删改查等子路由统一写到 `children` 中，不要平铺在同层。

推荐：

```tsx
{
  path: 'order',
  element: <OrderPage />,
  children: [
    {
      index: true,
      element: <OrderListPage />,
    },
    {
      path: 'detail/:id',
      element: <OrderDetailPage />,
    },
    {
      path: 'create',
      element: <OrderCreatePage />,
    },
    {
      path: 'edit/:id',
      element: <OrderEditPage />,
    },
  ],
}
```

避免：

```tsx
{
  path: 'order',
  element: <OrderListPage />,
},
{
  path: 'order-detail/:id',
  element: <OrderDetailPage />,
}
```

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

- 页面内仅当前场景使用的静态文案，不需要机械抽到 `frontend/src/tools/constant.ts`
- 只有全局或多页面可能复用的状态、枚举映射、类型定义，或与接口返回结构强相关的共享定义，才进入 `frontend/src/tools/constant.ts`
- 优先复用已有共享定义，不重复创建同义常量或同义类型

### 命名规范

- 运行时常量名称大写
- 运行时常量使用 `_` 连接
- 运行时常量最多 3 个名词
- 类型定义使用 PascalCase

推荐：

- `USER_TYPE`
- `PAGE_STATUS`
- `ORDER_TAB`
- `UserTypeItem`
- `OrderStatusItem`

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

```ts
export type UserTypeItem = {
  label: string;
  value: string;
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
- 是否只把共享状态、共享类型或接口相关共享定义放入 `tools/constant.ts`
- 展示性质列表是否优先使用字段配置数组 + `render(value, record, index)` 驱动渲染
- 使用 Antd `Form` 时是否直接平铺写出 `Form.Item`
- 使用 Antd `Modal` 时是否保留了标题、关闭按钮和默认 footer 按钮样式
- 中台/后台页面是否使用“业务目录 + 子业务目录”结构
- 中台/后台业务入口是否使用 `Outlet`
- 中台/后台路由是否使用 `children` 管理详情、增删改查等子页面
- 常量名是否符合大写下划线规则
- 类型名是否符合 PascalCase 规则
- 是否添加了简短有效注释
