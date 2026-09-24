"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowUpRight, Check, Layers3, Plus, RefreshCw } from "lucide-react";

import { MockSectionNav } from "@/components/mock-section-nav";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Select, Textarea, cn } from "@/components/ui";
import {
  MOCK_COMPONENTS,
  getMockComponentOptions,
  loadOnlineMockCatalog,
  onlineMockApi,
  validateOnlineMock,
  type MockComponentKey,
  type OnlineFullMock,
  type OnlineFullMockInput,
  type OnlineMockCatalog,
} from "@/lib/online-mock-api";

type MockForm = Omit<OnlineFullMockInput, "description"> & { description: string };

function emptyForm(): MockForm {
  return {
    title: "", description: "", reading_test_id: "", listening_test_id: "",
    writing_task_1_id: "", writing_task_2_id: "", is_published: false, academic_confirmed: false,
  };
}

function mockForm(mock: OnlineFullMock): MockForm {
  return {
    title: mock.title, description: mock.description ?? "", reading_test_id: mock.reading_test_id,
    listening_test_id: mock.listening_test_id, writing_task_1_id: mock.writing_task_1_id,
    writing_task_2_id: mock.writing_task_2_id, is_published: mock.is_published, academic_confirmed: mock.academic_confirmed,
  };
}

export function OnlineFullMockManager() {
  const [mocks, setMocks] = useState<OnlineFullMock[]>([]);
  const [catalog, setCatalog] = useState<OnlineMockCatalog | null>(null);
  const [form, setForm] = useState<MockForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);
  const [search, setSearch] = useState("");
  const [componentSearch, setComponentSearch] = useState<Partial<Record<MockComponentKey, string>>>({});

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    Promise.all([onlineMockApi.list(), loadOnlineMockCatalog()])
      .then(([items, nextCatalog]) => {
        if (!active) return;
        setMocks(items);
        setCatalog(nextCatalog);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setCatalog(null);
        setError(reason instanceof Error ? reason.message : "Full Mocks could not load. Try again.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [revision]);

  const savedMock = mocks.find((mock) => mock.id === editingId);
  const dirty = JSON.stringify(form) !== JSON.stringify(savedMock ? mockForm(savedMock) : emptyForm());
  const visibleMocks = mocks.filter((mock) => mock.title.toLowerCase().includes(search.trim().toLowerCase()));
  const readyCount = catalog ? MOCK_COMPONENTS.filter(({ key }) => getMockComponentOptions(catalog, key).some((item) => item.id === form[key])).length : 0;

  function openEditor(mock?: OnlineFullMock) {
    if (dirty && !window.confirm("Discard your unsaved Full Mock changes?")) return;
    setEditingId(mock?.id ?? null);
    setForm(mock ? mockForm(mock) : emptyForm());
    setComponentSearch({});
    setError("");
    setNotice("");
  }

  async function save(published: boolean, event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (saving || loading || !catalog) return;
    const input = { ...form, title: form.title.trim(), description: form.description.trim() || null, is_published: published };
    const validationError = validateOnlineMock(input, catalog);
    if (validationError) { setError(validationError); return; }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const saved = editingId ? await onlineMockApi.update(editingId, input) : await onlineMockApi.create(input);
      setMocks((current) => [saved, ...current.filter((mock) => mock.id !== saved.id)]);
      setEditingId(saved.id);
      setForm(mockForm(saved));
      setNotice(saved.is_published ? "Full Mock published. All four components are linked." : "Full Mock saved as a draft. It is not visible to students.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Full Mock could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function unpublish() {
    if (!savedMock || saving || loading) return;
    if (dirty) { setError("Save or discard your changes before unpublishing this Full Mock."); return; }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const saved = await onlineMockApi.update(savedMock.id, { is_published: false });
      setMocks((current) => current.map((mock) => mock.id === saved.id ? saved : mock));
      setForm(mockForm(saved));
      setNotice("Full Mock unpublished. Its component records are unchanged.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Full Mock could not be unpublished.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-12">
      <MockSectionNav current="online" />
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Mock / Online</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Online Full Mocks</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">Build one complete Academic mock from real Reading, Listening, and Writing content. Individual tests are components, not separate Full Mocks.</p>
          <div className="flex flex-wrap gap-2 pt-1"><Badge tone="info">Academic</Badge><Badge>Writing Task 1 + Task 2</Badge><Badge>No Speaking online</Badge></div>
        </div>
        <Button type="button" variant="outline" size="sm" disabled={loading || saving} onClick={() => setRevision((current) => current + 1)}>
          <RefreshCw size={15} aria-hidden="true" />Refresh content
        </Button>
      </header>

      {error ? <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</div> : null}
      {notice ? <p role="status" className="rounded-lg border border-success/30 bg-success/5 p-4 text-sm text-foreground">{notice}</p> : null}
      {loading ? <p role="status" className="py-12 text-center text-sm text-muted-foreground">Loading Full Mocks and published content...</p> : null}

      {!loading && catalog ? (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(260px,0.7fr)_minmax(0,1.3fr)]">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2"><CardTitle>Full Mock library</CardTitle><Badge>{mocks.length}</Badge></div>
              <CardDescription>Each bundle contains all four required components.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button type="button" className="w-full" onClick={() => openEditor()} disabled={saving}><Plus size={16} aria-hidden="true" />New Full Mock</Button>
              <div className="space-y-2"><Label htmlFor="mock-search">Find a Full Mock</Label><Input id="mock-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by title" /></div>
              {mocks.length === 0 ? <div className="rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground"><Layers3 className="mb-3 h-6 w-6 text-primary" aria-hidden="true" />No Full Mocks yet. Select four published components and save your first bundle.</div> : null}
              {mocks.length > 0 && visibleMocks.length === 0 ? <p className="py-4 text-sm text-muted-foreground">No bundles match this title.</p> : null}
              <div className="space-y-2">
                {visibleMocks.map((mock) => (
                  <button
                    type="button" key={mock.id} disabled={saving} onClick={() => openEditor(mock)} aria-pressed={editingId === mock.id}
                    className={cn("w-full space-y-3 rounded-lg border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60", editingId === mock.id ? "border-primary bg-primary/5" : "border-border bg-background hover:bg-muted")}
                  >
                    <span className="block break-words text-sm font-semibold text-foreground">{mock.title}</span>
                    <span className="flex flex-wrap items-center gap-2"><Badge tone={mock.is_published ? "success" : "neutral"}>{mock.is_published ? "Published" : "Draft"}</Badge><span className="text-xs text-muted-foreground">Reading + Listening + Writing</span></span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2"><CardTitle>{editingId ? "Edit Full Mock" : "Create Full Mock"}</CardTitle><Badge tone={readyCount === 4 ? "success" : "neutral"}>{readyCount}/4 components selected</Badge></div>
              <CardDescription>A bundle links existing content. Editing it does not change the source tests or writing tasks.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={(event) => void save(form.is_published, event)} className="space-y-5">
                <fieldset disabled={saving} className="min-w-0 space-y-5">
                  <div className="space-y-2"><Label htmlFor="full-mock-title">Full Mock title</Label><Input id="full-mock-title" required maxLength={160} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Title students will see" /></div>
                  <div className="space-y-2"><Label htmlFor="full-mock-description">Description (optional)</Label><Textarea id="full-mock-description" rows={3} maxLength={10000} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Describe this Academic Full Mock" /></div>
                  <div className="space-y-3">
                    {MOCK_COMPONENTS.map((component, index) => {
                      const options = getMockComponentOptions(catalog, component.key);
                      const query = (componentSearch[component.key] ?? "").trim().toLowerCase();
                      const filtered = options.filter((item) => item.id === form[component.key] || item.title.toLowerCase().includes(query) || item.id.toLowerCase().includes(query));
                      const selection = options.find((item) => item.id === form[component.key]);
                      return (
                        <div key={component.key} className="rounded-lg border border-border bg-background p-4">
                          <div className="mb-3 flex items-start gap-3">
                            <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold", selection ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>{selection ? <Check size={14} aria-hidden="true" /> : index + 1}</span>
                            <div className="min-w-0 flex-1"><Label htmlFor={component.key}>{component.title}</Label><p className="mt-1 text-xs text-muted-foreground">{component.description}</p></div>
                            <Link href={component.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline" aria-label={`Open ${component.title} library in a new tab`}>Library<ArrowUpRight size={13} aria-hidden="true" /></Link>
                          </div>
                          {options.length > 10 ? <Input type="search" className="mb-2" aria-label={`Find ${component.title} content`} placeholder="Filter by title or ID" value={componentSearch[component.key] ?? ""} onChange={(event) => setComponentSearch({ ...componentSearch, [component.key]: event.target.value })} /> : null}
                          <Select id={component.key} required value={form[component.key]} onChange={(event) => setForm({ ...form, [component.key]: event.target.value, academic_confirmed: false })}>
                            <option value="">Select {component.title}</option>
                            {form[component.key] && !selection ? <option value={form[component.key]} disabled>Unavailable selection ({form[component.key]})</option> : null}
                            {filtered.map((item) => <option key={item.id} value={item.id}>{item.title} ({item.id.slice(0, 8)})</option>)}
                          </Select>
                          {options.length === 0 ? <p className="mt-2 text-xs text-warning">No eligible published content. Add or publish it in the library, then refresh.</p> : null}
                          {form[component.key] && !selection ? <p className="mt-2 text-xs text-destructive">This component is no longer available. Select a published replacement before saving.</p> : null}
                        </div>
                      );
                    })}
                  </div>
                  <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-4">
                    <label className="flex items-start gap-3 text-sm font-medium text-foreground">
                      <input type="checkbox" className="mt-1" checked={form.academic_confirmed} onChange={(event) => setForm({ ...form, academic_confirmed: event.target.checked })} />
                      I have verified that all four selected components are IELTS Academic content.
                    </label>
                    <p className="text-xs text-muted-foreground">Required before publishing. Selecting different content clears this confirmation. Content titles are not used to determine the exam category.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 border-t border-border pt-5">
                    <Button type="submit" variant={form.is_published ? "solid" : "outline"}>{saving ? "Saving..." : editingId ? "Save changes" : "Save draft"}</Button>
                    {!form.is_published ? <Button type="button" onClick={() => void save(true)} disabled={readyCount !== 4 || !form.title.trim() || !form.academic_confirmed}>Publish Full Mock</Button> : <Button type="button" variant="outline" onClick={() => void unpublish()}>Unpublish</Button>}
                    {dirty ? <span className="text-xs text-muted-foreground">Unsaved changes</span> : null}
                  </div>
                </fieldset>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
