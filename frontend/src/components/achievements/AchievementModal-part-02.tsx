"use client";

import { BadgeCheck, Image, Link, Lock, Sparkles, Trophy, X, cn, useEffect } from "./AchievementModal-dependencies";
import { AchievementModalProps, continueHref, formatDate, formatNumber, isBronzeLearnerBadge, progressLabel, progressPercent, rarityMeta, requirementItems } from "./AchievementModal-part-01";

export function AchievementModal({ achievement, open, onClose, isEquipped, onEquip }: AchievementModalProps) {
  const meta = rarityMeta[achievement.rarity];
  const progress = progressPercent(achievement);
  const progressText = progressLabel(achievement);
  const isUnlocked = achievement.status === "unlocked";
  const isInProgress = achievement.status === "in_progress";

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4">
      {/* Backdrop */}
      <button 
        type="button" 
        className="absolute inset-0 w-full h-full bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300 cursor-default" 
        onClick={onClose} 
        aria-label="Close modal"
      />

      {/* Modal Container: Max height constrained for smaller screens */}
      <div className="relative z-10 flex w-full max-h-[85vh] flex-col overflow-hidden rounded-t-[2rem] bg-card text-foreground shadow-2xl animate-in slide-in-from-bottom-full duration-500 ease-out sm:max-w-[420px] sm:rounded-[2rem] sm:slide-in-from-bottom-0 sm:zoom-in-95 ring-1 ring-slate-900/5 dark:bg-slate-950 dark:ring-white/10">
        
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-muted/70 text-muted-foreground backdrop-blur-md transition-all hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 sm:right-4 sm:top-4"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          
          {/* Top Header with Image - Compact Design */}
          <div className="relative flex flex-col items-center justify-center px-5 pb-4 pt-10">
            {/* Ambient Gradient Background */}
            <div className={cn("absolute inset-x-0 top-0 h-48 bg-gradient-to-b opacity-80", meta.ambientGlow)} />
            
            {/* Image Container with Glow */}
            <div className="relative flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center">
              <div className={cn("absolute inset-2 rounded-full blur-[24px]", meta.imageGlow)} />
              <Image
                src={achievement.image}
                alt={achievement.title}
                width={128}
                height={128}
                draggable={false}
                onDragStart={(event) => event.preventDefault()}
                onContextMenu={(event) => event.preventDefault()}
                className={cn(
                  "relative z-10 h-20 w-auto select-none object-contain drop-shadow-2xl transition-transform duration-700 hover:scale-105 sm:h-24",
                  isBronzeLearnerBadge(achievement) && "h-[5.5rem] max-w-none scale-[1.18] hover:scale-[1.24] sm:h-[6.5rem]",
                )}
                priority
              />
            </div>

            {/* Title & Description */}
            <div className="relative z-10 mt-5 flex flex-col items-center text-center">
              <div className={cn("mb-2.5 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest shadow-sm", meta.badgeBg, meta.badgeText, meta.badgeBorder)}>
                {(achievement.rarity === "mythic" || achievement.rarity === "legendary") && <Sparkles className="h-3 w-3" />}
                {meta.label}
              </div>
              <h2 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">{achievement.title}</h2>
              <p className="mt-1.5 max-w-[280px] text-[13px] font-medium leading-relaxed text-muted-foreground">
                {achievement.description}
              </p>
            </div>
          </div>

          {/* Details Section */}
          <div className="space-y-3 px-5 pb-5">
            {/* Status & Progress Card */}
            <div className="rounded-2xl border border-border/60 bg-muted/40 p-3.5 shadow-sm sm:p-4 dark:bg-white/[0.03]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</span>
                <div className="flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
                  {isUnlocked ? (
                    <>
                      <BadgeCheck className="h-4 w-4 text-emerald-500" />
                      <span className="text-emerald-600">Unlocked</span>
                    </>
                  ) : isInProgress ? (
                    <>
                      <Sparkles className="h-4 w-4 text-blue-500" />
                      <span className="text-blue-600 dark:text-blue-400">In progress</span>
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Locked</span>
                    </>
                  )}
                </div>
              </div>
              
              {isUnlocked && achievement.unlockedAt && (
                 <div className="mt-1 text-right text-[11px] font-medium text-muted-foreground">
                    Earned {formatDate(achievement.unlockedAt)}
                 </div>
              )}

              {!isUnlocked && progressText ? (
                <div className="mt-3 border-t border-border/50 pt-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Progress</span>
                    <span className="text-[13px] font-bold text-foreground">{progressText}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted shadow-inner">
                    <div 
                      className={cn(
                        "h-full rounded-full bg-gradient-to-r transition-all duration-1000 ease-out",
                        achievement.rarity === "mythic" ? "from-violet-500 to-fuchsia-400" :
                        achievement.rarity === "legendary" ? "from-amber-500 to-orange-400" :
                        "from-blue-500 to-cyan-400"
                      )}
                      style={{ width: `${progress || 1}%` }} 
                    />
                  </div>
                </div>
              ) : null}
            </div>

            {/* Requirements & Reward Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col justify-center rounded-2xl border border-border/60 bg-muted/40 p-3.5 shadow-sm sm:p-4 dark:bg-white/[0.03]">
                 <span className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Requirement</span>
                 <div className="space-y-1">
                   {requirementItems(achievement).map((item, i) => (
                     <p key={i} className="line-clamp-2 text-[13px] font-semibold leading-snug text-foreground">
                       {item}
                     </p>
                   ))}
                 </div>
              </div>
              <div className="flex flex-col justify-center rounded-2xl border border-border/60 bg-muted/40 p-3.5 shadow-sm sm:p-4 dark:bg-white/[0.03]">
                 <span className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Reward</span>
                 <div className="flex items-center gap-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-amber-600 shadow-sm dark:bg-amber-500/15 dark:text-amber-300">
                      <Trophy className="h-3 w-3" />
                    </span>
                    <span className="text-[13px] font-bold text-foreground">+{formatNumber(achievement.xpReward ?? 0)} XP</span>
                 </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Footer for Action Button */}
        <div className="shrink-0 border-t border-border/60 bg-card/90 p-4 backdrop-blur-md sm:px-5 sm:py-4 dark:bg-slate-950/90">
          {isUnlocked ? (
            <button
              type="button"
              onClick={() => onEquip(achievement)}
              disabled={isEquipped}
              className={cn(
                "flex w-full h-11 items-center justify-center rounded-xl text-[14px] font-bold shadow-md transition-all active:scale-[0.98]",
                isEquipped 
                  ? "cursor-default bg-emerald-50 text-emerald-600 border border-emerald-200/60 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-400/25" 
                  : meta.buttonClass
              )}
            >
              {isEquipped ? "Badge Equipped ✓" : "Equip Badge"}
            </button>
          ) : (
            <Link 
              href={continueHref(achievement)} 
              onClick={onClose} 
              className="flex w-full h-11 items-center justify-center rounded-xl bg-slate-900 text-[14px] font-bold text-white shadow-md transition-all hover:bg-slate-800 active:scale-[0.98] dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
            >
              Continue Progress
            </Link>
          )}
        </div>

      </div>
    </div>
  );
}
