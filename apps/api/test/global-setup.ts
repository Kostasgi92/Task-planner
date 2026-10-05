import { runMigrations } from '@tasknest/db/migrate';
import { testDatabaseUrl } from './helpers';

export default async function setup() {
  await runMigrations(testDatabaseUrl());
}
