const API_BASE = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:4000';

export async function createContractViaApi(tenantSlug: string, signToken: string) {
  return {
    tenantSlug,
    signToken,
    signUrl: `/contract/${signToken}/sign`
  };
}

export async function getSignToken(contractId: string) {
  const res = await fetch(`${API_BASE}/contracts/${contractId}/sign-token`);
  if (!res.ok) throw new Error(`Failed to get sign token: ${res.status}`);
  return (await res.json()).token as string;
}
