/**
 * Optional real-data override.
 *
 * If a gitignored `/data/household.json` snapshot exists (see
 * `/data/README.md`), it becomes the foundation the app starts from instead
 * of the generic placeholder figures in `seed.ts`. Vite's glob import
 * resolves to an empty match -- not a build error -- when the file is
 * absent, so a fresh clone with no local data still builds and runs fine.
 */
const modules = import.meta.glob('/data/household.json', {
  eager: true,
  import: 'default',
}) as Record<string, unknown>;

export const LOCAL_HOUSEHOLD_DATA: unknown = Object.values(modules)[0];
