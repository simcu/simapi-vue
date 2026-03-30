/**
 * SimApi Pinia Store
 * 
 * 使用方法:
 * import { useSimApi } from 'simapi'
 * const api = useSimApi()
 * await api.query('/api/xxx', data)
 */

import { defineStore } from 'pinia'
import axios, { AxiosRequestHeaders } from 'axios'

// ============ 类型定义 ============

export const SimApiVersion = '1.0.0'
export const AppVersion = '1.0.0'

export interface Versions {
  uiApp: string
  uiSimApi: string
  apiApp: string
  apiSimApi: string
  apiAppFull: string
  apiSimApiFull: string
}

export interface BusinessCallback {
  [key: number | string]: (data: any) => void
}

export interface SimApiAuthConfig {
  token_name: string
  check_url: string
  logout_url: string
  login_url: string
}

export interface SimApiConfig {
  endpoints: { [name: string]: string }
  defaultEndpoint: string
  businessCallback: BusinessCallback
}

// ============ Store 定义 ============

export const useSimApi = defineStore('simapi', {
  // ============ State ============
  state: () => ({
    debug: true,
    
    auth: {
      token_name: 'simapi-auth-token',
      check_url: '/auth/check',
      logout_url: '/auth/logout',
      login_url: '/auth/login'
    } as SimApiAuthConfig,
    
    api: {
      endpoints: { default: '' },
      defaultEndpoint: 'default',
      businessCallback: {
        401: () => localStorage.removeItem('simapi-auth-token'),
        common: () => {}
      }
    } as SimApiConfig,
    
    versions: {
      uiApp: AppVersion,
      uiSimApi: SimApiVersion,
      apiApp: '0.0.0',
      apiSimApi: '0.0.0',
      apiAppFull: '0.0.0',
      apiSimApiFull: '0.0.0'
    } as Versions
  }),

  // ============ Getters ============
  getters: {
    token: (state) => localStorage.getItem(state.auth.token_name) || '',
    isLoggedIn: (state) => !!localStorage.getItem(state.auth.token_name)
  },

  // ============ Actions ============
  actions: {
    /** 设置端点配置 */
    setEndpoints(endpoints: { [name: string]: string }): void {
      this.api.endpoints = { ...this.api.endpoints, ...endpoints }
      // 获取并打印版本信息
      this.getVersions()
    },

    /** 设置业务错误回调 */
    setBusinessCallback(code: number | string, callback: (data: any) => void): void {
      this.api.businessCallback[code] = callback
    },

    /** 设置调试模式 */
    setDebug(debug: boolean): void {
      this.debug = debug
    },

    /** 打印调试日志 */
    debug(title: string, data: any): void {
      if (this.debug) {
        console.log('[DEBUG]', title, data)
      }
    },

    /** 生成随机字符串 */
    genS4(): string {
      return (((1 + Math.random()) * 0x10000 * Date.parse(new Date())) | 0).toString(16).substring(1)
    },

    /** 获取端点地址 */
    getEndpoint(name?: string): string {
      return this.api.endpoints[name || this.api.defaultEndpoint] || ''
    },

    /** 获取并打印版本信息 */
    async getVersions(): Promise<void> {
      try {
        const resp = await axios.post(this.getEndpoint() + '/versions', {}, { timeout: 5000 })
        if (resp.data?.data) {
          this.versions = {
            uiApp: AppVersion,
            uiSimApi: SimApiVersion,
            apiApp: resp.data.data.App?.split('+')[0] || '0.0.0',
            apiSimApi: resp.data.data.SimApi?.split('+')[0] || '0.0.0',
            apiAppFull: resp.data.data.App || '0.0.0',
            apiSimApiFull: resp.data.data.SimApi || '0.0.0'
          }
        }
      } catch (e) {
        // 版本获取失败不影响主流程
      }
      // 打印版本信息，格式与 Angular 一致
      console.log(`UI主应用版本: ${this.versions.uiApp}\nUISimApi版本: ${this.versions.uiSimApi}\nAPI主应用版本: ${this.versions.apiApp}\nAPISimApi版本: ${this.versions.apiSimApi}`)
    },

    /** 发起请求 */
    async query(uri: string, params: any = {}): Promise<any> {
      const headers: Record<string, string> = {}
      const queryId = this.genS4()
      
      if (!(params instanceof FormData)) {
        headers['Content-Type'] = 'application/json'
      }

      const token = this.token
      if (token) {
        headers['Token'] = token
      }

      if (this.debug) {
        headers['Query-Id'] = queryId
        console.log('[REQUEST*]', queryId, '->', uri, 'AUTH:', token)
      }

      const url = this.getEndpoint() + uri

      try {
        const response = await axios.post(url, params, { headers: headers as AxiosRequestHeaders })
        if (this.debug) {
          console.log('[RESPONSE]', queryId, '->', response.data)
        }
        return this.handleResponse(response.data)
      } catch (error) {
        if (this.debug) {
          console.log('[RESPONSE]', queryId, '->', error)
        }
        throw error
      }
    },

    /** 处理响应 */
    handleResponse(data: any): any {
      if (data.code !== 200) {
        const callback = this.api.businessCallback[data.code] || this.api.businessCallback['common']
        callback?.(data)
      }
      return data
    },

    /** 登录 */
    async login(request: Record<string, any>): Promise<any> {
      const result = await this.query(this.auth.login_url, request)
      if (result.data) {
        localStorage.setItem(this.auth.token_name, result.data)
      }
      return result
    },

    /** 登出 */
    async logout(url?: string | null): Promise<any> {
      localStorage.removeItem(this.auth.token_name)
      if (url !== null) {
        return this.query(url ?? this.auth.logout_url).catch(() => true)
      }
      return true
    },

    /** 获取 Token */
    getToken(): string {
      return localStorage.getItem(this.auth.token_name) || ''
    }
  }
})
