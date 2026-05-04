import {defineStore} from 'pinia'
import {SimApiCore} from './simapi.core'
import type {SimApiBaseResponse, SimApiOptions, SimApiVersions} from './types'

// ============ Pinia Store ============
// 仅作为 core 的代理映射，不维护任何独立状态

export const useSimApi = defineStore('simapi', {
    state: () => ({
        // 在 state 中实例化 core
        _core: new SimApiCore(),
    }),
    getters: {
        IsDebug: state => state._core.isDebug
    },
    actions: {
        // 所有方法直接代理到 core
        async loadFromFile(file: string = 'config.json'): Promise<void> {
            return this._core.loadFromFile(file)
        },

        configure(options: SimApiOptions): void {
            this._core.configure(options)
        },

        setDebug(debug: boolean): void {
            this._core.setDebug(debug);
        },

        setEndpoints(endpoints: { [name: string]: string }): void {
            this._core.setEndpoints(endpoints)
        },

        setBusinessCallback(
            code: number | string,
            callback: (data: SimApiBaseResponse) => void
        ): void {
            this._core.setBusinessCallback(code, callback)
        },

        getToken(): string {
            return this._core.getToken()
        },

        setToken(token: string): void {
            this._core.setToken(token)
        },

        removeToken(): void {
            this._core.removeToken()
        },

        async login(request: Record<string, any>): Promise<SimApiBaseResponse<string>> {
            return this._core.login(request)
        },

        async logout(url?: string | null): Promise<any> {
            return this._core.logout(url)
        },

        async checkLogin(url?: string | null): Promise<void> {
            return this._core.checkLogin(url)
        },

        async query<T = any>(
            uri: string,
            params?: any,
            endpointKey?: string,
            extraHeaders?: Record<string, string>,
            selfHandleError: boolean = false
        ): Promise<SimApiBaseResponse<T>> {
            return this._core.query<T>(uri, params, endpointKey, extraHeaders, selfHandleError)
        },

        getEndpoint(name?: string): string {
            return this._core.getEndpoint(name)
        },

        async getVersion(endpointName?: string): Promise<SimApiVersions> {
            return this._core.getVersion(endpointName)
        },
    },
})
