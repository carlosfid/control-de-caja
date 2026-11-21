import type { CajaDatabase } from './db';
import { resetLocalData as clearLocalData, loadDemoData } from './seed';

export async function resetLocalData(db: CajaDatabase): Promise<void> {
  await clearLocalData(db);
  await loadDemoData(db);
}
