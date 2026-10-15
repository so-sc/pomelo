"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { CheckCircle2 } from "lucide-react";
import { submitFeedback } from "@/actions/contest";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const DIFFICULTY = ["Very easy", "Easy", "Moderate", "Hard", "Very hard"];
const EXPERIENCE = ["Poor", "Fair", "Good", "Very good", "Excellent"];

export default function FeedbackForm({ testId, title, alreadySubmitted }: {
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
      const result = await submitFeedback(testId, { difficulty, experience, comment });
      if (result.success || result.alreadySubmitted) setSubmitted(true);
      else setError(result.error || result.message || "Feedback could not be saved. Please try again.");
    } catch {
      setError("Feedback could not be saved. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  if (submitted) {
    return (
      <Card>
        <CardHeader className="space-y-3">
          <CheckCircle2 className="size-8 text-primary" aria-hidden="true" />
          <h1 className="text-2xl font-semibold">Thank you for your feedback</h1>
          <p className="text-muted-foreground">Your feedback for {title} has been shared with the organizers.</p>
        </CardHeader>
        <CardContent>
          <Button asChild><Link href={`/test/${testId}`}>Continue</Link></Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="space-y-3">
        <p className="text-sm font-medium text-primary">Test submitted · {title}</p>
        <h1 className="text-2xl font-semibold sm:text-3xl">How was your test?</h1>
        <p className="text-sm text-muted-foreground">
          Feedback is optional and shared with the test organizers. Your answers and score are already saved.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-7" aria-busy={saving}>
          <Rating name="difficulty" legend="How difficult was the test?" choices={DIFFICULTY}
            value={difficulty} onChange={setDifficulty} disabled={saving} />
          <Rating name="experience" legend="How was your platform experience?" choices={EXPERIENCE}
            value={experience} onChange={setExperience} disabled={saving} />
          <div className="space-y-2">
            <Label htmlFor="feedback-comment">Anything else? <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Textarea id="feedback-comment" value={comment} onChange={event => setComment(event.target.value)}
              maxLength={2000} rows={4} disabled={saving} aria-describedby="feedback-comment-help"
              placeholder="Tell us about the questions, your experience, or any technical issues." />
            <p id="feedback-comment-help" className="text-xs text-muted-foreground">
              {comment.length.toLocaleString()} / 2,000 characters
            </p>
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={saving || !difficulty || !experience}>
              {saving ? "Sending feedback…" : "Send feedback"}
            </Button>
            <Button type="button" variant="ghost" disabled={saving} asChild>
              <Link href={`/test/${testId}`} aria-disabled={saving} tabIndex={saving ? -1 : undefined}
                onClick={event => { if (saving) event.preventDefault(); }}>Skip feedback</Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function Rating({ name, legend, choices, value, onChange, disabled }: {
  name: string;
  legend: string;
  choices: string[];
  value?: number;
  onChange: (value: number) => void;
  disabled: boolean;
}) {
  return (
    <fieldset disabled={disabled} className="space-y-3">
      <legend className="text-sm font-medium">{legend}</legend>
      <div className="grid grid-cols-5 gap-2">
        {choices.map((choice, index) => (
          <label key={choice} className="cursor-pointer">
            <input className="peer sr-only" type="radio" name={name} value={index + 1} required
              checked={value === index + 1} onChange={() => onChange(index + 1)} />
            <span className="flex h-full min-h-20 flex-col items-center justify-center gap-1 rounded-md border border-input px-1 py-3 text-center peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring peer-disabled:opacity-50">
              <span className="text-lg font-semibold tabular-nums">{index + 1}</span>
              <span className="text-xs">{choice}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
