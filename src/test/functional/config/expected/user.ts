import * as z from "zod";
import { CompletePost, postSchema } from "./index";

export const _userSchema = z.object({
  __schema: z.literal("user").default("user"),
  id: z.string(),
  name: z.string(),
  email: z.string(),
});
const omitTypename = _userSchema.omit({ __schema: true });

export interface CompleteUser extends z.infer<typeof omitTypename> {
  posts: CompletePost[];
}

/**
 * userSchema contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const userSchema: z.ZodSchema<CompleteUser> = z.lazy(() => _userSchema.extend({
  __schema: z.literal("user").default("user"),
  posts: postSchema.array(),
}));
