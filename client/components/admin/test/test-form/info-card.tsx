// edit-form.tsx
"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDownIcon, FileText, Hourglass } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { useFormContext } from "react-hook-form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { useEffect, useRef, useState } from "react";

function formatTimeForDisplay(hours: number, minutes: number) {
  const period = hours >= 12 ? "PM" : "AM";
  const normalizedHours = hours % 12 || 12;

  return `${String(normalizedHours).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${period}`;
}

function formatTimeForInput(date: Date) {
  return formatTimeForDisplay(date.getHours(), date.getMinutes());
}

function parseTimeInput(value: string) {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3].toUpperCase();

  if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) {
    return null;
  }

  let normalizedHours = hours % 12;
  if (period === "PM") {
    normalizedHours += 12;
  }

  return { hours: normalizedHours, minutes };
}

function normalizeTimeInput(value: string) {
  return value.replace(/\b(am|pm)\b/gi, (match) => match.toUpperCase());
}

export default function TestBasicCard() {
  const { control, setValue, watch } = useFormContext();

  const startsAt = watch("startsAt");
  const endsAtTime = watch("endsAtTime");
  const endsAt = watch("endsAt");
  const durationMinutes = watch("durationMinutes");
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState("12:00 AM");
  const endsAtInitialized = useRef(false);
  // Resolved client-side only — the server's ICU data can report a different
  // (sometimes outdated-alias) name for the same zone than the browser does,
  // which causes a hydration mismatch if read during SSR.
  const [userTimezone, setUserTimezone] = useState<string | null>(null);
  useEffect(() => {
    setUserTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

  useEffect(() => {
    if (startsAt) {
      const parsed = new Date(startsAt);
      if (!isNaN(parsed.getTime())) {
        setDate(parsed);
        setTime(formatTimeForInput(parsed));
      }
    }
  }, [startsAt]);

  useEffect(() => {
    if (date && time) {
      const parsedTime = parseTimeInput(time);
      if (!parsedTime) {
        return;
      }

      const updated = new Date(date);
      updated.setHours(parsedTime.hours);
      updated.setMinutes(parsedTime.minutes);
      updated.setSeconds(0);
      setValue("startsAt", updated.toISOString());
    }
  }, [date, time, setValue]);

  // On edit: initialize the "Join Window Closes At" display from the stored UTC endsAt
  useEffect(() => {
    if (!endsAtInitialized.current && endsAt) {
      endsAtInitialized.current = true;
      const parsed = new Date(endsAt);
      if (!isNaN(parsed.getTime())) {
        setValue("endsAtTime", formatTimeForInput(parsed));
      }
    }
  }, [endsAt, setValue]);

  // Recompute endsAt (UTC ISO) whenever the join-window close time or start date changes
  useEffect(() => {
    if (date && endsAtTime) {
      endsAtInitialized.current = true;
      const parsedTime = parseTimeInput(endsAtTime);
      if (!parsedTime) return;
      const endDate = new Date(date);
      endDate.setHours(parsedTime.hours, parsedTime.minutes, 0, 0);
      if (startsAt && endDate <= new Date(startsAt)) {
        endDate.setDate(endDate.getDate() + 1);
      }
      setValue("endsAt", endDate.toISOString());
    }
  }, [date, endsAtTime, startsAt, setValue]);

  const durationPreview = (() => {
    const total = Number(durationMinutes);
    if (!Number.isFinite(total) || total <= 0) return null;
    const hours = Math.floor(total / 60);
    const minutes = total % 60;
    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    return parts.join(" ") || "0m";
  })();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Basic Information
        </CardTitle>
        <CardDescription>
          Configure the test title, description, and scheduling settings.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Test Title</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea rows={3} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <p className="text-xs text-muted-foreground">
          All times are in your local timezone: <span className="font-medium">{userTimezone}</span>
        </p>

        <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
          <div>
            <h4 className="text-sm font-semibold">Join Window</h4>
            <p className="text-xs text-muted-foreground">
              Participants can start their attempt any time in this window.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Opens At</Label>
              <div className="flex space-x-2">
                <Popover open={open} onOpenChange={setOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-32 justify-between font-normal bg-background"
                    >
                      {date ? date.toLocaleDateString() : "Select date"}
                      <ChevronDownIcon className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      captionLayout="dropdown"
                      disabled={(day) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        return day < today;
                      }}
                      onSelect={(d) => {
                        setDate(d);
                        setOpen(false);
                      }}
                    />
                  </PopoverContent>
                </Popover>
                <Input
                  type="text"
                  value={time}
                  onChange={(e) => setTime(normalizeTimeInput(e.target.value))}
                  placeholder="hh:mm AM"
                  className="w-fit bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden"
                />
              </div>
            </div>

            <FormField
              control={control}
              name="endsAtTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Closes At (HH:MM AM/PM)</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      value={field.value || ""}
                      onChange={(e) => field.onChange(normalizeTimeInput(e.target.value))}
                      placeholder="01:30 PM"
                      className="w-fit bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
          <div>
            <h4 className="text-sm font-semibold">Attempt Duration</h4>
            <p className="text-xs text-muted-foreground">
              How long each participant gets, starting from the moment they personally begin.
            </p>
          </div>
          <FormField
            control={control}
            name="durationMinutes"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="sr-only">Duration (minutes)</FormLabel>
                <FormControl>
                  <div className="flex items-center gap-2">
                    <Hourglass className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                      placeholder="60"
                      className="w-28 bg-background"
                    />
                    <span className="text-sm text-muted-foreground">minutes</span>
                    {durationPreview && (
                      <span className="text-xs text-muted-foreground">≈ {durationPreview}</span>
                    )}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={control}
          name="shuffleQuestions"
          render={({ field }) => (
            <FormItem className="flex items-start gap-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value === true}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                  className="mt-0.5"
                />
              </FormControl>
              <div className="space-y-1">
                <FormLabel className="font-normal">Shuffle question order for candidates</FormLabel>
                <p className="text-xs text-muted-foreground">
                  Each candidate gets their own order, which stays the same across reloads and re-logins.
                </p>
              </div>
            </FormItem>
          )}
        />
        {/* Hidden fields to ensure computed values are passed */}
        <FormField
          control={control}
          name="status"
          render={({ field }) => <input type="hidden" {...field} />}
        />
        <FormField
          control={control}
          name="endsAt"
          render={({ field }) => <input type="hidden" {...field} />}
        />
      </CardContent>
    </Card>
  );
}
