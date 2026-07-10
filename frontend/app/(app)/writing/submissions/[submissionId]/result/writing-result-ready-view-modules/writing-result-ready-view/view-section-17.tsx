"use client";
import type { WritingResultReadyViewScope } from "./controller";
import { AlertTriangle, ArrowRight, ArrowUpRight, Badge, Button, CATEGORY_STYLE, Card, CardContent, CardHeader, CardTitle, CheckCircle2, ClipboardList, Clock3, Copy, CriterionCard, FeedbackPanel, FileText, Flame, ImprovedDiffView, Link, PenSquare, ScoreGauge, ShieldCheck, Sparkles, StatTile, TargetActionPlanPanel, Trophy, VocabularySuggestionCard, buildAnnotationTooltip, categoryStyle, cn, formatDate, formatDuration, toBandNumber, xpNumber } from "../dependencies";
import { WritingResultReadyViewSection2 } from "./view-section-02";
import { WritingResultReadyViewSection3 } from "./view-section-03";
import { WritingResultReadyViewSection4 } from "./view-section-04";
import { WritingResultReadyViewSection5 } from "./view-section-05";
import { WritingResultReadyViewSection6 } from "./view-section-06";
import { WritingResultReadyViewSection7 } from "./view-section-12";
import { WritingResultReadyViewSection13 } from "./view-section-13";
import { WritingResultReadyViewSection14 } from "./view-section-14";
import { WritingResultReadyViewSection15 } from "./view-section-15";
import { WritingResultReadyViewSection16 } from "./view-section-16";
import { WritingResultReadyViewSection17 } from "./view-section-17";

export function WritingResultReadyViewView1({ scope }: { scope: WritingResultReadyViewScope }) {
  const { result, taskBadgeLabel, overall, overallTone, errorCount, potential, delta, wordPenalty, confidence, possibleScoreRange, selectedBenchmarks, effectiveDesiredScore, targetActions, annotatedRef, segments, focusedAnnotationIndex, annotations, setActiveAnnotation, activeAnnotation, activeAnno, activeAnnoSentencePreview, copyText, copiedAnnotation, hasImprovedTextChanges, setActiveVersion, activeVersion, strongestCriterion, weakestCriterion, vocabularySuggestions } = scope;
  return (
    (
        (
            <div className="space-y-3 animate-in fade-in duration-500">
              <WritingResultReadyViewSection2 scope={scope} />
        
              <WritingResultReadyViewSection3 scope={scope} />
        
              <WritingResultReadyViewSection4 scope={scope} />
        
              <WritingResultReadyViewSection5 scope={scope} />
        
              <WritingResultReadyViewSection6 scope={scope} />
        
              <WritingResultReadyViewSection7 scope={scope} />
        
              <WritingResultReadyViewSection13 scope={scope} />
        
              <WritingResultReadyViewSection14 scope={scope} />
        
              <WritingResultReadyViewSection15 scope={scope} />
        
              <WritingResultReadyViewSection16 scope={scope} />
        
              <WritingResultReadyViewSection17 scope={scope} />
            </div>
          )
      )
  );
}
