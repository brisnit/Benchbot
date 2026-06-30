import type { AppInfo } from "@/lib/apps/itunes";
import type { AppComparison } from "@/lib/apps/analyze";

// A saved App Compare "audit" — a snapshot of the apps + AI comparison.
export interface AppComparisonRecord {
  id: string;
  workspace_id: string;
  user_id: string;
  target_name: string;
  target_id: number;
  country: string;
  apps: AppInfo[]; // target first, then competitors
  comparison: AppComparison;
  created_at: string;
  updated_at: string;
}
