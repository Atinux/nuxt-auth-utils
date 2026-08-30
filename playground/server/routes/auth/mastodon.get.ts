export default defineOAuthMastodonEventHandler({
  async onSuccess(event, { user }) {
    await setUserSession(event, {
      user: {
        mastodon: user.acct,
      },
      loggedInAt: Date.now(),
    })

    return sendRedirect(event, '/')
  },
})
