/**
 * SimApi 类型定义
 */

// 版本号占位符，构建时由 GitHub Action 替换
export const SimApiVersion = '0.0.0-version-placeholder'
export const AppVersion = '0.0.0-version-placeholder'

/** 版本信息 */
export interface SimApiVersions {
  uiApp: string
  uiSimApi: string
  apiApp: string
  apiSimApi: string
  apiAppFull: string
  apiSimApiFull: string
}

/** 认证配置 */
export interface SimApiAuthConfig {
  /** localStorage key，默认 'simapi-auth-token' */
  token_name: string
  /** 检查登录接口，默认 '/auth/check' */
  check_url: string
  /** 登出接口，默认 '/auth/logout' */
  logout_url: string
  /** 登录接口，默认 '/auth/login' */
  login_url: string
}

/** 业务错误码回调 */
export interface SimApiBusinessCallback {
  [key: number | string]: (data: any) => void
}

/** 响应拦截回调 */
export interface SimApiResponseCallback {
  success: (response: any) => any
  error: (err: any) => void
}

/** API 配置 */
export interface SimApiApiConfig {
  /** 多端点映射 */
  endpoints: { [name: string]: string }
  /** 默认端点名称 */
  defaultEndpoint: string
  /** 业务错误码回调 */
  businessCallback: SimApiBusinessCallback
  /** 响应拦截器 */
  responseCallback: SimApiResponseCallback
  /** 请求超时时间（毫秒），默认 10000 */
  timeout?: number
}

/** SimApi 完整配置 */
export interface SimApiOptions {
  debug?: boolean
  /** UI 应用版本，如果不指定则使用库内置的占位符版本 */
  uiAppVersion?: string
  auth?: Partial<SimApiAuthConfig>
  api?: Partial<SimApiApiConfig>
}

/** SimApi 标准响应格式 */
export interface SimApiBaseResponse<T = any> {
  code: number
  message: string
  data?: T
}
