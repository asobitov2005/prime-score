export function buildUserDisplayName(
  firstName?: string | null,
  lastName?: string | null,
  fallback = "Candidate",
): string {
  const parts = [firstName?.trim(), lastName?.trim()].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : fallback;
}

export function splitUserDisplayName(fullName: string): {
  firstName: string;
  lastName: string | null;
} {
  const normalized = fullName.trim().replace(/\s+/g, " ");
  if (!normalized) {
    return { firstName: "", lastName: null };
  }

  const [firstName, ...rest] = normalized.split(" ");
  return {
    firstName,
    lastName: rest.length > 0 ? rest.join(" ") : null,
  };
}
