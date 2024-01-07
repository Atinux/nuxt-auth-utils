<script setup lang="ts">
const { loggedIn, user, session, clear } = useUserSession()

const providers = computed(() => [
  {
    label: session.value.user?.github?.login || 'GitHub',
    to: '/auth/github',
    disabled: Boolean(user.value?.github),
    icon: 'i-simple-icons-github',
  },
  {
    label: session.value.user?.spotify?.display_name || 'Spotify',
    to: '/auth/spotify',
    disabled: Boolean(user.value?.spotify),
    icon: 'i-simple-icons-spotify',
  },
  {
    label: session.value.user?.google?.email || 'Google',
    to: '/auth/google',
    disabled: Boolean(user.value?.google),
    icon: 'i-simple-icons-google',
  },
  {
    label: session.value.user?.twitch?.login || 'Twitch',
    to: '/auth/twitch',
    disabled: Boolean(user.value?.twitch),
    icon: 'i-simple-icons-twitch',
  },
  {
    label: user.value?.auth0?.email || 'Auth0',
    to: '/auth/auth0',
    disabled: Boolean(user.value?.auth0),
    icon: 'i-simple-icons-auth0',
  },
  {
    label: user.value?.discord?.username || 'Discord',
    to: '/auth/discord',
    disabled: Boolean(user.value?.discord),
    icon: 'i-simple-icons-discord',
  },
  {
    label: user.value?.battledotnet?.battletag || 'Battle.net',
    to: '/auth/battledotnet',
    disabled: Boolean(user.value?.battledotnet),
    icon: 'i-simple-icons-battledotnet',
  },
  {
    label: user.value?.microsoft?.displayName || 'Microsoft',
    to: '/auth/microsoft',
    disabled: Boolean(user.value?.microsoft),
    icon: 'i-simple-icons-microsoft',
  },
  {
    label: user.value?.keycloak?.preferred_username || 'Keycloak',
    to: '/auth/keycloak',
    disabled: Boolean(user.value?.keycloak),
    icon: 'i-simple-icons-redhat'
  },
  {
    label: user.value?.linkedin?.email || 'LinkedIn',
    to: '/auth/linkedin',
    disabled: Boolean(user.value?.linkedin),
    icon: 'i-simple-icons-linkedin',
  },
  {
    label: user.value?.cognito?.email || 'Cognito',
    to: '/auth/cognito',
    disabled: Boolean(user.value?.cognito),
    icon: 'i-simple-icons-amazonaws',
  }
].map(p => ({
  ...p,
  prefetch: false,
  external: true,
})))
</script>

<template>
  <UHeader>
    <template #logo>
      Nuxt Auth Utils
    </template>
    <template #right>
      <UDropdown :items="[providers]">
        <UButton
          icon="i-heroicons-chevron-down"
          trailing
          color="gray"
          size="xs"
        >
          Login with
        </UButton>
      </UDropdown>
      <UButton
        v-if="loggedIn"
        color="gray"
        size="xs"
        @click="clear"
      >
        Logout
      </UButton>
    </template>
  </UHeader>
  <UMain>
    <UContainer>
      <NuxtPage />
    </UContainer>
  </UMain>
</template>
