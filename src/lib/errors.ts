/** Turn any thrown value into a readable string for an error banner.
 *
 * Supabase-js throws plain objects (PostgrestError, AuthError, StorageError —
 * none of them `instanceof Error`), each carrying a `.message` string. Every
 * catch block in this app used to do `err instanceof Error ? err.message :
 * String(err)`, which is false for all of those, so `String(err)` fell
 * through to `Object.prototype.toString` and printed the literal text
 * "[object Object]" instead of the actual problem. Use this everywhere a
 * caught error becomes user-facing text.
 */
export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  return String(err);
}
