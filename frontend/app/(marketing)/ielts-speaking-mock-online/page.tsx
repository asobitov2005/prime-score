import {
  buildSeoRouteMetadata,
  SEO_PAGE_REVALIDATE_SECONDS,
  SeoPageRoute,
} from "@/components/marketing/seo-page-route";

export const revalidate = SEO_PAGE_REVALIDATE_SECONDS;

export const metadata = buildSeoRouteMetadata("ielts-speaking-mock-online");

export default function Page() {
  return <SeoPageRoute slug="ielts-speaking-mock-online" />;
}
