export default oauth.cognitoEventHandler({
  async onSuccess(event, { user }) {
    await setUserSession(event, {
      user: {
        cognito: user,
      },
      loggedInAt: Date.now()
    })

    return sendRedirect(event, '/')
  }
})
