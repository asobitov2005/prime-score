"use client";

import { useState } from "react";
import { ArrowRight, Check, RotateCcw } from "lucide-react";
import styles from "./landing.module.css";

const answers = ["True", "False", "Not given"] as const;

export function LandingSample() {
  const [answer, setAnswer] = useState<string | null>(null);
  const [showClue, setShowClue] = useState(false);
  return (
    <div className={styles.sampleScene}>
      <div className={styles.paperLeaf} data-leaf="back" aria-hidden="true" />
      <div className={styles.paperLeaf} data-leaf="middle" aria-hidden="true" />
      <div
        className={styles.practiceSheet}
        id="sample"
        data-answered={answer !== null}
        onKeyDown={(event) => {
          if (event.key === "Escape") setShowClue(false);
        }}
      >
        <div className={styles.deskTab} aria-hidden="true">
          <span>{answer === null ? "YOUR TURN" : "EVIDENCE FOUND"}</span>
          {answer === null ? <ArrowRight size={12} /> : <Check size={12} />}
        </div>
        <div className={styles.sheetTop}>
          <span>
            <span className={styles.sheetDot} /> THE PRACTICE DESK
          </span>
          <span>01 / 01</span>
        </div>
        <div className={styles.sheetBody}>
          <div className={styles.sheetLabel}>
            READING <span>Try one question</span>
          </div>
          <h2>
            A little practice.
            <br />A clearer answer.
          </h2>
          <div className={styles.passageScene} data-flipped={showClue}>
            <div className={styles.passageFlip}>
              <div
                className={`${styles.passage} ${styles.passageFace}`}
                aria-hidden={showClue}
              >
                <span className={styles.passageLabel}>FROM THE PASSAGE</span>
                <p>
                  Urban trees do more than provide shade.{" "}
                  <mark data-revealed={answer !== null}>
                    Their roots absorb rainwater, reducing the amount that flows
                    into city drains.
                  </mark>{" "}
                  They also create habitats for birds and insects.
                </p>
              </div>
              <div
                id="sample-reading-note"
                className={`${styles.passageFace} ${styles.passageBack}`}
                aria-hidden={!showClue}
              >
                <p className={styles.clueHeading}>
                  Same idea. Different words.
                </p>
                <div className={styles.clueConnection}>
                  <span>absorb rainwater</span>
                  <svg
                    width="28"
                    height="25"
                    viewBox="0 0 28 25"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M7 2C1 16 8 20 22 18M17 12L24 18L17 23"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span>less reaches the drains</span>
                </div>
                <p className={styles.clueConclusion}>
                  So trees <strong>reduce runoff.</strong>
                </p>
                <p className={styles.clueFootnote}>
                  Look for the meaning, not just matching words.
                </p>
              </div>
            </div>
          </div>
          <button
            type="button"
            className={styles.clueToggle}
            aria-pressed={showClue}
            aria-controls="sample-reading-note"
            onClick={() => setShowClue(!showClue)}
          >
            <span className={styles.foldIcon} aria-hidden="true" />
            {showClue ? "Back to the passage" : "Turn for a reading trick"}
            <RotateCcw size={13} aria-hidden="true" />
          </button>
          <fieldset className={styles.sampleQuestion}>
            <legend>
              <span>01</span> Trees can help reduce rainwater runoff in cities.
            </legend>
            <div className={styles.answers}>
              {answers.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={answer === option}
                  data-selected={answer === option}
                  data-correct={answer !== null && option === "True"}
                  onClick={() => {
                    setAnswer(option);
                    setShowClue(false);
                  }}
                >
                  {answer !== null && option === "True" ? (
                    <Check size={15} aria-hidden="true" />
                  ) : null}
                  {option}
                </button>
              ))}
            </div>
          </fieldset>
          <div
            className={styles.sampleFeedback}
            aria-live="polite"
            aria-atomic="true"
          >
            {answer === null ? (
              <p>
                <span className={styles.feedbackSpark}>+</span> Pick an answer.
                See the evidence behind it.
              </p>
            ) : (
              <div key={answer} className={styles.feedbackResult}>
                <strong>
                  {answer === "True"
                    ? "Exactly. The evidence is right there."
                    : "The answer is True. Here is the clue."}
                </strong>
                <p>
                  The roots absorb rainwater, so less water reaches the drains.
                  That is what reducing runoff means.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setAnswer(null);
                    setShowClue(false);
                  }}
                  className={styles.resetSample}
                >
                  <RotateCcw size={13} aria-hidden="true" /> Try again
                </button>
              </div>
            )}
          </div>
        </div>
        <div className={styles.sheetBottom}>
          <span>Illustrative question. No score is saved.</span>
          <a href="#practice" aria-label="Explore practice tests">
            <ArrowRight size={18} />
          </a>
        </div>
        <div className={styles.evidenceStamp} aria-hidden="true">
          <Check size={14} strokeWidth={1.5} /> Now it clicks.
        </div>
      </div>
    </div>
  );
}
