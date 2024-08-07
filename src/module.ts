import { writeFile, readFile } from 'node:fs/promises'
import {
  defineNuxtModule,
  addPlugin,
  createResolver,
  addImportsDir,
  addServerHandler,
  addServerPlugin,
  addServerImportsDir,
  addComponentsDir,
} from '@nuxt/kit'
import { join } from 'pathe'
import { defu } from 'defu'
import { randomUUID } from 'uncrypto'

// Module options TypeScript interface definition
export interface ModuleOptions {}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'auth-utils',
    configKey: 'auth',
  },
  // Default configuration options of the Nuxt module
  defaults: {},
  async setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)

    nuxt.options.alias['#auth-utils'] = resolver.resolve('./runtime/types/index')

    // App
    addComponentsDir({ path: resolver.resolve('./runtime/app/components') })
    addImportsDir(resolver.resolve('./runtime/app/composables'))
    addPlugin(resolver.resolve('./runtime/app/plugins/session.server'))
    addPlugin(resolver.resolve('./runtime/app/plugins/session.client'))
    // Server
    addServerPlugin(resolver.resolve('./runtime/server/plugins/oauth'))
    addServerImportsDir(resolver.resolve('./runtime/server/lib/oauth'))
    addServerImportsDir(resolver.resolve('./runtime/server/utils'))
    addServerHandler({
      handler: resolver.resolve('./runtime/server/api/session.delete'),
      route: '/api/_auth/session',
      method: 'delete',
    })
    addServerHandler({
      handler: resolver.resolve('./runtime/server/api/session.get'),
      route: '/api/_auth/session',
      method: 'get',
    })

    // Runtime Config
    const runtimeConfig = nuxt.options.runtimeConfig
    runtimeConfig.session = defu(runtimeConfig.session, {
      name: 'nuxt-session',
      password: process.env.NUXT_SESSION_PASSWORD || '',
      cookie: {
        sameSite: 'lax',
      },
    })

    // Generate the session password
    if (nuxt.options.dev && !runtimeConfig.session.password) {
      runtimeConfig.session.password = randomUUID().replace(/-/g, '')
      // Add it to .env
      const envPath = join(nuxt.options.rootDir, '.env')
      const envContent = await readFile(envPath, 'utf-8').catch(() => '')
      if (!envContent.includes('NUXT_SESSION_PASSWORD')) {
        await writeFile(
          envPath,
          `${envContent ? envContent + '\n' : envContent}NUXT_SESSION_PASSWORD=${runtimeConfig.session.password}`,
          'utf-8',
        )
      }
    }

    // OAuth settings
    runtimeConfig.oauth = defu(runtimeConfig.oauth, {})
    // GitHub OAuth
    runtimeConfig.oauth.github = defu(runtimeConfig.oauth.github, {
      clientId: '',
      clientSecret: '',
    })
    // Spotify OAuth
    runtimeConfig.oauth.spotify = defu(runtimeConfig.oauth.spotify, {
      clientId: '',
      clientSecret: '',
    })
    // Google OAuth
    runtimeConfig.oauth.google = defu(runtimeConfig.oauth.google, {
      clientId: '',
      clientSecret: '',
    })
    // Twitch OAuth
    runtimeConfig.oauth.twitch = defu(runtimeConfig.oauth.twitch, {
      clientId: '',
      clientSecret: '',
    })
    // Auth0 OAuth
    runtimeConfig.oauth.auth0 = defu(runtimeConfig.oauth.auth0, {
      clientId: '',
      clientSecret: '',
      domain: '',
      audience: '',
    })
    // Microsoft OAuth
    runtimeConfig.oauth.microsoft = defu(runtimeConfig.oauth.microsoft, {
      clientId: '',
      clientSecret: '',
      tenant: '',
      scope: [],
      authorizationURL: '',
      tokenURL: '',
      userURL: '',
      redirectUrl: '',
    })
    // Discord OAuth
    runtimeConfig.oauth.discord = defu(runtimeConfig.oauth.discord, {
      clientId: '',
      clientSecret: '',
    })
    // Battle.net OAuth
    runtimeConfig.oauth.battledotnet = defu(runtimeConfig.oauth.battledotnet, {
      clientId: '',
      clientSecret: '',
    })
    // Keycloak OAuth
    runtimeConfig.oauth.keycloak = defu(runtimeConfig.oauth.keycloak, {
      clientId: '',
      clientSecret: '',
      serverUrl: '',
      realm: '',
    })
    // LinkedIn OAuth
    runtimeConfig.oauth.linkedin = defu(runtimeConfig.oauth.linkedin, {
      clientId: '',
      clientSecret: '',
    })
    // Cognito OAuth
    runtimeConfig.oauth.cognito = defu(runtimeConfig.oauth.cognito, {
      clientId: '',
      clientSecret: '',
      region: '',
      userPoolId: '',
    })
    // Facebook OAuth
    runtimeConfig.oauth.facebook = defu(runtimeConfig.oauth.facebook, {
      clientId: '',
      clientSecret: '',
    })
    // PayPal OAuth
    runtimeConfig.oauth.paypal = defu(runtimeConfig.oauth.paypal, {
      clientId: '',
      clientSecret: '',
    })
    // Steam OAuth
    runtimeConfig.oauth.steam = defu(runtimeConfig.oauth.steam, {
      apiKey: '',
    })
    // X OAuth
    runtimeConfig.oauth.x = defu(runtimeConfig.oauth.x, {
      clientId: '',
      clientSecret: '',
    })
    // XSUAA OAuth
    runtimeConfig.oauth.xsuaa = defu(runtimeConfig.oauth.xsuaa, {
      clientId: '',
      clientSecret: '',
      domain: '',
    })
    // Yandex OAuth
    runtimeConfig.oauth.yandex = defu(runtimeConfig.oauth.yandex, {
      clientId: '',
      clientSecret: '',
    })
  },
})
