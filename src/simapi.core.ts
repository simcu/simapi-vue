/**
 * SimApi Core — 纯 TypeScript 核心，无框架依赖
 *
 * 支持所有 JS/TS 环境（Node.js、浏览器、小程序等）。
 *
 * @example
 * import { SimApiCore } from '@simcu/simapi'
 * const api = new SimApiCore()
 * api.setEndpoints({ default: 'https://api.example.com' })
 * const res = await api.query('/users/list', { page: 1 })
 */

import {
    type SimApiVersions,
    type SimApiAuthConfig,
    type SimApiApiConfig,
    type SimApiOptions,
    type SimApiBaseResponse,
} from './types'

export type {
    SimApiVersions,
    SimApiAuthConfig,
    SimApiApiConfig,
    SimApiOptions,
    SimApiBaseResponse,
} from './types'

declare const SimApiVersion: string;
declare const AppVersion: string;

// ── Helper: Fetch with Timeout ────────────────────────────────────────

function fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeout: number = 10000
): Promise<Response> {
    return Promise.race([
        fetch(url, options),
        new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Request timeout after ${timeout}ms`)), timeout)
        ),
    ])
}

// ── Helper: Fetch POST with JSON body ────────────────────────────────────

async function fetchPost<T = any>(
    url: string,
    body: any,
    headers: Record<string, string>,
    timeout: number
): Promise<SimApiBaseResponse<T>> {
    const options: RequestInit = {
        method: 'POST',
        headers: headers as HeadersInit,
        body: body instanceof FormData ? body : JSON.stringify(body),
        credentials: 'omit',  // 从不发送 Cookie
    }

    const response = await fetchWithTimeout(url, options, timeout)

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw {
            status: response.status,
            statusText: response.statusText,
            data: errorData,
            message: `HTTP ${response.status}: ${response.statusText}`,
        }
    }

    return response.json()
}

// ── SimApiCore ────────────────────────────────────────

export class SimApiCore {
    private debug: boolean = true
    private auth: SimApiAuthConfig = {
        token_name: 'simapi-auth-token',
        check_url: '/auth/check',
        logout_url: '/auth/logout',
        login_url: '/auth/login',
    }

    private api: SimApiApiConfig = {
        endpoints: {default: ''},
        defaultEndpoint: 'default',
        businessCallback: {
            401: () => this.removeToken(),
            common: () => {
            },
        },
        responseCallback: {
            success: (response: any) => response,
            error: (_err: any) => {
            },
        },
        timeout: 10000,
    }

    constructor(options?: SimApiOptions) {
        if (options) {
            this.configure(options)
        }
    }

    /**
     * 从 window.simapi 读取配置并初始化
     *
     * 支持字段：endpoints, defaultEndpoint, debug
     * 业务回调（businessCallback / responseCallback）需在代码中处理
     */
    autoInit(): void {
        const config = (window as any).simapi
        if (!config) return

        if (config.debug !== undefined) {
            this.debug = config.debug
        }
        if (config.endpoints) {
            this.api.endpoints = {...this.api.endpoints, ...config.endpoints}
        }
        if (config.defaultEndpoint) {
            this.api.defaultEndpoint = config.defaultEndpoint
        }
    }

    configure(options: SimApiOptions): void {
        if (options.debug !== undefined) {
            this.debug = options.debug
        }
        if (options.auth) {
            this.auth = {...this.auth, ...options.auth}
        }
        if (options.api) {
            this.api = {
                ...this.api,
                ...options.api,
                endpoints: {...this.api.endpoints, ...(options.api.endpoints ?? {})},
                businessCallback: {...this.api.businessCallback, ...(options.api.businessCallback ?? {})},
                responseCallback: {...this.api.responseCallback, ...(options.api.responseCallback ?? {})},
            }
        }
    }

    get isDebug() {
        return this.debug
    }

    setDebug(debug: boolean) {
        this.debug = debug;
    }

    setEndpoints(endpoints: { [name: string]: string }): void {
        this.api.endpoints = {...this.api.endpoints, ...endpoints}
    }

    getEndpoint(name?: string): string {
        return this.api.endpoints[name ?? this.api.defaultEndpoint] ?? ''
    }

    setBusinessCallback(code: number | string, callback: (data: any) => void): void {
        this.api.businessCallback[code] = callback
    }

    getToken(): string {
        const name = this.auth.token_name
        const match = document.cookie.match(new RegExp(`(?:^|;)\\s?${name}=([^;]+)`))
        return match ? match[1] : ''
    }

    setToken(token: string): void {
        const name = this.auth.token_name
        document.cookie = `${name}=${token}; path=/; secure; samesite=none`
    }

    removeToken(): void {
        const name = this.auth.token_name
        document.cookie = `${name}=; path=/; max-age=0; secure; samesite=none`
    }


    genS4(): string {
        return (((1 + Math.random()) * 0x10000 * Date.parse(new Date().toString())) | 0)
            .toString(16)
            .substring(1)
    }

    /**
     * 日志工具（仅在 debug 模式下输出）
     *
     * @example
     * api.logDebug('用户登录', { id: 1, name: 'test' })
     * api.logDebug('请求开始', uri, params)
     */
    logDebug(...args: any[]): void {
        if (!this.debug) return
        console.log('[DEBUG]', ...args)
    }

    /**
     * 获取版本信息
     *
     * @param endpointName - 指定从哪个 endpoint 获取版本，默认使用 default endpoint
     * @returns 版本信息对象
     *
     * @example
     * // 从默认 endpoint 获取
     * const versions = await api.getVersion()
     *
     * // 从指定 endpoint 获取
     * const versions = await api.getVersion('backup')
     */
    async getVersion(endpointName?: string): Promise<SimApiVersions> {
        const versions: SimApiVersions = {
            uiApp: typeof AppVersion === 'undefined' ? "0.0.0-develop" : AppVersion,
            uiSimApi: typeof SimApiVersion === 'undefined' ? "0.0.0-develop" : SimApiVersion,
            apiApp: '0.0.0',
            apiSimApi: '0.0.0',
            apiAppFull: '0.0.0',
            apiSimApiFull: '0.0.0',
        };
        try {
            const resp = await this.query<any>('/versions', {}, endpointName)
            if (resp?.data) {
                const d = resp.data
                versions.apiApp = d.App?.split('+')[0] ?? '0.0.0';
                versions.apiSimApi = d.SimApi?.split('+')[0] ?? '0.0.0';
                versions.apiAppFull = d.App ?? '0.0.0';
                versions.apiSimApiFull = d.SimApi ?? '0.0.0';
                if (this.debug) {
                    console.log(`UI主应用版本: ${versions.uiApp}\nUISimApi版本: ${versions.uiSimApi}\nAPI主应用版本: ${versions.apiApp}\nAPISimApi版本: ${versions.apiSimApi}`)
                }
                return versions
            }
        } catch {
            // 版本获取失败返回默认值
        }
        return versions;
    }

    async query<T = any>(
        uri: string,
        params: any = {},
        endpointKey?: string,
        extraHeaders?: Record<string, string>,
        selfHandleError: boolean = false
    ): Promise<SimApiBaseResponse<T>> {
        const headers: Record<string, string> = {...extraHeaders, ...{}}
        const queryId = this.genS4()

        if (!(params instanceof FormData)) {
            headers['Content-Type'] = 'application/json'
        }

        const token = this.getToken()
        if (token) {
            headers['Token'] = token
        }

        if (this.debug) {
            headers['Query-Id'] = queryId
            console.log('[REQUEST*]', queryId, '->', uri, 'AUTH:', this.getToken())
        }

        const url = this.getEndpoint(endpointKey) + uri

        try {
            const respData = await fetchPost<T>(
                url,
                params,
                headers,
                this.api.timeout ?? 10000
            )
            if (this.debug) {
                console.log('[RESPONSE]', queryId, '->', respData)
            }
            const processedData = this.api.responseCallback.success(respData) as SimApiBaseResponse<T>

            // 业务回调处理
            if (!selfHandleError) {
                if (this.api.businessCallback.hasOwnProperty(processedData.code)) {
                    this.api.businessCallback[processedData.code](processedData)
                } else if (this.api.businessCallback['common'] && processedData.code !== 200) {
                    this.api.businessCallback['common'](processedData)
                }
            }

            // code != 200 时抛出业务错误
            if (processedData.code !== 200) {
                throw processedData
            }
            return processedData

        } catch (error: any) {
            if (this.debug) {
                console.log('[RESPONSE]', queryId, '->', error)
            }
            // 网络/HTTP 错误：包装成标准响应格式抛出
            if (!error?.code) {
                this.api.responseCallback.error(error)
                throw {
                    code: -1,
                    message: error?.message || '网络错误',
                    data: error,
                } as SimApiBaseResponse<T>
            }
            // 业务错误直接抛出
            throw error
        }
    }

    async login(request: Record<string, any>): Promise<SimApiBaseResponse<string>> {
        const result = await this.query<string>(this.auth.login_url, request)
        if (result?.data) {
            this.setToken(result.data)
        }
        return result
    }

    async logout(url?: string | null): Promise<any> {
        if (url !== null) {
            this.query(url ?? this.auth.logout_url).catch(() => true)
        }
        this.removeToken()
        return true
    }

    async checkLogin(url?: string | null): Promise<void> {
        if (url !== null) {
            await this.query(url ?? this.auth.check_url).catch(() => {
            })
        } else if (this.getToken()) {
            this.api.businessCallback[401]?.(null)
        }
    }
}
