"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { CheckCircle2 } from "lucide-react";
import { submitFeedback } from "@/actions/contest";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

import { DIFFICULTY_LABELS, EXPERIENCE_LABELS } from "@/lib/feedback";

export default function FeedbackForm({
  testId,
  title,
  alreadySubmitted,
}: {
  testId: string;
  title: string;
  alreadySubmitted: boolean;
}) {
  const [difficulty, setDifficulty] = useState<number>();
  const [experience, setExperience] = useState<number>();
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(alreadySubmitted);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!difficulty || !experience || saving) return;
    setSaving(true);
    setError("");
    try {
      const result = await submitFeedback(testId, {
        difficulty,
        experience,
        comment,
      });
      if (result.success || result.alreadySubmitted) setSubmitted(true);
      else
        setError(
          result.error ||
            result.message ||
            "Feedback could not be saved. Please try again.",
        );
    } catch {
      setError(
        "Feedback could not be saved. Check your connection and try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (submitted) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-6 py-12 sm:py-20">
        <CheckCircle2 className="size-12 text-primary" aria-hidden="true" />
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Thank you for your feedback
        </h1>
        <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
          Your feedback has been shared with the organizers to help improve
          future tests.
        </p>
        <Button size="lg" asChild>
          <Link href={`/test/${testId}`}>Continue</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
      <header className="space-y-6 lg:sticky lg:top-16 lg:self-start">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <CheckCircle2 className="size-5" aria-hidden="true" />
          Test submitted successfully
        </div>
        <p className="break-words text-sm font-medium text-muted-foreground">
          {title}
        </p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
          How was
          <br className="hidden lg:block" /> your test?
        </h1>
        <p className="max-w-md text-lg leading-relaxed text-muted-foreground">
          Help the organizers understand what worked and what could be better.
        </p>
        <div className="max-w-md space-y-3 border-t border-border pt-6 text-sm leading-relaxed text-muted-foreground">
          <p>Your answers and score are already saved.</p>
          <p>
            Feedback is optional and shared with the test organizers. You can
            skip it at any time.
          </p>
        </div>
      </header>
      <form
        onSubmit={handleSubmit}
        className="min-w-0 space-y-9"
        aria-busy={saving}
      >
        <Rating
          name="difficulty"
          legend="How difficult was the test?"
          choices={DIFFICULTY_LABELS}
          value={difficulty}
          onChange={setDifficulty}
          disabled={saving}
        />
        <Rating
          name="experience"
          legend="How was your platform experience?"
          choices={EXPERIENCE_LABELS}
          value={experience}
          onChange={setExperience}
          disabled={saving}
        />
        <div className="space-y-3 border-t border-border pt-8">
          <Label htmlFor="feedback-comment" className="text-base">
            Anything else?{" "}
            <span className="font-normal text-muted-foreground">
              (optional)
            </span>
          </Label>
          <p
            id="feedback-comment-description"
            className="text-sm text-muted-foreground"
          >
            Tell us about the questions, your experience, or any technical
            issues.
          </p>
          <Textarea
            id="feedback-comment"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            maxLength={2000}
            rows={5}
            disabled={saving}
            className="min-h-36 text-base"
            aria-describedby="feedback-comment-description feedback-comment-help"
            placeholder="Share your thoughts…"
          />
          <p
            id="feedback-comment-help"
            className="text-sm text-muted-foreground"
          >
            {comment.length.toLocaleString()} / 2,000 characters
          </p>
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-6">
          <Button
            size="lg"
            type="submit"
            disabled={saving || !difficulty || !experience}
          >
            {saving ? "Sending feedback…" : "Send feedback"}
          </Button>
          <Button
            size="lg"
            type="button"
            variant="ghost"
            disabled={saving}
            asChild
          >
            <Link
              href={`/test/${testId}`}
              aria-disabled={saving}
              tabIndex={saving ? -1 : undefined}
              onClick={(event) => {
                if (saving) event.preventDefault();
              }}
            >
              Skip feedback
            </Link>
          </Button>
        </div>
      </form>
    </div>
  );
}

function Rating({
  name,
  legend,
  choices,
  value,
  onChange,
  disabled,
}: {
  name: string;
  legend: string;
  choices: readonly string[];
  value?: number;
  onChange: (value: number) => void;
  disabled: boolean;
}) {
  return (
    <fieldset disabled={disabled} className="space-y-4">
      <legend className="text-lg font-medium">{legend}</legend>
      <div className="grid grid-cols-5 gap-2">
        {choices.map((choice, index) => (
          <label key={choice} className="cursor-pointer">
            <input
              className="peer sr-only"
              type="radio"
              name={name}
              value={index + 1}
              required
              checked={value === index + 1}
              onChange={() => onChange(index + 1)}
            />
            <span className="flex h-full min-h-28 flex-col items-center justify-center gap-1 rounded-md border border-input px-1 py-3 text-center peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring peer-disabled:opacity-50">
              <span className="text-2xl font-semibold tabular-nums">
                {index + 1}
              </span>
              <span className="text-xs sm:text-sm">{choice}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
