"use client";
import type { SpeakingTopicPickerClientScope } from "./controller";
import { ArrowRight, Link, MAX_SPEAKING_TOPIC_SELECTION, Search, Shuffle, cn } from "../dependencies";
import { SortOption, TopicFilterDropdown, TopicPickerCard, getTopicVisual, partFilterOptions, sortFilterOptions, toneStyles } from "../shared";

export function SpeakingTopicPickerClientView1({ scope }: { scope: SpeakingTopicPickerClientScope }) {
  const { pageRef, mainCardRef, searchQuery, setSearchQuery, part, handlePartChange, sortBy, setSortBy, setUseRandomTopic, setSelectedTopicIds, useRandomTopic, allowsMultiSelect, selectedTopicIds, topicsScrollRef, loading, filteredTopics, cueCardTitlesByKey, toggleTopicSelection, handleContinue, selectedTopics } = scope;
  return (
    (
        <div
          ref={pageRef}
          className="speaking-night animate-in fade-in duration-500 pb-8 lg:flex lg:h-[calc(100dvh-var(--app-shell-sticky-top,4.5rem)-2.5rem)] lg:max-h-[calc(100dvh-var(--app-shell-sticky-top,4.5rem)-2.5rem)] lg:min-h-0 lg:flex-col lg:overflow-hidden lg:overscroll-none lg:pb-0"
        >
          <h1 className="shrink-0 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50 md:text-[1.85rem] lg:mb-3">
            Choose your speaking topic
          </h1>
    
          <section
            ref={mainCardRef}
            className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[18px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_-36px_rgba(15,23,42,0.45)] dark:border-slate-800 dark:bg-slate-950 dark:shadow-none sm:p-6"
          >
                <div className="shrink-0">
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                    <label className="relative block min-w-0 flex-1">
                      <span className="sr-only">Search topics</span>
                      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                      <input
                        type="search"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Search topics..."
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm font-semibold text-slate-900 shadow-[0_8px_20px_-18px_rgba(15,23,42,0.2)] outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-[#C4B5FD] focus:ring-4 focus:ring-[#6D4CFF]/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:shadow-none dark:placeholder:text-slate-500 dark:hover:border-slate-700 dark:focus:border-[#6D4CFF]/40 dark:focus:ring-[#6D4CFF]/10"
                      />
                    </label>
    
                    <div className="flex flex-wrap gap-3 sm:shrink-0">
                      <TopicFilterDropdown
                        ariaLabel="Part"
                        value={String(part)}
                        options={partFilterOptions}
                        onChange={(value) => handlePartChange(Number(value))}
                        className="w-full min-w-[7.5rem] flex-1 sm:w-[132px] sm:flex-none"
                      />
                      <TopicFilterDropdown
                        ariaLabel="Sort topics"
                        value={sortBy}
                        options={sortFilterOptions}
                        onChange={(value) => setSortBy(value as SortOption)}
                        className="w-full min-w-[7.5rem] flex-1 sm:w-[132px] sm:flex-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setUseRandomTopic(true);
                          setSelectedTopicIds([]);
                        }}
                        className={cn(
                          "inline-flex h-11 w-full min-w-[9.5rem] flex-1 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition sm:w-auto sm:flex-none",
                          useRandomTopic
                            ? "border-[#6D4CFF] bg-[#FBFAFF] text-[#6D4CFF] shadow-[0_0_0_1px_rgba(109,76,255,0.18)] dark:bg-[#6D4CFF]/10 dark:text-[#C4B5FD]"
                            : "border-[#C4B5FD] bg-white text-[#6D4CFF] hover:bg-[#FBFAFF]/60 dark:border-slate-800 dark:bg-slate-950 dark:text-[#C4B5FD] dark:hover:bg-[#6D4CFF]/5",
                        )}
                      >
                        <Shuffle className="h-4 w-4 shrink-0" />
                        Random topic
                      </button>
                    </div>
                  </div>
                </div>
    
                <div className="mt-6 flex min-h-0 flex-1 flex-col">
                  <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
                    <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-50">Popular topics</h2>
                    {allowsMultiSelect ? (
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Select up to {MAX_SPEAKING_TOPIC_SELECTION} ({selectedTopicIds.length}/{MAX_SPEAKING_TOPIC_SELECTION})
                      </span>
                    ) : null}
                  </div>
    
                  <div
                    ref={topicsScrollRef}
                    className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 [-ms-overflow-style:none] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700"
                  >
                    {loading ? (
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading topics...</p>
                    ) : filteredTopics.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm font-medium text-slate-500 dark:border-slate-800 dark:text-slate-400">
                        No topics match your search. Try another keyword or use a random topic.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {filteredTopics.map((topic, index) => {
                          const visual = getTopicVisual(topic, index);
                          const tone = toneStyles[visual.tone];
                          const isSelected = !useRandomTopic && selectedTopicIds.includes(topic.id);
    
                          return (
                            <TopicPickerCard
                              key={topic.id}
                              topic={topic}
                              visual={visual}
                              tone={tone}
                              isSelected={isSelected}
                              linkedCueCardTitle={
                                topic.partNumber === 3 && topic.followupGroupKey
                                  ? cueCardTitlesByKey[topic.followupGroupKey] ?? null
                                  : null
                              }
                              onToggle={() => toggleTopicSelection(topic.id)}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
    
                <div className="mt-4 flex shrink-0 flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row dark:border-slate-800">
                  <button
                    type="button"
                    onClick={handleContinue}
                    disabled={!useRandomTopic && selectedTopics.length === 0}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#6D4CFF] to-[#2563EB] px-5 text-sm font-semibold text-white shadow-[0_18px_34px_-24px_rgba(109,76,255,0.95)] transition hover:shadow-[0_20px_42px_-24px_rgba(109,76,255,1)] disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-[280px]"
                  >
                    Continue to microphone check
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <Link
                    href="/speaking"
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900 sm:min-w-[120px]"
                  >
                    Cancel
                  </Link>
                </div>
              </section>
        </div>
      )
  );
}
