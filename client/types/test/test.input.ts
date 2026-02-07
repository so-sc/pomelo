import z from "zod";

// type CreateFrom<T extends Test> = Omit<T, "id">;
// type UpdateFrom<T extends Test> = Partial<Omit<T, "id">>;

// export type TestCreate = CreateFrom<Test>;
// export type TestUpdate = UpdateFrom<Test>;

export const testSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  duration: z.string().min(1, "Duration is required"),
  startsAt: z.iso.datetime(),
  problems: z.array(z.string()),
  rules: z.array(z.string()).default([]),
});

export type TestSchema = z.infer<typeof testSchema>;
