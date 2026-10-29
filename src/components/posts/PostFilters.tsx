"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { ChannelChip } from "@/components/domain/ChannelChip";
import type { ChannelOption } from "@/components/campaigns/CampaignFormModal";
import type { PostFilterState } from "@/lib/post-filter";
import type { CampaignOption } from "./NewPostModal";
import type { MemberInfo } from "./PostCard";

const selectCls = "h-10 cursor-pointer rounded-md border border-border-strong bg-surface px-3 text-label hover:border-text";

/** Filterleiste: Suche · Kampagne · Person · Kanal-Chips (ausgewählt = sichtbar) */
export function PostFilters({
  value,
  onChange,
  channels,
  campaigns,
  members,
  showSearch = true,
  showPerson = true,
}: {
  value: PostFilterState;
  onChange: (next: PostFilterState) => void;
  channels: ChannelOption[];
  campaigns: CampaignOption[];
  members: MemberInfo[];
  showSearch?: boolean;
  showPerson?: boolean;
}) {
  const t = useTranslations("posts.filters");
  const tc = useTranslations("channels.types");
  return (
    <div className="flex flex-wrap items-center gap-3">
      {showSearch && (
        <label className="relative flex min-w-48 flex-1 items-center tablet:max-w-64 tablet:flex-none">
          <span className="sr-only">{t("search")}</span>
          <Search aria-hidden className="pointer-events-none absolute left-3 text-text-muted icon-sm" />
          <input
            type="search"
            value={value.q}
            onChange={(e) => onChange({ ...value, q: e.target.value })}
            placeholder={t("search")}
            className="h-10 w-full rounded-md border border-border-strong bg-surface pr-3 pl-9 text-body hover:border-text focus-visible:border-focus"
          />
        </label>
      )}
      {campaigns.length > 0 && (
        <label>
          <span className="sr-only">{t("campaign")}</span>
          <select value={value.campaign} onChange={(e) => onChange({ ...value, campaign: e.target.value })} className={selectCls}>
            <option value="">{t("allCampaigns")}</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {showPerson && members.length > 1 && (
        <label>
          <span className="sr-only">{t("person")}</span>
          <select value={value.person} onChange={(e) => onChange({ ...value, person: e.target.value })} className={selectCls}>
            <option value="">{t("allPeople")}</option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.fullName}
              </option>
            ))}
          </select>
        </label>
      )}
      {channels.length > 1 && (
        <fieldset className="flex flex-wrap gap-2">
          <legend className="sr-only">{t("channels")}</legend>
          {channels.map((c) => {
            const visible = !value.hidden.includes(c.type);
            return (
              <label key={c.id} className="cursor-pointer rounded-full has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={visible}
                  onChange={() =>
                    onChange({ ...value, hidden: visible ? [...value.hidden, c.type] : value.hidden.filter((h) => h !== c.type) })
                  }
                />
                <ChannelChip type={c.type} label={tc(c.type)} state={visible ? "selected" : "off"} />
              </label>
            );
          })}
        </fieldset>
      )}
    </div>
  );
}
