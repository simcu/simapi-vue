# @simcu/simapi — AI 开发指南

> 面向 AI Agent 的代码结构说明，帮助理解、修改和扩展本库。

---

## 项目结构

```
simapi-vue/
├── src/
│   ├── types.ts          # 类型定义，全部导出
│   ├── simapi.core.ts    # 核心类 SimApiCore，零框架依赖
│   └── simapi.pinia.ts   # Pinia Store，Vue3 适配层
├── dist/                  # 构建产物
├── package.json           # exports: "." → core, "/pinia" → vue
├── vite.config.ts         # 统一构建配置，生成 .mjs 和 .cjs
└── tsconfig.build.json    # tsc 生成类型声明
```

---

## 核心类型（types.ts）

```typescript
SimApiBaseResponse<T>     // 标准响应 { code, message, data? }
SimApiOptions             // configure() 入参 { debug?, auth?, api? }
SimApiAuthConfig          // auth: { token_name, check_url, logout_url, login_url }
SimApiApiConfig           // api: { endpoints, defaultEndpoint, businessCallback, responseCallback, timeout? }
SimApiBusinessCallback    // { [code]: (data) => void }，支持数字码或 'common'
```

---

## SimApiCore（simapi.core.ts）

**职责**：纯 TS HTTP 客户端，基于原生 fetch API，不依赖任何框架。

**关键设计**：

- **零依赖**：使用原生 fetch，无 axios 或其他 HTTP 库
- **无 Cookie**：所有请求使用 `credentials: 'omit'`，避免 CORS 问题
- **Token 传递**：通过请求头 `Token` 传递认证信息
- **超时控制**：通过 `fetchWithTimeout` 辅助函数实现
- `query()` 抛出异常的只有网络/HTTP 错误，业务错误码通过回调处理
- `isLoggedIn` 是 getter，基于 localStorage 中的 token 判断
- **版本号**：`getVersion()` 返回的版本信息中，`uiSimApi` 由构建时注入的 `SimApiVersion` 填充，`uiApp` 由调用方的 `AppVersion` 填充（未注入时为 `0.0.0-develop`）

**修改建议**：

- 改请求方法（GET/PUT/DELETE）：在 `fetchPost()` 内新增 `method` 参数分支，或新增 `fetchGet()`/`fetchPut()` 方法
- 改 Token 存储：替换 `localStorage` 为 `sessionStorage` 或内存变量，修改 `getToken()`/`setToken()`/`removeToken()`
- 改登录/登出逻辑：修改 `login()`/`logout()` 方法
- 改超时处理：修改 `fetchWithTimeout()` 函数
- **版本管理**：版本号通过 `declare const` 声明常量，构建时通过 Vite 的 `define` 注入。未指定时默认为 `0.0.0-develop`

**autoInit 设计约束**：

- 仅读取 `window.simapi` 的顶级字段：`endpoints`、`defaultEndpoint`、`debug`
- 业务回调（`businessCallback`/`responseCallback`）不支持从 window 读取，必须在代码中通过 `setBusinessCallback` 注册

---

## Pinia Store（simapi.pinia.ts）

**职责**：Vue3 适配层，SimApiCore 的纯代理，不维护任何独立状态。

**关键设计**：

- **无独立状态**：state 中只有一个 `_core` 实例，不维护 `debug`、`token` 等独立数据
- **单例 Core**：在 store state 中实例化 `SimApiCore`，整个应用共享一个实例
- **纯代理映射**：所有 getters 直接映射到 `this._core` 的属性，所有 actions 直接调用 `this._core` 的方法
- **响应式**：通过 Pinia 的响应式系统，当 core 状态变化时自动更新

**使用方式**：

```typescript
// 任意组件
import { useSimApi } from '@simcu/simapi'

const api = useSimApi()

// 初始化（二选一）
// 方式一：从 window.simapi 读取
api.autoInit()

// 方式二：直接传入配置
api.configure({
  api: { endpoints: { default: 'https://api.example.com' } },
})

// 所有方法与 SimApiCore 完全一致
await api.query('/users/list', { page: 1 })
```

---

## 构建流程

```
npm run build
  → vite build                          输出 dist/index.mjs / index.cjs / pinia.mjs / pinia.cjs
  → tsc -p tsconfig.build.json         输出 *.d.ts 类型声明
```

**版本号注入：**

版本号通过 `vite.config.ts` 的 `define` 配置注入，从 npm config 读取：

```typescript
define: {
  'SimApiVersion': JSON.stringify(process.env.npm_config_SimApiVersion || '0.0.0-develop'),
}
```

**本地构建示例：**
```bash
# 通过环境变量
# Windows PowerShell
$env:npm_config_SimApiVersion='1.0.0'; npm run build

# Linux/Mac
npm_config_SimApiVersion=1.0.0 npm run build
```

**GitHub Actions 自动发布：**
```yaml
env:
  SimApiVersion: ${{ github.ref_name }}
run: npm run build
```

**dist 输出是平铺的**，core 和 pinia 的编译产物全部在同一目录：

```
dist/
├── index.mjs       # core ESM
├── index.cjs       # core CJS
├── pinia.mjs       # pinia ESM
├── pinia.cjs       # pinia CJS
├── simapi.core.d.ts
├── simapi.pinia.d.ts
└── types.d.ts
```

---

## package.json exports

```json
".":         { "import": "./dist/index.mjs", "types": "./dist/simapi.core.d.ts" }
"./pinia":   { "import": "./dist/pinia.mjs", "types": "./dist/simapi.pinia.d.ts" }
```

---

## 注意事项

- Core 默认 `debug: true`，生产环境需手动 `configure({ debug: false })`
- `query()` 返回 `Promise<SimApiBaseResponse<T>>`，code !== 200 时不 reject，通过 `businessCallback` 处理
- `login()` 成功后将 `result.data` 存入 localStorage
- **无 Cookie**：所有请求不发送 Cookie，Token 通过请求头传递
- **零依赖**：不需要安装 axios，使用原生 fetch
- 删除了 Angular 支持，如需恢复参考 git 历史
- **版本号管理**：使用 `declare const` + Vite `define` 注入
- **AppVersion** 不注入，留给调用方自己管理
