import type { Database } from "@/server/db/database.types";

type Enums = Database["public"]["Enums"];
export type ChannelType = Enums["channel_type"];
export type PostStatus = Enums["post_status"];
export type CampaignStatus = Enums["campaign_status"];
export type CampaignGoal = Enums["campaign_goal"];
export type ConnectionStatus = Enums["connection_status"];

// Reihenfolge laut Design (ChannelChip)
export const CHANNEL_TYPES = ["instagram", "facebook", "youtube", "linkedin", "tiktok", "offline"] as const satisfies readonly ChannelType[];

export const POST_STATUSES = [
  "idea",
  "draft",
  "in_review",
  "changes_requested",
  "approved",
  "scheduled",
  "published",
  "evaluated",
] as const satisfies readonly PostStatus[];

export const CAMPAIGN_STATUSES = ["draft", "running", "paused", "completed"] as const satisfies readonly CampaignStatus[];
export const CAMPAIGN_GOALS = ["inquiries", "recruiting", "awareness", "event", "other"] as const satisfies readonly CampaignGoal[];

/** Zeichenlimits je Kanal (TextField-README) */
export const CHANNEL_TEXT_LIMITS: Partial<Record<ChannelType, number>> = {
  instagram: 2200,
  linkedin: 3000,
  tiktok: 2200,
  facebook: 63206,
  youtube: 5000,
};
