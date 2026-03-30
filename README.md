# SimApi - 轻量 API 请求库

基于 Axios 的 Vue 3 + Pinia HTTP 客户端库。

## 安装

```bash
npm install @simcu/simapi
```

## 快速开始

### 1. 安装依赖

```bash
npm install @simcu/simapi pinia
```

## 快速开始

### 1. 初始化配置

在 Vue 应用入口（如 `main.ts` 或 `App.vue`）中配置端点和调试模式：

```typescript
import { useSimApi } from 'simapi'

const api = useSimApi()

// 设置 API 端点
api.setEndpoints({
  default: 'https://api.example.com'
})

// 设置调试模式（默认 true）
api.setDebug(true)
```

### 2. 发起请求

```typescript
import { useSimApi } from 'simapi'

const api = useSimApi()

// 简单请求
const result = await api.query('/users/list', { page: 1 })

// 带 Token 认证的请求
const result = await api.query('/protected/resource', { id: 123 })
```

### 3. 登录/登出

```typescript
// 登录
const result = await api.login({
  phone: '13800138000',
  code: '123456'
})

// 登出
await api.logout()
```

## API 参考

### 配置方法

| 方法                                  | 说明                                                       |
| ------------------------------------- | ---------------------------------------------------------- |
| `setEndpoints(endpoints)`             | 设置 API 端点，如 `{ default: 'https://api.example.com' }` |
| `setDebug(debug: boolean)`            | 开启/关闭调试模式                                          |
| `setBusinessCallback(code, callback)` | 设置业务错误码回调                                         |

### 请求方法

| 方法                     | 说明           |
| ------------------------ | -------------- |
| `api.query(uri, params)` | 发起 POST 请求 |
| `api.login(data)`        | 登录           |
| `api.logout()`           | 登出           |

### 工具方法

| 方法                     | 说明           |
| ------------------------ | -------------- |
| `api.getEndpoint(name?)` | 获取端点地址   |
| `api.getToken()`         | 获取当前 Token |

### Getters

| 属性             | 说明                 |
| ---------------- | -------------------- |
| `api.token`      | 当前 Token（响应式） |
| `api.isLoggedIn` | 是否已登录（响应式） |

## 调试日志

启用调试模式后，控制台会输出：

```
[REQUEST*] queryId -> /uri AUTH: token
[RESPONSE] queryId -> {data: {...}, code: 200}
```

设置端点后会自动打印版本信息：

```
UI主应用版本: 1.0.0
UISimApi版本: 1.0.0
API主应用版本: x.x.x
APISimApi版本: x.x.x
```

## 业务错误处理

```typescript
const api = useSimApi()

// 处理 401 未授权
api.setBusinessCallback(401, (data) => {
  console.log('Token 过期', data)
  localStorage.removeItem('token')
  router.push('/login')
})

// 处理 403 禁止访问
api.setBusinessCallback(403, (data) => {
  ElMessage.error('没有权限')
})

// 处理所有非 200 错误
api.setBusinessCallback('common', (data) => {
  ElMessage.error(data.message)
})
```
