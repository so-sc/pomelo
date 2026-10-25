import z from "zod";

// type CreateFrom<T extends Test> = Omit<T, "id">;
// type UpdateFrom<T extends Test> = Partial<Omit<T, "id">>;

// export type TestCreate = CreateFrom<Test>;
// export type TestUpdate = UpdateFrom<Test>;

export const testSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  endsAtTime: z
    .string()
    .regex(
      /^(0?[1-9]|1[0-2]):[0-5]\d\s?(AM|PM)$/i,
      "Join window close time must be in HH:MM AM/PM format",
    ),
  durationMinutes: z
    .number()
    .int()
    .positive("Duration must be a positive number of minutes"),
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime(),
  problems: z.array(z.string()),
  rules: z.array(z.string()).default([]),
  shuffleQuestions: z.boolean().default(false),
});

export type TestSchema = z.infer<typeof testSchema>;
