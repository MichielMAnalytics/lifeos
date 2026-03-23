import { db } from '../db/client.js';
import { mutationLog } from '../db/schema.js';

export async function logMutation(
  userId: string,
  action: string,
  tableName: string,
  recordId: string,
  beforeData: Record<string, unknown> | null,
  afterData: Record<string, unknown> | null,
) {
  await db.insert(mutationLog).values({
    user_id: userId,
    action,
    table_name: tableName,
    record_id: recordId,
    before_data: beforeData,
    after_data: afterData,
  });
}
