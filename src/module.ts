import { defineNuxtModule, addPlugin, createResolver, addImportsDir, addServerHandler } from '@nuxt/kit'
import { sha256 } from 'ohash'
import { defu } from 'defu'

// Module options TypeScript interface definition
export interface ModuleOptions {}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'auth-core',
    configKey: 'auth'
  },
  // Default configuration options of the Nuxt module
  defaults: {},
  setup (options, nuxt) {
    const resolver = createResolver(import.meta.url)

    if (!process.env.NUXT_SESSION_PASSWORD) {
      const randomPassword = sha256(`${Date.now()}${Math.random()}`).slice(0, 32)
      process.env.NUXT_SESSION_PASSWORD = randomPassword
      if (!nuxt.options._prepare) {
        console.warn('No session password set, using a random password, please set NUXT_SESSION_PASSWORD in your .env file with at least 32 chars')
        console.log(`NUXT_SESSION_PASSWORD=${randomPassword}`)
      }
    }

    nuxt.options.alias['#auth-utils'] = resolver.resolve('./runtime/types/auth-utils-session')

    // App
    addImportsDir(resolver.resolve('./runtime/composables'))
    addPlugin(resolver.resolve('./runtime/plugins/session.server'))
    // Server
    nuxt.options.nitro.imports = nuxt.options.nitro.imports || {}
    nuxt.options.nitro.imports.dirs = nuxt.options.nitro.imports.dirs || []
    nuxt.options.nitro.imports.dirs.push(resolver.resolve('./runtime/server/utils'))
    // Waiting for https://github.com/nuxt/nuxt/pull/24000/files
    // addServerImportsDir(resolver.resolve('./runtime/server/utils'))
    addServerHandler({
      handler: resolver.resolve('./runtime/server/api/session.delete'),
      route: '/api/_auth/session',
      method: 'delete'
    })
    addServerHandler({
      handler: resolver.resolve('./runtime/server/api/session.get'),
      route: '/api/_auth/session',
      method: 'get'
    })

    // Runtime Config
    const runtimeConfig = nuxt.options.runtimeConfig
    runtimeConfig.session = defu(runtimeConfig.session, {
      name: 'nuxt-session',
      password: ''
    })
    // OAuth settings
    runtimeConfig.oauth = defu(runtimeConfig.oauth, {})
    // GitHub Oauth
    runtimeConfig.oauth.github = defu(runtimeConfig.oauth.github, {
      clientId: '',
      clientSecret: ''
    })
    // Spotify Oauth
    runtimeConfig.oauth.spotify = defu(runtimeConfig.oauth.spotify, {
      clientId: '',
      clientSecret: ''
    })
  }
})
