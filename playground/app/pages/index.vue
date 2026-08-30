<script setup lang="ts">
const { user, openInPopup } = useUserSession()

const inPopup = ref(false)
const providers = computed(() =>
  [
    {
      title: user.value?.google || 'Google',
      to: '/auth/google',
      disabled: Boolean(user.value?.google),
      icon: 'i-simple-icons-google',
    },
    {
      title: user.value?.facebook || 'Facebook',
      to: '/auth/facebook',
      disabled: Boolean(user.value?.facebook),
      icon: 'i-simple-icons-facebook',
    },
    {
      title: user.value?.instagram || 'instagram',
      to: '/auth/instagram',
      disabled: Boolean(user.value?.instagram),
      icon: 'i-simple-icons-instagram',
    },
    {
      title: user.value?.github || 'GitHub',
      to: '/auth/github',
      disabled: Boolean(user.value?.github),
      icon: 'i-simple-icons-github',
    },
    {
      title: user.value?.bluesky || 'Bluesky',
      onClick() {
        const handle = prompt('Enter your Bluesky handle')
        if (handle) {
          navigateTo(
            {
              path: '/auth/bluesky',
              query: { handle },
            },
            {
              external: true,
            },
          )
        }
      },
      disabled: Boolean(user.value?.bluesky),
      icon: 'i-simple-icons-bluesky',
    },
    {
      title: user.value?.mastodon || 'Mastodon',
      onClick() {
        const instance = prompt('Enter your Mastodon instance (e.g. mastodon.social)')
        if (instance) {
          navigateTo(
            {
              path: '/auth/mastodon',
              query: { instance },
            },
            {
              external: true,
            },
          )
        }
      },
      disabled: Boolean(user.value?.mastodon),
      icon: 'i-simple-icons-mastodon',
    },
    {
      title: user.value?.gitlab || 'GitLab',
      to: '/auth/gitlab',
      disabled: Boolean(user.value?.gitlab),
      icon: 'i-simple-icons-gitlab',
    },
    {
      title: user.value?.line || 'Line',
      to: '/auth/line',
      disabled: Boolean(user.value?.line),
      icon: 'i-simple-icons-line',
    },
    {
      title: user.value?.linear || 'Linear',
      to: '/auth/linear',
      disabled: Boolean(user.value?.linear),
      icon: 'i-simple-icons-linear',
    },
    {
      title: user.value?.linkedin || 'LinkedIn',
      to: '/auth/linkedin',
      disabled: Boolean(user.value?.linkedin),
      icon: 'i-simple-icons-linkedin',
    },
    {
      title: user.value?.microsoft || 'Microsoft',
      to: '/auth/microsoft',
      disabled: Boolean(user.value?.microsoft),
      icon: 'i-simple-icons-microsoft',
    },
    {
      title: user.value?.azureb2c || 'Azure B2C',
      to: '/auth/azureb2c',
      disabled: Boolean(user.value?.azureb2c),
      icon: 'i-simple-icons-microsoftazure',
    },
    {
      title: user.value?.cognito || 'Cognito',
      to: '/auth/cognito',
      disabled: Boolean(user.value?.cognito),
      icon: 'i-simple-icons-amazonaws',
    },
    {
      title: user.value?.discord || 'Discord',
      to: '/auth/discord',
      disabled: Boolean(user.value?.discord),
      icon: 'i-simple-icons-discord',
    },
    {
      title: user.value?.spotify || 'Spotify',
      to: '/auth/spotify',
      disabled: Boolean(user.value?.spotify),
      icon: 'i-simple-icons-spotify',
    },
    {
      title: user.value?.twitch || 'Twitch',
      to: '/auth/twitch',
      disabled: Boolean(user.value?.twitch),
      icon: 'i-simple-icons-twitch',
    },
    {
      title: user.value?.auth0 || 'Auth0',
      to: '/auth/auth0',
      disabled: Boolean(user.value?.auth0),
      icon: 'i-simple-icons-auth0',
    },
    {
      title: user.value?.battledotnet || 'Battle.net',
      to: '/auth/battledotnet',
      disabled: Boolean(user.value?.battledotnet),
      icon: 'i-simple-icons-battledotnet',
    },
    {
      title: user.value?.box || 'Box',
      to: '/auth/box',
      disabled: Boolean(user.value?.box),
      icon: 'i-simple-icons-box',
    },
    {
      title: user.value?.keycloak || 'Keycloak',
      to: '/auth/keycloak',
      disabled: Boolean(user.value?.keycloak),
      icon: 'i-simple-icons-redhat',
    },
    {
      title: user.value?.paypal || 'PayPal',
      to: '/auth/paypal',
      disabled: Boolean(user.value?.paypal),
      icon: 'i-simple-icons-paypal',
    },
    {
      title: user.value?.steam || 'Steam',
      to: '/auth/steam',
      disabled: Boolean(user.value?.steam),
      icon: 'i-simple-icons-steam',
    },
    {
      title: user.value?.x || 'X',
      to: '/auth/x',
      disabled: Boolean(user.value?.x),
      icon: 'i-simple-icons-x',
    },
    {
      title: user.value?.xsuaa || 'XSUAA',
      to: '/auth/xsuaa',
      disabled: Boolean(user.value?.xsuaa),
      icon: 'i-lucide-globe',
    },
    {
      title: user.value?.vk || 'VK',
      to: '/auth/vk',
      disabled: Boolean(user.value?.vk),
      icon: 'i-simple-icons-vk',
    },
    {
      title: user.value?.yandex || 'Yandex',
      to: '/auth/yandex',
      disabled: Boolean(user.value?.yandex),
      icon: 'i-gravity-ui-logo-yandex',
    },
    {
      title: user.value?.tiktok || 'TikTok',
      to: '/auth/tiktok',
      disabled: Boolean(user.value?.tiktok),
      icon: 'i-simple-icons-tiktok',
    },
    {
      title: user.value?.dropbox || 'Dropbox',
      to: '/auth/dropbox',
      disabled: Boolean(user.value?.dropbox),
      icon: 'i-simple-icons-dropbox',
    },
    {
      title: user.value?.polar || 'Polar',
      to: '/auth/polar',
      disabled: Boolean(user.value?.polar),
      icon: 'i-iconoir-polar-sh',
    },
    {
      title: user.value?.workos || 'WorkOS',
      to: '/auth/workos',
      disabled: Boolean(user.value?.workos),
      icon: 'i-logos-workos-icon',
    },
    {
      title: user.value?.zitadel || 'Zitadel',
      to: '/auth/zitadel',
      disabled: Boolean(user.value?.zitadel),
      icon: 'i-gravity-ui-lock',
    },
    {
      title: user.value?.authentik || 'Authentik',
      to: '/auth/authentik',
      disabled: Boolean(user.value?.authentik),
      icon: 'i-simple-icons-authentik',
    },
    {
      title: user.value?.seznam || 'Seznam',
      to: '/auth/seznam',
      disabled: Boolean(user.value?.seznam),
      icon: 'i-gravity-ui-lock',
    },
    {
      title: user.value?.strava || 'Strava',
      to: '/auth/strava',
      disabled: Boolean(user.value?.strava),
      icon: 'i-simple-icons-strava',
    },
    {
      title: user.value?.hubspot || 'HubSpot',
      to: '/auth/hubspot',
      disabled: Boolean(user.value?.hubspot),
      icon: 'i-simple-icons-hubspot',
    },
    {
      title: user.value?.atlassian || 'Atlassian',
      to: '/auth/atlassian',
      disabled: Boolean(user.value?.atlassian),
      icon: 'i-simple-icons-atlassian',
    },
    {
      title: user.value?.apple || 'Apple',
      to: '/auth/apple',
      disabled: Boolean(user.value?.apple),
      icon: 'i-simple-icons-apple',
    },
    {
      title: user.value?.kick || 'Kick',
      to: '/auth/kick',
      disabled: Boolean(user.value?.kick),
      icon: 'i-simple-icons-kick',
    },
    {
      title: user.value?.salesforce || 'Salesforce',
      to: `/auth/salesforce`,
      disabled: Boolean(user.value?.salesforce),
      icon: 'i-simple-icons-salesforce',
    },
    {
      title: user.value?.slack || 'Slack',
      to: '/auth/slack',
      disabled: Boolean(user.value?.slack),
      icon: 'i-simple-icons-slack',
    },
    {
      title: user.value?.heroku || 'Heroku',
      to: '/auth/heroku',
      disabled: Boolean(user.value?.heroku),
      icon: 'i-simple-icons-heroku',
    },
    {
      title: user.value?.livechat || 'Livechat',
      to: '/auth/livechat',
      disabled: Boolean(user.value?.livechat),
      icon: 'i-simple-icons-livechat',
    },
    {
      title: user.value?.roblox || 'Roblox',
      to: '/auth/roblox',
      disabled: Boolean(user.value?.roblox),
      icon: 'i-simple-icons-roblox',
    },
    {
      title: user.value?.okta || 'Okta',
      to: '/auth/okta',
      disabled: Boolean(user.value?.okta),
      icon: 'i-simple-icons-okta',
    },
    {
      title: user.value?.ory || 'Ory',
      to: '/auth/ory',
      disabled: Boolean(user.value?.ory),
      icon: 'i-simple-icons-ory',
    },
    {
      title: user.value?.shopifyCustomer || 'Shopify Customer',
      to: '/auth/shopifyCustomer',
      disabled: Boolean(user.value?.shopifyCustomer),
      icon: 'i-simple-icons-shopify',
    },
    {
      title: user.value?.oidc || 'OIDC',
      to: '/auth/oidc',
      disabled: Boolean(user.value?.oidc),
      icon: 'i-simple-icons-openid',
    },
    {
      title: user.value?.osu || 'osu!',
      to: '/auth/osu',
      disabled: Boolean(user.value?.osu),
      icon: 'i-simple-icons-osu',
    },
    {
      title: user.value?.riotgames || 'Riot Games',
      to: '/auth/riotgames',
      disabled: Boolean(user.value?.riotgames),
      icon: 'i-simple-icons-riotgames',
    },
  ].map(p => ({
    ...p,
    prefetch: false,
    external: true,
    to: inPopup.value ? '#' : p.to,
    onClick: inPopup.value && p.to ? () => openInPopup(p.to) : p.onClick,
  })),
)
</script>

<template>
  <UPage>
    <UPageHeader title="Welcome to the playground" />
    <UPageBody>
      <AuthState>
        <template #default="{ session }">
          <strong>User session:</strong>
          <pre class="border border-default p-2 bg-muted rounded-md">{{
            session || "null"
          }}</pre>
        </template>
        <template #placeholder>
          ...
        </template>
      </AuthState>
      <ProseH2 class="flex items-center gap-2 justify-between">
        <span>Login With</span>
        <USwitch
          v-model="inPopup"
          name="open-in-popup"
          label="Open in popup"
          size="sm"
        />
      </ProseH2>
      <UPageGrid>
        <UPageCard
          v-for="provider in providers"
          :key="provider.label"
          v-bind="provider"
          :ui="{ leadingIcon: 'text-neutral' }"
          :to="provider.disabled ? undefined : provider.to"
          :variant="provider.disabled ? 'solid' : 'subtle'"
        />
      </UPageGrid>
      <div class="flex flex-col gap-2 mt-4">
        <UButton
          to="/secret"
          class="mt-2"
          variant="link"
          :padded="false"
        >
          Secret page
        </UButton>
        <UButton
          to="/about"
          class="mt-2"
          variant="link"
          :padded="false"
        >
          About page
        </UButton>
        <UButton
          to="/sockets"
          class="mt-2"
          variant="link"
          :padded="false"
        >
          Sockets
        </UButton>
      </div>
    </UPageBody>
  </UPage>
</template>
