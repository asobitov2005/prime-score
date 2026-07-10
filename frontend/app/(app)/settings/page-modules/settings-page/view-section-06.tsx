"use client";
import type { SettingsPageScope } from "./controller";
import { Button, Camera, Card, CardContent, CardHeader, CardTitle, Check, ImageOff, Input, Loader2, Pencil, ShieldCheck, User, X } from "../dependencies";

export function SettingsPageSection6({ scope }: { scope: SettingsPageScope }) {
  const { avatarUrl, name, avatarInputRef, handleAvatarSelect, isSavingAvatar, handleRemoveAvatar, isEditing, setIsEditing, editName, setEditName, isSavingProfile, handleSave, handleCancel, phoneNumber } = scope;
  return (
    <Card className="border-border/60 bg-card/40 shadow-sm rounded-xl overflow-hidden">
                <CardHeader className="p-4 border-b border-border/40 bg-muted/5">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <User className="h-4 w-4 text-primary" /> {"Profile Information"}
                    </CardTitle>
                    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/15 bg-emerald-500/5 px-3 py-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-600">{"Telegram Connected"}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="grid gap-4 md:grid-cols-[auto_minmax(0,1fr)_minmax(0,0.8fr)]">
                    <div className="flex items-center gap-3 md:block md:space-y-2">
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary/10 text-2xl font-black text-primary ring-1 ring-primary/10">
                        {avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={avatarUrl} alt={name} draggable={false} className="h-full w-full object-cover" />
                        ) : (
                          (name || "U").charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 md:justify-center">
                        <input
                          ref={avatarInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(event) => {
                            void handleAvatarSelect(event.target.files?.[0] ?? null);
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5 text-xs font-bold"
                          disabled={isSavingAvatar}
                          onClick={() => avatarInputRef.current?.click()}
                        >
                          {isSavingAvatar ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                          {"Change"}
                        </Button>
                        {avatarUrl ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1.5 text-xs font-bold text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                            disabled={isSavingAvatar}
                            onClick={() => {
                              void handleRemoveAvatar();
                            }}
                          >
                            <ImageOff className="h-3.5 w-3.5" />
                            {"Remove"}
                          </Button>
                        ) : null}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{"Full Name"}</p>
                        {!isEditing && (
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={() => setIsEditing(true)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
    
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="h-8 text-sm font-bold"
                            autoFocus
                            disabled={isSavingProfile}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-emerald-500 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-300"
                            onClick={() => {
                              void handleSave();
                            }}
                            disabled={isSavingProfile}
                          >
                            {isSavingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                            onClick={handleCancel}
                            disabled={isSavingProfile}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <p className="font-bold text-foreground">{name}</p>
                      )}
                    </div>
    
                    <div className="space-y-1 md:border-l md:border-border/40 md:pl-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{"Phone Number"}</p>
                      <p className="font-bold text-foreground">{phoneNumber || "No number attached"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
  );
}
