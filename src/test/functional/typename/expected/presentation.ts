import * as z from "zod";

export const PresentationModel = z.object({
  __schema: z.literal("presentation").default("presentation"),
  id: z.string(),
  filename: z.string(),
  author: z.string(),
  contents: z.string().array(),
  created: z.date(),
  updated: z.date(),
});
