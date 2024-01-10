export default oauth.keycloakEventHandler({
  async onSuccess(event, { user }) {
    await setUserSession(event, {
      user: {
        keycloak: user,
      },
      loggedInAt: Date.now(),
    })

    return sendRedirect(event, '/')
  },
})
