import { getCatalogTests } from "@/lib/server-data";
import { BookmarksClient } from "./bookmarks-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function BookmarksPage() {
  const catalogTests = await getCatalogTests().catch(() => []);

  return <BookmarksClient catalogTests={catalogTests} />;
}
