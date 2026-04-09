/**
 * After schema changes, run `npx prisma generate` in the server folder
 * (stop `npm run dev` first on Windows — the query engine file may be locked).
 */
export function getAchievementDelegate(prisma) {
  const delegate = prisma.achievement;
  if (!delegate) {
    const err = new Error(
      'Prisma client is outdated: stop the dev server, then run `npx prisma generate` in the server folder.'
    );
    err.statusCode = 503;
    throw err;
  }
  return delegate;
}
