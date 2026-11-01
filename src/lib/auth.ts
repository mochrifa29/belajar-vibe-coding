/**
 * Ekstrak token dari header `Authorization: Bearer <token>`.
 * Mengembalikan `null` jika header tidak ada, formatnya bukan Bearer,
 * atau token kosong.
 */
export function extractBearerToken(
  headers: Record<string, string | undefined>
): string | null {
  const authHeader = headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7).trim();
  return token || null;
}
