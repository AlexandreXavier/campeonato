const authConfig = {
  providers: [
    {
      domain:
        process.env.CLERK_JWT_ISSUER_DOMAIN ??
        "https://example.accounts.dev",
      applicationID: "convex",
    },
  ],
};

export default authConfig;
