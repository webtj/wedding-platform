// Server-side shim for @clerk/nextjs/server auth()
// Returns a stub — real auth is handled by AuthProvider client-side.

export async function auth() {
  // In a real server context, we'd verify JWT from cookies.
  // For now, AuthProvider handles auth client-side, so this is a no-op stub.
  return { userId: null };
}
