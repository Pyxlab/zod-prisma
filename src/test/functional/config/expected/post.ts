import * as z from "zod";
import { CompleteUser, userSchema } from "./index";

export const _postSchema = z.object({
  __schema: z.literal("post").default("post"),
  id: z.string(),
  title: z.string(),
  contents: z.string(),
  userId: z.string(),
});
const omitTypename = _postSchema.omit({ __schema: true });

export interface CompletePost extends z.infer<typeof omitTypename> {
  author: CompleteUser;
}

/**
 * postSchema contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const postSchema: z.ZodSchema<CompletePost> = z.lazy(() => _postSchema.extend({
  __schema: z.literal("post").default("post"),
  author: userSchema,
}));
