"use client";

import { Award, BookOpen, Clock, Crown, Flame, Image, Target, Trophy, X, useEffect } from "./user-profile-modal-dependencies";
import { LeaderboardUserProfileModalProps } from "./user-profile-modal-component-03";
import { rarityConfig } from "./user-profile-modal-component-04";
import { ProfileModalLoadingSkeleton } from "./user-profile-modal-component-05";
import { StatCard } from "./user-profile-modal-component-07";

export function LeaderboardUserProfileModal({
  isOpen,
  onClose,
  user,
  isLoading = false,
}: LeaderboardUserProfileModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!user && !isLoading) return null;

  const getInitials = (name: string) => name.substring(0, 2).toUpperCase();
  const activeBadgeStyle = user ? rarityConfig[user.equippedBadge.rarity] || rarityConfig.Common : rarityConfig.Common;

  return (
    <>
      {isOpen ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center overflow-hidden p-0 sm:items-center sm:p-4">
          {/* Backdrop */}
          <button
            type="button"
            onClick={onClose}
            className="absolute inset-0 h-full w-full cursor-default bg-slate-900/40 dark:bg-slate-950/80"
            aria-label="Close profile modal"
          />

          <div
            className={`relative z-10 flex max-h-[calc(100dvh-1rem)] min-h-0 w-full flex-col overflow-hidden bg-white dark:bg-slate-900/95 border ${user?.isPremium ? 'border-amber-400/50 dark:border-amber-500/40 shadow-[0_8px_32px_rgba(245,158,11,0.18)]' : 'border-slate-200 dark:border-white/10 shadow-xl'} rounded-t-[28px] sm:max-w-lg sm:rounded-[28px]`}
          >
            {/* Top decorative glow for premium users */}
            {user?.isPremium && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-300 via-orange-500 to-amber-300" />
            )}

            {/* Asosiy Scrollable Container */}
            <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain p-6 pb-10 touch-pan-y md:p-8 [scrollbar-width:thin] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-white/10">
              
              {/* Header Info Row (Online & Close) */}
              <div className="flex justify-between items-start mb-4">
                {isLoading ? (
                  <div className="h-7 w-20 rounded-full bg-slate-100 dark:bg-white/10 animate-pulse" />
                ) : (
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                    <div className={`w-2 h-2 rounded-full ${user?.isOnline ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] dark:shadow-[0_0_8px_rgba(52,211,153,0.8)]" : "bg-slate-400 dark:bg-slate-500"}`} />
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                      {user?.isOnline ? "Online" : "Offline"}
                    </span>
                  </div>
                )}
                
                <button
                  onClick={onClose}
                  className="p-2 rounded-full bg-slate-50 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {isLoading ? (
                <ProfileModalLoadingSkeleton />
              ) : user ? (
                <>

              {/* TOP PROFILE SECTION */}
              <div className="flex flex-col items-center text-center">
                {/* Avatar */}
                <div className="relative mb-5 mt-2">
                  {user.isPremium && (
                    <div className="absolute -inset-2 rounded-full bg-gradient-to-br from-amber-400/20 to-orange-500/20"></div>
                  )}
                  <div className={`relative w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-[3px] ${user.isPremium ? 'border-amber-400' : 'border-slate-200 dark:border-slate-700'} bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-3xl font-bold text-slate-900 dark:text-white shadow-lg`}>
                    {user.avatarUrl ? (
                      <Image src={user.avatarUrl} alt={user.username} fill className="object-cover" />
                    ) : (
                      getInitials(user.username)
                    )}
                  </div>
                  {/* Level Badge */}
                  <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-black px-3 py-1 rounded-full border-2 border-white dark:border-slate-900 shadow-md whitespace-nowrap">
                    LVL {user.level}
                  </div>
                </div>

                {/* Name and PRO tag */}
                <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-white tracking-tight flex items-center justify-center gap-2 mb-3 mt-1">
                  {user.username}
                  {user.isPremium && (
                    <span className="flex items-center gap-1 bg-gradient-to-r from-amber-300 via-yellow-400 to-orange-500 text-yellow-950 text-[10px] uppercase font-black tracking-widest px-2 py-0.5 rounded-full shadow-sm ml-1 transform -translate-y-0.5">
                      <Crown className="w-3 h-3 fill-yellow-950" /> PRO
                    </span>
                  )}
                </h2>
                
                {/* Rank & XP */}
                <div className="flex items-center justify-center gap-3 text-sm font-medium">
                  <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-400/10 px-3 py-1.5 rounded-full border border-amber-200 dark:border-amber-400/20">
                    <Trophy className="w-4 h-4" />
                    <span>#{user.rank} All-time</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-400/10 px-3 py-1.5 rounded-full border border-indigo-200 dark:border-indigo-400/20">
                    <Award className="w-4 h-4" />
                    <span>{user.totalXp.toLocaleString()} XP</span>
                  </div>
                </div>

                {/* USER TITLES (Chips) */}
                {user.activeTitles && user.activeTitles.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-2 mt-4">
                    {user.activeTitles.map((title, idx) => (
                      <div key={idx} className="px-3 py-1 rounded-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-colors cursor-default">
                        {title}
                      </div>
                    ))}
                  </div>
                )}
                </div>

                {/* EQUIPPED BADGE - Minimalist */}
                <div className="mt-6 mb-2">
                <div className="flex items-center gap-4 sm:gap-5 px-2">
                  {/* Icon (No Box, Native Shape) */}
                  <div className="relative shrink-0 flex items-center justify-center">
                    {/* Subtle glow behind the hex badge itself */}
                    <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${activeBadgeStyle.color} opacity-15`}></div>

                    {user.equippedBadge.image ? (
                      <Image src={user.equippedBadge.image} alt={user.equippedBadge.title} width={64} height={64} className="relative z-10 object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.15)] sm:w-[72px] sm:h-[72px]" />
                    ) : (
                      <div className="relative z-10 text-slate-400">
                        {user.equippedBadge.icon || <Award className="w-12 h-12 sm:w-16 sm:h-16 drop-shadow-md" />}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white truncate">
                        {user.equippedBadge.title}
                      </h3>
                      <span className={`shrink-0 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md ${activeBadgeStyle.pillBg} ${activeBadgeStyle.text} border`}>
                        {user.equippedBadge.rarity}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 italic">
                      "{user.equippedBadge.tagline}"
                    </p>
                  </div>
                </div>
                </div>

                {/* STATS GRID */}
              <div className="mt-8">
                <h4 className="text-[11px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-bold mb-3 px-1">Progression</h4>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <StatCard icon={<Flame className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />} label="Streak" value={`${user.stats.longestStreak}`} />
                  <StatCard icon={<Target className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 dark:text-blue-400" />} label="Highest" value={user.stats.highestBand.toString()} />
                  <StatCard icon={<BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500 dark:text-indigo-400" />} label="Mocks" value={user.stats.totalMockTests.toString()} />
                  <StatCard icon={<Clock className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 dark:text-emerald-400" />} label="Hours" value={`${user.stats.totalStudyHours}h`} />
                  <StatCard icon={<Target className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500 dark:text-purple-400" />} label="Accuracy" value={`${user.stats.accuracy}%`} />
                  <StatCard icon={<Award className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 dark:text-amber-400" />} label="Unlocks" value={user.stats.achievementsUnlocked.toString()} />
                </div>
              </div>

              {/* ACHIEVEMENTS LIBRARY */}
              {user.achievements && user.achievements.length > 0 ? (
                <div className="mt-8">
                  <div className="flex justify-between items-center mb-3 px-1">
                    <h4 className="text-[11px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-bold">Unlocked Achievements ({user.achievements.length})</h4>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                    {user.achievements.map((ach) => {
                      const achStyle = rarityConfig[ach.rarity] || rarityConfig.Common;
                      return (
                        <div key={ach.id} className="group relative flex flex-col items-center gap-2 cursor-default">
                          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 transition-colors duration-150 group-hover:border-slate-400 dark:border-slate-700 dark:bg-slate-800 sm:h-16 sm:w-16">
                            <div className={`absolute inset-0 bg-gradient-to-br ${achStyle.color} opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-300`}></div>
                            {ach.image ? (
                              <Image src={ach.image} alt={ach.title} width={32} height={32} className="object-contain" />
                            ) : (
                              ach.icon || <Award className={`w-7 h-7 sm:w-8 sm:h-8 ${achStyle.text}`} />
                            )}
                          </div>
                          <span className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 font-medium w-full text-center truncate px-1 group-hover:text-slate-900 dark:group-hover:text-slate-300 transition-colors">
                            {ach.title}
                          </span>
                          <span className="text-[8px] font-bold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400">
                            Unlocked
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="mt-8 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-center dark:border-slate-800 dark:bg-slate-900/60">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Unlocked Achievements</p>
                  <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-300">No badges unlocked yet.</p>
                </div>
              )}

              </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
