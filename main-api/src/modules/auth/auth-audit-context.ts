export interface AuthAuditContext {
  operation: "session.refresh";
  reason: string;
  sessionId?: string;
  userId?: string;
  corporationId?: string;
}

const auditContexts = new WeakMap<object, AuthAuditContext>();

export function attachAuthAuditContext<T extends object>(
  error: T,
  context: AuthAuditContext,
): T {
  auditContexts.set(error, context);
  return error;
}

export function getAuthAuditContext(
  error: unknown,
): AuthAuditContext | undefined {
  return typeof error === "object" && error !== null
    ? auditContexts.get(error)
    : undefined;
}
