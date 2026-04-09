type ClaimsCapableClient = {
  auth: {
    getClaims(): Promise<{
      data: { claims?: { sub?: unknown } } | null;
      error: unknown;
    }>;
  };
};

export async function getAuthenticatedUserId(
  client: ClaimsCapableClient
): Promise<string | null> {
  const { data, error } = await client.auth.getClaims();
  if (error || !data?.claims) return null;

  const sub = data.claims.sub;
  return typeof sub === 'string' && sub.trim() ? sub.trim() : null;
}
