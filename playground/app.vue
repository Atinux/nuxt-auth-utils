<script setup lang="ts">
const { loggedIn, user, session, clear, fetch } = useUserSession()
const loginModal = ref(false)
const logging = ref(false)
const password = ref('')
const toast = useToast()

async function login() {
  if (logging.value || !password.value) return
  logging.value = true
  await $fetch('/api/login', {
    method: 'POST',
    body: {
      password: password.value,
    },
  })
    .then(() => {
      fetch()
      loginModal.value = false
    })
    .catch((err) => {
      console.log(err)
      toast.add({
        color: 'red',
        title: err.data?.message || err.message,
      })
    })
  logging.value = false
}

const providers = computed(() => [
  {
    label: session.value.user?.google || 'Google',
    to: '/auth/google',
    disabled: Boolean(user.value?.google),
    icon: 'i-simple-icons-google',
  },
  {
    label: session.value.user?.facebook || 'Facebook',
    to: '/auth/facebook',
    disabled: Boolean(user.value?.facebook),
    icon: 'i-simple-icons-facebook',
  },
  {
    label: session.value.user?.github || 'GitHub',
    to: '/auth/github',
    disabled: Boolean(user.value?.github),
    icon: 'i-simple-icons-github',
  },
  {
    label: user.value?.linkedin || 'LinkedIn',
    to: '/auth/linkedin',
    disabled: Boolean(user.value?.linkedin),
    icon: 'i-simple-icons-linkedin',
  },
  {
    label: user.value?.microsoft || 'Microsoft',
    to: '/auth/microsoft',
    disabled: Boolean(user.value?.microsoft),
    icon: 'i-simple-icons-microsoft',
  },
  {
    label: user.value?.cognito || 'Cognito',
    to: '/auth/cognito',
    disabled: Boolean(user.value?.cognito),
    icon: 'i-simple-icons-amazonaws',
  },
  {
    label: user.value?.discord || 'Discord',
    to: '/auth/discord',
    disabled: Boolean(user.value?.discord),
    icon: 'i-simple-icons-discord',
  },
  {
    label: session.value.user?.spotify || 'Spotify',
    to: '/auth/spotify',
    disabled: Boolean(user.value?.spotify),
    icon: 'i-simple-icons-spotify',
  },
  {
    label: session.value.user?.twitch || 'Twitch',
    to: '/auth/twitch',
    disabled: Boolean(user.value?.twitch),
    icon: 'i-simple-icons-twitch',
  },
  {
    label: user.value?.auth0 || 'Auth0',
    to: '/auth/auth0',
    disabled: Boolean(user.value?.auth0),
    icon: 'i-simple-icons-auth0',
  },
  {
    label: user.value?.battledotnet || 'Battle.net',
    to: '/auth/battledotnet',
    disabled: Boolean(user.value?.battledotnet),
    icon: 'i-simple-icons-battledotnet',
  },
  {
    label: user.value?.keycloak || 'Keycloak',
    to: '/auth/keycloak',
    disabled: Boolean(user.value?.keycloak),
    icon: 'i-simple-icons-redhat',
  },
  {
    label: user.value?.x || 'X',
    to: '/auth/x',
    disabled: Boolean(user.value?.x),
    icon: 'i-simple-icons-x',
  },
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
      <AuthState>
        <UButton
          v-if="!loggedIn"
          size="xs"
          color="gray"
          @click="loginModal = true"
        >
          Login
        </UButton>
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
        <template #placeholder>
          <UButton
            size="xs"
            color="gray"
            disabled
          >
            Loading...
          </UButton>
        </template>
      </AuthState>
    </template>
  </UHeader>
  <UMain>
    <UContainer>
      <NuxtPage />
    </UContainer>
  </UMain>
  <UDashboardModal
    v-model="loginModal"
    title="Login with password"
    description="Use the password: 123456"
  >
    <form @submit.prevent="login">
      <UFormGroup label="Password">
        <UInput
          v-model="password"
          name="password"
          type="password"
        />
      </UFormGroup>
      <UButton
        type="submit"
        :disabled="!password"
        color="black"
        class="mt-2"
      >
        Login
      </UButton>
    </form>
  </UDashboardModal>
  <UNotifications />
</template>
