const NEW_TEST_BADGE_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function isNewTestCreatedAt(createdAt: string | null | undefined, now = Date.now()) {
  if (!createdAt) {
    return false;
  }

  const createdTime = new Date(createdAt).getTime();
  if (Number.isNaN(createdTime) || createdTime > now) {
    return false;
  }

  return now - createdTime < NEW_TEST_BADGE_DAYS * MS_PER_DAY;
}
