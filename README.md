# @simcu/simapi

> 轻量级 HTTP 请求库，基于原生 fetch，支持任意 JS/TS 环境及 Vue3。

## 安装

```bash
npm install @simcu/simapi
```

## 架构

```
src/
├── types.ts          # 类型定义（SimApiBaseResponse、SimApiOptions 等）
├── simapi.core.ts    # 纯 TS 核心，无框架依赖
└── simapi.pinia.ts   # Vue3 Pinia Store 封装
```

## 核心层（框架无关）

适用于浏览器、Node.js、小程序等任意环境。

```typescript
import { SimApiCore } from '@simcu/simapi'

const api = new SimApiCore()

// 从 window.simapi 读取配置（可选）
api.autoInit()

// 或手动配置
api.configure({
  api: { endpoints: { default: 'https://api.example.com' } },
  debug: true,
})

// 发起请求
const res = await api.query('/users/list', { page: 1 })
// res.code === 200，res.data 为业务数据

// 登录
await api.login({ phone: '13800138000', code: '123456' })

// 登出
await api.logout()

// 注册业务错误码回调
api.setBusinessCallback(401, () => router.push('/login'))
api.setBusinessCallback('common', (data) => alert(data.message))
```

## Vue3

安装 Pinia：

```bash
npm install pinia
```

```typescript
// main.ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'

const app = createApp(App)
app.use(createPinia())
app.mount('#app')
```

```typescript
// 任意组件
import { useSimApi } from '@simcu/simapi'

const api = useSimApi()

// 响应式
console.log(api.token)       // 当前 Token
console.log(api.isLoggedIn)  // 是否已登录

// 发起请求
const res = await api.query('/users/list', { page: 1 })
console.log(res.data)

// 登录 / 登出
await api.login({ phone: '13800138000', code: '123456' })
await api.logout()

// 调试模式
api.setDebug(true)
```

### 多端点

```typescript
api.setEndpoints({
  default: 'https://api.example.com',
  admin: 'https://admin.example.com',
})

// 指定端点发请求
await api.query('/stats', {}, 'admin')
```

## autoInit — 从 window 读取配置

仅支持三个字段：`endpoints`、`defaultEndpoint`、`debug`。业务回调需在代码中通过 `setBusinessCallback` 处理。

```html
<script>
  window.simapi = {
    endpoints: {
      default: 'https://api.example.com',
      admin: 'https://admin.example.com',
    },
    defaultEndpoint: 'default',
    debug: false,
  }
</script>
```

初始化时手动调用：

```typescript
// 方式一：从 window.simapi 读取
const api = useSimApi()
api.autoInit()

// 方式二：直接传入配置
const api = useSimApi()
api.configure({
  api: { endpoints: { default: 'https://api.example.com' } },
})
```

## SimApiBaseResponse 响应格式

```typescript
interface SimApiBaseResponse<T = any> {
  code: number      // 200 = 成功，其他为业务错误码
  message: string   // 提示信息
  data?: T          // 业务数据
}
```

## 完整配置参考

### SimApiOptions — 完整配置结构

```typescript
interface SimApiOptions {
  /** 调试模式，默认 true */
  debug?: boolean

  /** 认证相关配置 */
  auth?: Partial<SimApiAuthConfig>

  /** API 相关配置 */
  api?: Partial<SimApiApiConfig>
}
```

### SimApiAuthConfig — 认证配置

```typescript
interface SimApiAuthConfig {
  /** localStorage 中存储 Token 的 key */
  token_name: string          // 默认 'simapi-auth-token'

  /** 检查登录状态的接口路径 */
  check_url: string           // 默认 '/auth/check'

  /** 登出接口路径 */
  logout_url: string          // 默认 '/auth/logout'

  /** 登录接口路径 */
  login_url: string           // 默认 '/auth/login'
}
```

### SimApiApiConfig — API 配置

```typescript
interface SimApiApiConfig {
  /** 多端点映射，key 为端点名，value 为 baseURL */
  endpoints: { [name: string]: string }

  /** 默认端点名，默认 'default' */
  defaultEndpoint: string

  /** 业务错误码回调，key 为错误码或 'common' */
  businessCallback: SimApiBusinessCallback

  /** 响应拦截回调 */
  responseCallback: SimApiResponseCallback

  /** 请求超时时间（毫秒），默认 10000 */
  timeout?: number
}
```

**⚠️ CORS 说明**

- 本库使用原生 fetch API，默认不发送 Cookie（`credentials: 'omit'`）
- Token 通过请求头 `Token` 传递，无需依赖 Cookie
- 服务器返回 `Access-Control-Allow-Origin: *` 不会有问题

### SimApiBusinessCallback — 业务回调

key 支持数字错误码或 `'common'`（通用兜底回调）：

```typescript
type SimApiBusinessCallback = {
  [code: number | string]: (data: SimApiBaseResponse) => void
}

// 示例
{
  401: (data) => router.push('/login'),     // 未授权
  403: (data) => ElMessage.error('无权限'),  // 无权限
  500: (data) => console.error(data),       // 服务器错误
  'common': (data) => ElMessage.error(data.message)  // 其他错误码兜底
}
```

### SimApiResponseCallback — 响应拦截

```typescript
interface SimApiResponseCallback {
  /** 成功响应拦截，可在此统一处理数据结构 */
  success: (response: any) => any

  /** 网络/HTTP 错误拦截 */
  error: (err: any) => void
}

// 示例：统一脱敏处理
{
  success: (res) => {
    // fetch 返回 { code, message, data }
    return res
  },
  error: (err) => {
    console.error('请求失败', err)
    throw err
  }
}
```

### SimApiVersions — 版本信息

```typescript
interface SimApiVersions {
  uiApp: string        // 前端应用版本
  uiSimApi: string     // 前端 SimApi 版本
  apiApp: string       // 后端应用版本（简化版，如 "1.2.3"）
  apiSimApi: string    // 后端 SimApi 版本（简化版）
  apiAppFull: string   // 后端应用版本（完整版，如 "1.2.3+20240101"）
  apiSimApiFull: string // 后端 SimApi 版本（完整版）
}
```

### 完整配置示例

```typescript
api.configure({
  debug: false,

  auth: {
    token_name: 'my-app-token',
    check_url: '/api/auth/check',
    logout_url: '/api/auth/logout',
    login_url: '/api/auth/login',
  },

  api: {
    endpoints: {
      default: 'https://api.example.com',
      admin: 'https://admin.example.com',
    },
    defaultEndpoint: 'default',

    businessCallback: {
      401: () => router.push('/login'),
      403: () => ElMessage.error('无权限访问'),
      500: (data) => console.error('服务器错误:', data.message),
      'common': (data) => ElMessage.error(data.message || '请求失败'),
    },

    responseCallback: {
      success: (res) => res.data ?? res,
      error: (err) => {
        console.error('网络错误', err)
      },
    },
  },
})
```

## API 参考

### SimApiCore（核心类）

| 方法/属性 | 说明 |
|-----------|------|
| `configure(options)` | 批量配置（深合并） |
| `autoInit()` | 从 `window.simapi` 读取配置（endpoints、defaultEndpoint、debug） |
| `setEndpoints(map)` | 设置端点，自动触发版本检查 |
| `setBusinessCallback(code, fn)` | 注册业务错误码回调 |
| `setDebug(debug)` | 设置调试模式 |
| `query(uri, params?, endpointKey?, headers?)` | POST 请求，返回 `Promise<SimApiBaseResponse<T>>` |
| `login(request)` | 登录，自动存 Token |
| `logout(url?)` | 登出，清除 Token |
| `checkLogin(url?)` | 主动检查登录状态 |
| `getToken()` | 获取 Token |
| `setToken(token)` | 手动设置 Token |
| `removeToken()` | 清除 Token |
| `isLoggedIn` | getter，是否已登录 |
| `token` | getter，获取当前 Token |
| `debug` | boolean，调试模式 |
| `versions` | 版本信息对象 |

## 构建

```bash
npm install
npm run build
npm link   # 本地调试
```

---

## 从旧版迁移

如果你之前使用的是带 axios 的版本，迁移非常简单：

```diff
- import axios from 'axios'
+ import { SimApiCore } from '@simcu/simapi'
- // ... 你的 axios 配置

+ const api = new SimApiCore()
+ api.setEndpoints({ default: 'https://api.example.com' })
+ const res = await api.query('/users/list', { page: 1 })
```

API 完全兼容，无需其他改动。主要变化：
- 使用原生 fetch 替代 axios
- Token 通过请求头 `Token` 传递（不是 `Authorization: Bearer`）
- 默认不发送 Cookie，避免 CORS 问题
