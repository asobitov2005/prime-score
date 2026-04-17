import Link from "next/link";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Notice, Select, SectionHeader, buttonClassName, formatDate } from "@/components/ui";
import { getAdminTests } from "@/lib/server-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function badgeToneForStatus(status: string): "neutral" | "success" | "warning" | "paused" {
  if (status === "published") {
    return "success";
  }
  if (status === "draft") {
    return "warning";
  }
  return "paused";
}

interface TestsPageProps {
  searchParams: {
    type?: "reading" | "listening";
  };
}

export default async function TestsPage({ searchParams }: TestsPageProps) {
  const currentType = searchParams.type;
  const testRows = await getAdminTests();
  
  const filteredRows = currentType 
    ? testRows.filter(r => r.type === currentType) 
    : testRows;

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Content Management"
        title={currentType ? `${currentType.charAt(0).toUpperCase() + currentType.slice(1)} Tests` : "Global Inventory"}
        description={`Directly manage your ${currentType || 'reading and listening'} materials.`}
        actions={
          <>
            <Link href={`/tests/new?type=${currentType || 'reading'}`} className={buttonClassName({ variant: "solid", size: "sm" })}>
              New {currentType || 'Test'}
            </Link>
          </>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Inventory Filters</CardTitle>
          <CardDescription>Narrow down tests by format, access, and status.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4 items-end">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Format</label>
            <Select defaultValue="all">
              <option value="all">All formats</option>
              <option value="full">Full Test</option>
              <option value="passage_1">Passage 1</option>
              <option value="passage_2">Passage 2</option>
              <option value="passage_3">Passage 3</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Access Tier</label>
            <Select defaultValue="all">
              <option value="all">All access</option>
              <option value="public">Public</option>
              <option value="premium">Premium</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Status</label>
            <Select defaultValue="all">
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Search</label>
            <Input placeholder="Filter by title..." />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Catalog</CardTitle>
              <CardDescription>Direct entries from the database.</CardDescription>
            </div>
            <Badge tone="neutral">{filteredRows.length} entries</Badge>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.24em] text-muted-foreground">
                <th className="border-b border-border px-3 py-3 font-medium">Title</th>
                <th className="border-b border-border px-3 py-3 font-medium">Format</th>
                <th className="border-b border-border px-3 py-3 font-medium">Access</th>
                <th className="border-b border-border px-3 py-3 font-medium">Status</th>
                <th className="border-b border-border px-3 py-3 font-medium">Updated</th>
                <th className="border-b border-border px-3 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td className="px-3 py-10 text-center text-sm text-muted-foreground" colSpan={6}>
                    No tests found.
                  </td>
                </tr>
              ) : null}
              {filteredRows.map((row) => (
                <tr key={row.id} className="align-top">
                  <td className="border-b border-border px-3 py-4">
                    <div className="font-medium text-foreground">{row.title}</div>
                    <div className="mt-1 text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
                      {row.type} · {row.questions} Qs
                    </div>
                  </td>
                  <td className="border-b border-border px-3 py-4">
                    <Badge tone="info" className="text-[10px] uppercase font-black tracking-widest">{row.format === "full" ? "FULL" : row.format.replace("_", " ")}</Badge>
                  </td>
                  <td className="border-b border-border px-3 py-4">
                    <Badge tone={row.accessType === "public" ? "success" : "paused"} className="text-[10px] uppercase font-black tracking-widest">{row.accessType}</Badge>
                  </td>
                  <td className="border-b border-border px-3 py-4">
                    <Badge tone={badgeToneForStatus(row.status)} className="text-[10px] uppercase font-black tracking-widest">{row.status}</Badge>
                  </td>
                  <td className="border-b border-border px-3 py-4 text-[11px] font-bold text-muted-foreground uppercase">{formatDate(row.updatedAt)}</td>
                  <td className="border-b border-border px-3 py-4">
                    <div className="flex justify-end gap-2">
                      <Link href={`/tests/${row.id}/edit`} className={buttonClassName({ variant: "outline", size: "sm" })}>
                        Edit
                      </Link>
                      <a 
                        href={`http://localhost:3100/tests/${row.id}`} 
                        target="_blank" 
                        rel="noreferrer" 
                        className={buttonClassName({ variant: "ghost", size: "sm" })}
                      >
                        Preview
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
