"use client";
import type { ReviewsAdminPageScope } from "./controller";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, MessageSquarePlus, Select, Textarea, cn } from "../dependencies";
import { buildUserLabel } from "../shared";

export function ReviewsAdminPageSection3({ scope }: { scope: ReviewsAdminPageScope }) {
  const { setEntryMode, entryMode, handleCreate, authorName, setAuthorName, selectedUserId, setSelectedUserId, users, bandLabel, setBandLabel, text, setText, isVisible, setIsVisible, resetForm, submitting } = scope;
  return (
    <Card className="border-border/50 shadow-sm">
              <CardHeader className="border-b border-border/40 bg-muted/10">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <MessageSquarePlus className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle>Create Review</CardTitle>
                    <CardDescription>Seed curated testimonials or attach a review to an existing user.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5 pt-6">
                <div className="grid grid-cols-2 gap-2 rounded-2xl bg-muted/20 p-1.5">
                  <button
                    type="button"
                    onClick={() => setEntryMode("manual")}
                    className={cn(
                      "rounded-xl px-4 py-2.5 text-sm font-bold transition-all",
                      entryMode === "manual" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Manual author
                  </button>
                  <button
                    type="button"
                    onClick={() => setEntryMode("linked")}
                    className={cn(
                      "rounded-xl px-4 py-2.5 text-sm font-bold transition-all",
                      entryMode === "linked" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Linked user
                  </button>
                </div>
    
                <form onSubmit={handleCreate} className="space-y-4">
                  {entryMode === "manual" ? (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Author name</label>
                      <Input
                        value={authorName}
                        onChange={(event) => setAuthorName(event.target.value)}
                        placeholder="Dilnoza R."
                        required
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Linked user</label>
                      <Select value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)} required>
                        <option value="">Select a user</option>
                        {users.map((user) => (
                          <option key={user.id} value={user.id}>
                            {buildUserLabel(user)}
                          </option>
                        ))}
                      </Select>
                      <p className="text-xs text-muted-foreground">The public card still looks identical. Only admin sees where it came from.</p>
                    </div>
                  )}
    
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Band label</label>
                    <Input
                      value={bandLabel}
                      onChange={(event) => setBandLabel(event.target.value)}
                      placeholder="7.5"
                      required
                    />
                  </div>
    
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Review text</label>
                    <Textarea
                      value={text}
                      onChange={(event) => setText(event.target.value)}
                      placeholder="Write the review exactly as it should appear on the landing page."
                      className="min-h-[160px] resize-none"
                      required
                    />
                  </div>
    
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Visibility</label>
                    <Select value={isVisible} onChange={(event) => setIsVisible(event.target.value)}>
                      <option value="visible">Show on landing immediately</option>
                      <option value="hidden">Save hidden for later</option>
                    </Select>
                  </div>
    
                  <div className="flex gap-3 pt-2">
                    <Button type="button" variant="outline" className="flex-1" onClick={resetForm}>
                      Reset
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={
                        submitting
                        || !bandLabel.trim()
                        || text.trim().length < 10
                        || (entryMode === "manual" ? !authorName.trim() : !selectedUserId)
                      }
                    >
                      {submitting ? "Saving..." : "Save review"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
  );
}
