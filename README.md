# @simcu/simapi — SimApi Vue 前端库（AI 编码参考）

> **包名**: `@simcu/simapi` | **技术栈**: TypeScript + Vue3 + Pinia + 原生 fetch
> **后端对应**: [simapi-net](../simapi-net)（`Simcu.SimApi` NuGet 包）
> **性质**: simapi-net 的官方前端 HTTP 客户端，**专为其统一响应格式设计**
>
> **使用方式**: 将本文档作为上下文提供给 AI，或粘贴到对话开头。AI 阅读本文档后应能正确编写调用 simapi-net 接口的前端代码。

---

## 0. 一句话定位

simapi-vue 是 **simapi-net 的前端搭档**。后端用 `Simcu.SimApi` 写接口，前端用 `@simcu/simapi` 调接口。两者共享同一套响应格式、认证方式和错误处理约定。

---

## 1. 核心概念（必读）

### 1.1 统一响应格式

simapi-net 所有接口的响应格式固定如下（HTTP 状态码始终 200）：

```json
{ "code": 200, "message": "成功", "data": { ... } }
```

| code 含义 |
|-----------|
| 200 成功 | 204 无数据 | 400 参数错误 |
| 401 需要登录 | 403 无权访问 | 404 不存在 | 500 服务器错误 |

### 1.2 Token 认证

- 前端通过请求头 `Token: <value>` 传递认证令牌
- Token 存储在 Cookie 中，key 默认为 `simapi-auth-token`
- Cookie 属性: `path=/; secure; samesite=none`
- **不使用 Authorization: Bearer**

### 1.3 请求方式

- **默认全部 POST**，body 为 JSON
- 使用原生 fetch，不依赖 axios

---

## 2. 项目结构

```
simapi-vue/
├── src/
│   ├── types.ts            # 所有类型定义
│   ├── simapi.core.ts      # 纯 TS 核心（SimApiCore 类）
│   └── simapi.pinia.ts     # Vue3 Pinia Store 封装（useSimApi）
├── dist/                   # 构建产物（ESM）
├── package.json            # 包名 @simcu/simapi
└── vite.config.ts          # Vite 构建配置
```

### 导出路径（Subpath Exports）

| 导入路径 | 内容 | 适用场景 |
|---------|------|---------|
| `@simcu/simapi` | SimApiCore + 类型 | 纯 TS / Node.js / 任意 JS 环境 |
| `@simcu/simapi/pinia` | useSimApi Pinia Store | **Vue3 项目（推荐）** |

---

## 3. 快速开始（Vue3 项目标准用法）

### 3.1 安装

```bash
npm install @simcu/simapi pinia
```

> `pinia` 是 peerDependency，Vue3 项目必须安装。

### 3.2 第一步：public/config.json — 外部配置文件

在项目的 `public/` 目录下创建 `config.json`，定义 API 地址：

```json
{
  "debug": true,
  "endpoints": {
    "default": "http://127.0.0.1:5210"
  }
}
```

**为什么用 config.json 而不是硬编码？**
- 前后端分离部署时，API 地址可能变化
- `public/` 下的文件 Vite 会直接复制到输出目录，不经过构建
- 打包后运维人员可以直接修改 `config.json` 切换环境，无需重新构建

**config.json 支持的字段：**

| 字段 | 类型 | 说明 | 默认值 |
|------|------|------|--------|
| `debug` | boolean | 是否打印请求/响应日志 | `false` |
| `endpoints` | object | 多端点地址映射 | `{ "default": "" }` |
| `defaultEndpoint` | string | 默认使用的端点名称 | `"default"` |

### 3.3 第二步：main.ts — 创建 Pinia 实例

```typescript
// src/main.ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'     // ← 必须安装并注册 Pinia
import App from './App.vue'
import router from './router'

const app = createApp(App)
app.use(createPinia())                   // ← useSimApi 依赖 Pinia，必须先注册
app.use(router)
app.mount('#app')
```

**顺序很重要**: `createPinia()` 必须在 `useSimApi()` 调用之前完成注册。

### 3.4 第三步：App.vue — 初始化 SimApi 并设置回调

```vue
<!-- src/App.vue -->
<template>
  <router-view></router-view>
</template>

<script setup lang="ts">
import { useSimApi } from '@simcu/simapi/pinia'   // ← 注意 /pinia 子路径
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

const api = useSimApi()
const router = useRouter()

onMounted(async () => {
  // ① 从 config.json 加载配置（endpoints、debug 等）
  await api.loadFromFile()

  // ② 注册业务错误码回调 —— 401 时跳转登录页
  api.setBusinessCallback(401, () => {
    api.logout()
    router.replace({ path: '/login' })
  })

  // ③ 注册通用兜底回调 —— 其他所有非 200 错误统一提示
  api.setBusinessCallback('common', (data: any) => {
    console.error('[SimApi]', data.code, data.message)
  })
})
</script>
```

**关键点说明：**

| 要点 | 说明 |
|------|------|
| `import from '@simcu/simapi/pinia'` | Vue3 项目**必须**用 `/pinia` 子路径导入 |
| `onMounted` 中初始化 | 确保 DOM 已加载、Pinia 已就绪 |
| `await api.loadFromFile()` | 从 `config.json` 加载 endpoints、defaultEndpoint、debug |
| `setBusinessCallback(401, fn)` | 当后端返回 code=401 时自动执行 |
| `setBusinessCallback('common', fn)` | 兜底回调，任何非 200 且未匹配其他回调时触发 |

### 3.5 第四步：在组件中使用

```vue
<!-- src/views/UserList.vue -->
<template>
  <div>
    <button @click="loadUsers">加载用户</button>
    <ul v-for="user in users" :key="user.id">{{ user.name }}</ul>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useSimApi } from '@simcu/simapi/pinia'

interface User {
  id: string
  name: string
}

const api = useSimApi()
const users = ref<User[]>([])

async function loadUsers() {
  const res = await api.query<User[]>('/user/list', { page: 1 })
  users.value = res.data ?? []
}
</script>
```

---

## 4. 完整项目模板（可直接复制使用）

### public/config.json

```json
{
  "debug": true,
  "endpoints": {
    "default": "http://localhost:5000"
  }
}
```

### src/main.ts

```typescript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

createApp(App)
  .use(createPinia())
  .use(router)
  .mount('#app')
```

### src/App.vue

```vue
<template><router-view /></template>

<script setup lang="ts">
import { useSimApi } from '@simcu/simapi/pinia'
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

const api = useSimApi()
const router = useRouter()

onMounted(async () => {
  await api.loadFromFile()
  api.setBusinessCallback(401, () => {
    api.logout()
    router.replace('/login')
  })
})
</script>
```

### src/views/Login.vue

```vue
<template>
  <form @submit.prevent="handleLogin">
    <input v-model="phone" placeholder="手机号" />
    <input v-model="code" placeholder="验证码" />
    <button type="submit">登录</button>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSimApi } from '@simcu/simapi/pinia'

const api = useSimApi()
const router = useRouter()
const phone = ref('')
const code = ref('')

async function handleLogin() {
  await api.login({ phone: phone.value, code: code.value })
  router.push('/')
}
</script>
```

---

## 5. API 参考

### 5.1 import 方式

```typescript
// ✅ Vue3 项目 — 用 Pinia Store（推荐）
import { useSimApi } from '@simcu/simapi/pinia'

// ✅ 非 Vue 项目 / 纯 TS — 用 Core 类
import { SimApiCore } from '@simcu/simapi'
```

### 5.2 useSimApi Store — 方法与属性一览

获取实例：

```typescript
const api = useSimApi()  // 单例模式，全局状态共享
```

#### 属性（Getters）

| 属性 | 类型 | 说明 |
|------|------|------|
| `api.token` | `string` | 当前存储的 Token（只读） |
| `api.isLoggedIn` | `boolean` | 是否已登录（Token 是否存在） |
| `api.debug` | `boolean` | 调试开关 |
| `api.api` | `SimApiApiConfig` | API 配置对象（一般不直接操作） |
| `api.auth` | `SimApiAuthConfig` | 认证配置对象（一般不直接操作） |

#### 方法（Actions）

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `loadFromFile(file?)` | string (默认 `'config.json'`) | `Promise<void>` | 从 JSON 文件加载 endpoints/debug 配置 |
| `configure(options)` | `SimApiOptions` | `void` | 手动配置（深合并） |
| `setDebug(bool)` | boolean | `void` | 设置调试模式 |
| `setEndpoints(map)` | `{[name]: url}` | `void` | 设置多端点映射 |
| `query(uri, params?, endpoint?, headers?)` | 见下方详解 | `Promise<SimApiBaseResponse<T>>` | **核心方法：发送 POST 请求** |
| `login(request)` | `{[key]: any}` | `Promise<SimApiBaseResponse<string>>` | 登录，成功后自动存 Token |
| `logout(url?)` | string? | `Promise<any>` | 登出，清除 Token 并调后端接口 |
| `checkLogin(url?)` | string? | `Promise<void>` | 检查登录态，过期则触发 401 回调 |
| `setBusinessCallback(code, fn)` | number\|string, callback | `void` | 注册业务错误码回调 |
| `getToken()` | 无 | `string` | 获取当前 Token |
| `setToken(token)` | string | `void` | 手动设置 Token |
| `removeToken()` | 无 | `void` | 清除 Token |
| `getVersion(endpoint?)` | string? | `Promise<SimApiVersions>` | 获取前后端版本信息 |
| `getEndpoint(name?)` | string? | `string` | 获取某端点的 baseURL |

### 5.3 query 方法详解

这是最核心的方法——几乎所有数据交互都通过它：

```typescript
async function query<T = any>(
  uri: string,                    // 接口路径，如 '/user/list'
  params?: any = {},              // 请求体（POST body），JSON 对象
  endpointKey?: string,           // 可选：指定端点名（默认用 default）
  extraHeaders?: Record<string, string>  // 可选：额外请求头
): Promise<SimApiBaseResponse<T>>
```

**使用示例：**

```typescript
// 基本查询
const res = await api.query<User[]>('/user/list', { page: 1, count: 20 })
console.log(res.data)   // User[] 数组

// 错误处理
try {
  const res = await api.query('/user/list')
} catch (err: any) {
  // err 是 SimApiBaseResponse 类型
  console.log(err.code)     // 业务错误码，如 400/401/403/500
  console.log(err.message)  // 错误消息
}
```

**⚠️ query 的行为要点：**

1. 自动在请求头添加 `Token`（如果存在）
2. `code === 200` → 正常返回 `SimApiBaseResponse<T>`
3. `code !== 200` → 先执行对应的 businessCallback，然后 **throw 异常**
4. 网络错误 → 执行 responseCallback.error，throw 包装后的 `{code: -1}` 异常
5. 所以调用方只需 `try/catch` 处理异常即可

### 5.4 login / logout 方法

```typescript
// login：POST 到 auth.login_url（默认 /auth/login），自动保存返回的 Token
await api.login({ phone: '13800138000', code: '123456' })

// logout：清除本地 Token，可选调后端登出接口
await api.logout()             // 调 /auth/logout
await api.logout(null)         // 只清本地 Token，不调后端
```

### 5.5 setBusinessCallback — 业务错误处理

```typescript
api.setBusinessCallback(401, (data) => {
  router.replace('/login')
})

api.setBusinessCallback(403, (data) => {
  alert('无权限：' + data.message)
})

// 兜底：任何未单独处理的非 200 错误都会走 common
api.setBusinessCallback('common', (data) => {
  console.error('请求失败:', data.code, data.message)
})
```

**回调执行顺序：** 匹配具体错误码 → 未匹配则走 `'common'` → 然后 throw

---

## 6. 类型定义速查

```typescript
/** 标准响应 */
interface SimApiBaseResponse<T = any> {
  code: number
  message: string
  data?: T
}

/** 版本信息 */
interface SimApiVersions {
  uiApp: string
  uiSimApi: string
  apiApp: string
  apiSimApi: string
  apiAppFull: string
  apiSimApiFull: string
}

/** 认证配置 */
interface SimApiAuthConfig {
  token_name: string
  check_url: string
  logout_url: string
  login_url: string
}

/** API 配置 */
interface SimApiApiConfig {
  endpoints: { [name]: string }
  defaultEndpoint: string
  businessCallback: SimApiBusinessCallback
  responseCallback: SimApiResponseCallback
  timeout?: number
}

/** 完整选项 */
interface SimApiOptions {
  debug?: boolean
  auth?: Partial<SimApiAuthConfig>
  api?: Partial<SimApiApiConfig>
}
```

---

## 7. 多端点支持

```json
{
  "debug": true,
  "endpoints": {
    "default": "https://api.example.com",
    "admin": "https://admin.example.com",
    "cdn": "https://cdn.example.com"
  },
  "defaultEndpoint": "default"
}
```

```typescript
// 使用默认端点
await api.query('/user/list')

// 指定端点
await api.query('/system/stats', {}, 'admin')
```

也可以运行时动态添加：

```typescript
api.setEndpoints({ backup: 'https://backup-api.example.com' })
```

---

## 8. configure — 手动完整配置

除了 `loadFromFile` 从 `config.json` 读取外，也可以手动配置一切：

```typescript
api.configure({
  debug: false,
  auth: { token_name: 'my-app-token' },
  api: {
    endpoints: { default: 'https://api.example.com' },
    defaultEndpoint: 'default',
    timeout: 15000,
    businessCallback: {
      401: () => router.replace('/login'),
      403: (data) => alert('无权限'),
      'common': (data) => MessagePlugin.error(data.message),
    },
  },
})
```

**loadFromFile vs configure 的关系：**
- `loadFromFile()` 只读 `config.json` 的 `endpoints`、`defaultEndpoint`、`debug`
- `configure()` 可以覆盖所有字段，包括 auth 和 callbacks
- 通常做法是：`loadFromFile()` 读基础配置 + `setBusinessCallback()` 补充回调

---

## 9. GOTCHAS（AI 最容易犯的错）

| ❌ 错误 | ✅ 正确 |
|---------|---------|
| `import { useSimApi } from '@simcu/simapi'` （Vue3） | `from '@simcu/simapi/pinia'`（必须带 `/pinia`） |
| 忘记 `app.use(createPinia())` | **必须在 `useSimApi()` 之前**注册 Pinia |
| 用 `Authorization: Bearer xxx` | 用 `Token` 请求头（这是 simapi-net 约定） |
| 期望 HTTP 4xx/5xx 表示错误 | 所有错误都是 **HTTP 200 + JSON `code` 字段** |
| `res.data` 直接用而不判空 | `res.data` 可能是 `undefined`，用 `res.data ?? []` |
| 在 setup 外部调用 `useSimApi()` | `useSimApi()` 只能在 **setup 上下文**中调用 |
| 用 Authorization Bearer 传 Token | Token 通过 **请求头 `Token`** + **Cookie** 存储 |
| `new SimApiCore()` 在 Vue 项目里用 | Vue 项目统一用 `useSimApi()` Pinia Store |

---

## 10. 与 simapi-net 后端的对接约定

### 10.1 通信协议

```
[Vue 前端] -- POST(JSON) --> [simapi-net 后端]
              Header: Token: <value>
              Body:   { key: value }

[Vue 前端] <-- JSON {code, message, data} -- [simapi-net 后端]
              (HTTP Status 始终 200)
```

### 10.2 内置路由对照表

| simapi-net 路由 | simapi-vue 方法 | 触发条件 |
|-----------------|-----------------|----------|
| `POST /auth/login` | `api.login(request)` | `EnableSimApiAuth = true` |
| `POST /auth/check` | `api.checkLogin()` | `EnableSimApiAuth = true` |
| `POST /auth/logout` | `api.logout()` | `EnableSimApiAuth = true` |
| `POST /user/info` | `api.query('/user/info')` | `EnableSimApiAuth = true`（需登录） |
| `GET /versions` | `api.getVersion()` | `EnableVersionUrl`（默认开启） |

---

## 11. 构建

```bash
npm run dev    # 开发模式
npm run build  # 生产构建
```

构建产物位于 `dist/` 目录：
- `dist/index.mjs` — 核心（SimApiCore）ESM 入口
- `dist/pinia.mjs` — Pinia Store ESM 入口
- `dist/*.d.ts` — TypeScript 类型声明

### 版本号注入

库使用 `declare const` 声明版本常量，构建时通过 Vite 的 `define` 注入。

**SimApiVersion** 由 simapi 库自身构建时从 `package.json` 注入。未配置时默认为 `0.0.0-develop`。

**AppVersion** 由调用方项目在自己的 `vite.config.ts` 中注入。

---

## 12. 从 axios 迁移

```diff
- import axios from 'axios'
- const res = await axios.post('/user/list', { page: 1 })

+ import { useSimApi } from '@simcu/simapi/pinia'
+ const api = useSimApi()
+ const res = await api.query('/user/list', { page: 1 })
```

| axios | simapi-vue |
|-------|-----------|
| `axios.post()` | `api.query()` |
| `response.data` 直接是业务数据 | `SimApiBaseResponse<T>.data` 是业务数据 |
| HTTP 4xx/5xx 表示错误 | HTTP 200 + `code` 字段表示错误 |
| `interceptors.response` | `businessCallback` + `responseCallback` |
| Authorization Bearer | Token header |
