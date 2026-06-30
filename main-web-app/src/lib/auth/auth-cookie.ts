export type RuntimeEnvironment = "development" | "test" | "production";

export function getAuthCookiePolicy(environment: RuntimeEnvironment) {
  const secure = environment === "production";
  return {
    accessName: secure ? "__Host-knogest-access" : "knogest-access",
    refreshName: secure ? "__Host-knogest-refresh" : "knogest-refresh",
    options: {
      httpOnly: true as const,
      sameSite: "lax" as const,
      path: "/",
      secure,
    },
  };
}
