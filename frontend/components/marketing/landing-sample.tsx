"use client";

import { useState } from "react";
import { ArrowRight, Check, RotateCcw } from "lucide-react";
import styles from "./landing.module.css";

const answers = ["True", "False", "Not given"] as const;

export function LandingSample() {
  const [answer, setAnswer] = useState<string | null>(null);
  return (
    <div
      className={styles.practiceSheet}
      id="sample"
      data-answered={answer !== null}
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
        <div className={styles.passage}>
          <span className={styles.passageLabel}>FROM THE PASSAGE</span>
          <p>
            Urban trees do more than provide shade.{" "}
            <mark data-revealed={answer !== null}>
              Their roots absorb rainwater, reducing the amount that flows into
              city drains.
            </mark>{" "}
            They also create habitats for birds and insects.
          </p>
        </div>
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
                onClick={() => setAnswer(option)}
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
                onClick={() => setAnswer(null)}
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
    </div>
  );
}
