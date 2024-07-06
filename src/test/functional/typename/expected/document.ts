import * as z from "zod";

export const DocumentModel = z.object({
  __schema: z.literal("document").default("document"),
  id: z.string(),
  filename: z.string(),
  author: z.string(),
  contents: z.string(),
  created: z.date(),
  updated: z.date(),
});
