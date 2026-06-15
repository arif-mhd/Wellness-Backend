import { v4 as uuidv4 } from "uuid";
import { activityLogsContainer } from "../config/cosmos";

export type ActivitySource = "admin" | "doctor" | "patient" | "pharmacy" | "lab";

export interface ActivityLog {
  id: string;
  source: ActivitySource;
  action: string;
  details: string;
  performedBy: string;      // display name or role string
  performedById: string;    // SuperTokens userId
  entityType?: string;      // e.g. "appointment", "doctor", "order"
  entityId?: string;
  timestamp: string;        // ISO
}

export async function logActivity(entry: Omit<ActivityLog, "id" | "timestamp">): Promise<void> {
  try {
    const doc: ActivityLog = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      ...entry,
    };
    await activityLogsContainer.items.create(doc);
  } catch (err) {
    // Never crash the calling route — logging is best-effort
    console.error("[activityLogger] Failed to write log:", err);
  }
}
