// Kampagnenplan der KI bereinigen (reine Funktionen, testbar)
import { z } from "zod";
import { CHANNEL_TYPES, type CampaignGoal, type ChannelType } from "@/lib/domain";

export const campaignSchema = z.object({
  name: z.string(),
  goal_description: z.string(),
  duration_weeks: z.number(),
  channels: z.array(z.enum(CHANNEL_TYPES)),
  ideas: z.array(z.object({ title: z.string(), body: z.string(), channel: z.enum(CHANNEL_TYPES), week: z.number() })),
});

export type CampaignPlan = {
  name: string;
  goal: CampaignGoal;
  goalDescription: string;
  durationWeeks: number;
  channels: ChannelType[];
  ideas: { title: string; body: string; channel: ChannelType; week: number }[];
  source: "ai" | "template";
};

const clampInt = (n: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(Number.isFinite(n) ? n : min)));

/** Plan bereinigen: nur vorhandene Kanäle, Wochen im Zeitraum, Längen begrenzt */
export function normalizePlan(raw: z.infer<typeof campaignSchema>, goal: CampaignGoal, available: ChannelType[], source: CampaignPlan["source"]): CampaignPlan {
  const weeks = clampInt(raw.duration_weeks, 1, 12);
  const pick = (c: ChannelType) => (available.length === 0 || available.includes(c) ? c : available[0]!);
  const channels = [...new Set(raw.channels.map(pick))];
  return {
    name: raw.name.trim().slice(0, 120) || "Kampagne",
    goal,
    goalDescription: raw.goal_description.trim().slice(0, 500),
    durationWeeks: weeks,
    channels,
    ideas: raw.ideas.slice(0, 4).map((i) => ({
      title: i.title.trim().slice(0, 120),
      body: i.body.trim().slice(0, 5000),
      channel: pick(i.channel),
      week: clampInt(i.week, 1, weeks),
    })),
    source,
  };
}

