# Datenbankschema (freigegeben 2026-10-29)

Alle IDs `uuid` (`gen_random_uuid()`), Zeitstempel `timestamptz`, Geld in Cent (`bigint`). Jede fachliche Tabelle: `organization_id` + RLS. Löschen eines Unternehmens kaskadiert (`ON DELETE CASCADE`) über alle Tabellen.

## Enums
| Enum | Werte |
|---|---|
| `member_role` | owner, editor, external, viewer |
| `channel_type` | instagram, facebook, youtube, linkedin, tiktok, offline |
| `offline_kind` | flyer, poster, vehicle, fair, print_ad, other |
| `post_status` | idea, draft, in_review, changes_requested, approved, scheduled, published, evaluated |
| `campaign_status` | draft, running, paused, completed |
| `campaign_goal` | inquiries, recruiting, awareness, event, other |
| `approval_decision` | approved, changes_requested |
| `connection_status` | not_connected, connected, expired, error |
| `asset_kind` | image, video, logo, document |
| `address_form` | du, sie |

## Phase 1 – Fundament
| Tabelle | Wichtige Spalten | Hinweis |
|---|---|---|
| `profiles` | id (= auth.users.id), full_name, avatar_path, locale | Ausnahme ohne org_id: gehört der Person, nicht dem Unternehmen |
| `organizations` | id, name, slug, created_by, created_at | der Mandant selbst |
| `organization_profiles` | organization_id (PK), industry, location, radius_km, website, target_audiences text[], address_form, tone, services text[], onboarding_completed_at | Grundlage für KI |
| `memberships` | organization_id, user_id, role | PK (organization_id, user_id); mind. ein owner je Unternehmen (Trigger) |
| `invitations` | id, organization_id, email, role, token_hash, invited_by, expires_at, accepted_at | Token nur gehasht gespeichert |

## Phase 2 – Kern
| Tabelle | Wichtige Spalten | Hinweis |
|---|---|---|
| `channels` | id, organization_id, type, name, connection_status, provider, external_account_name | eindeutig (organization_id, type) für Online-Kanäle |
| `channel_credentials` | channel_id (PK), organization_id, ciphertext, iv, auth_tag, expires_at | AES-256-GCM; **kein** Zugriff per Client, nur Server (Service-Rolle) |
| `campaigns` | id, organization_id, name, goal, goal_description, goal_target, start_date, end_date, status, budget_planned_cents, created_by | |
| `campaign_channels` | campaign_id, channel_id, organization_id, budget_planned_cents | beteiligte Kanäle + Planbudget je Kanal |
| `post_groups` | id, organization_id, title, created_by | verknüpft Beiträge aus derselben Idee |
| `posts` | id, organization_id, channel_id, campaign_id?, group_id?, title, body, status, scheduled_at, published_at, external_post_id, publish_error, created_by, updated_by, version | genau ein Kanal; Status nur über `transition_post_status()` änderbar |
| `post_assignees` | post_id, user_id, organization_id | Verantwortliche; steuert Sichtbarkeit für `external` |
| `comments` | id, organization_id, post_id, author_id, body, quoted_text?, created_at, edited_at | |
| `approvals` | id, organization_id, post_id, decision, comment_id?, decided_by, decided_at | nur owner; „changes_requested“ verlangt Kommentar |
| `assets` | id, organization_id, kind, storage_path, file_name, mime_type, size_bytes, width, height, duration_s, alt_text, uploaded_by | Dateien in Storage-Bucket je Unternehmen (`<org_id>/…`) |
| `post_assets` | post_id, asset_id, organization_id, position | |
| `activity_log` | id (bigint), organization_id, entity_type, entity_id, action, actor_id, changes jsonb, created_at | nur per Trigger beschrieben, nicht änderbar |
| `notifications` | id, organization_id, user_id, type, payload jsonb, read_at, created_at | |
| `push_subscriptions` | id, user_id, endpoint, p256dh, auth, created_at | Ausnahme ohne org_id: gehört dem Gerät der Person |
| `user_preferences` | user_id, organization_id, key, value jsonb | gemerkte Filter/Ansichten |

### Ergänzung Wochenplan (freigegeben 2026-10-29; Bild/Video-Prompts nur speichern+kopieren, Design-Entwurf vor Phase 2)
Der Wochenplan ist nur eine Ansicht auf `posts` (Kanal + `planned_on`/`scheduled_at` + Status) – keine eigene Datenhaltung.

| Änderung / Tabelle | Wichtige Spalten | Hinweis |
|---|---|---|
| `posts` + Spalten | internal_notes, planned_on (date) | `planned_on` = Tag im Wochenplan, auch ohne Uhrzeit; `scheduled_at` bleibt der genaue Termin |
| Enum `ai_prompt_kind` | text, image, video, caption | |
| `post_ai_prompts` | id, organization_id, post_id, kind, prompt, result, result_at, position, created_by | beliebig viele je Beitrag, sortierbar; Ergebnis wird gespeichert |
| `prompt_templates` | id, organization_id, name, kind, prompt, created_by | Prompt-Vorlagen je Unternehmen |
| `week_templates` | id, organization_id, name, is_default | feste Wochenstruktur je Unternehmen |
| `week_template_slots` | id, organization_id, week_template_id, channel_id, weekday (1–7), time_of_day?, title, notes, prompts jsonb (kind, prompt), position | ein Eintrag = ein Beitrag, der beim Anwenden als `idea` angelegt wird |
| `approval_requests` | id, organization_id, requested_by, week_start (date), channel_id? (leer = alle), message, status (open/closed), created_at | Sammel-Einreichung einer Woche |
| `approval_request_posts` | approval_request_id, post_id, organization_id | owner gibt alle gesammelt oder einzeln frei (je Beitrag ein Eintrag in `approvals`) |

Funktionen: `apply_week_template(org, template, week_start)`, `copy_week(org, from_week, to_week, channel?)` (kopiert als `idea`, ohne Ergebnisse/Kommentare), `submit_week_for_approval(org, week_start, channel?)`, `transfer_post(post, target_channels[])` (neue Beiträge in derselben `post_group`).

## Phase 3 – KI
| Tabelle | Wichtige Spalten | Hinweis |
|---|---|---|
| `ai_requests` | id, organization_id, user_id, kind (`ai_request_kind`: text, adapt, prompt, ideas, campaign), model, input_tokens, output_tokens, created_at, finished_at | nur Nutzungsdaten, **keine** Prompts/Texte (Datensparsamkeit); lesbar nur für `owner`; Schreiben nur über Funktionen |
| `industry_templates` | id, industry, goal (`campaign_goal`), name, content jsonb (description, duration_weeks, channels[], ideas[{title, body}]) | globale Vorlagen, nur lesbar, ohne org_id; 4 allgemeine + 24 Branchen-Vorlagen |
| `organizations.ai_daily_limit` | integer, Standard 100 | Kostenbremse je Unternehmen und Tag (Berliner Zeit); nur Betreiber ändern es |

Funktionen: `begin_ai_request(org, kind)` (prüft Rolle owner/editor/external + Tageslimit, legt Protokoll an), `finish_ai_request(id, model, input, output)` (nur eigene, offene Anfrage), `ai_usage_today(org)`. Prompt-Ergebnisse (`post_ai_prompts.result/result_at`) dürfen Bearbeitende des Beitrags schreiben.

## Phase 4 – Messen & Steuern
| Tabelle | Wichtige Spalten | Hinweis |
|---|---|---|
| `offline_measures` | id, organization_id, channel_id, campaign_id?, kind, title, vendor, cost_cents, print_run, location, start_date, end_date, tracking_code (eindeutig), discount_code?, target_url | |
| `qr_scans` | id, organization_id, offline_measure_id, scanned_at | keine IP, kein Gerät (DSGVO) |
| `expenses` | id, organization_id, campaign_id?, channel_id?, offline_measure_id?, amount_cents, spent_on, description | Ist-Ausgaben; Plan in `campaigns`/`campaign_channels` |
| `metrics` | id, organization_id, post_id? / offline_measure_id? (genau eins), measured_on, reach, interactions, clicks, leads, source (manual/import) | Zusammenfassung je Kampagne/Kanal über Views (`security_invoker`) |
| `monthly_reports` | id, organization_id, month, summary, data jsonb, created_at | |

## Phase 5 – Plattform
| Tabelle | Wichtige Spalten | Hinweis |
|---|---|---|
| `publish_jobs` | id, organization_id, post_id, run_at, attempts, status, last_error | von pg_cron abgearbeitet, ruft `PublishingProvider` auf |

## Rechte (RLS, Kurzfassung)
| Rolle | Lesen | Schreiben |
|---|---|---|
| owner | alles im Unternehmen | alles; einziger, der freigibt, Mitglieder verwaltet, exportiert/löscht |
| editor | alles im Unternehmen | Beiträge, Kampagnen, Assets, Kommentare; Status bis `in_review` |
| external | nur zugewiesene Beiträge (+ deren Kommentare/Assets) | Text der zugewiesenen Beiträge, Kommentare, Einreichen zur Freigabe |
| viewer | alles im Unternehmen | nichts |

Hilfsfunktionen: `is_member(org)`, `has_role(org, roles[])`, `can_see_post(post)` – `SECURITY DEFINER`, `STABLE`.

## Statusübergänge (`transition_post_status`)
`idea → draft → in_review → approved | changes_requested`; `changes_requested → draft | in_review`; `approved → scheduled` (braucht `scheduled_at`); `scheduled → approved` (zurücknehmen); `published`/`evaluated` setzt nur das System. Rückwärts zu `idea`/`draft` erlaubt, außer aus `published`/`evaluated`. `approved` nur durch owner. Jede Änderung eines freigegebenen Textes setzt den Status auf `draft` zurück.

## DSGVO
- `export_organization(org)` → JSON aller Tabellen + Liste der Storage-Dateien (nur owner).
- `delete_organization(org)` → Kaskadenlöschung + Storage-Ordner leeren (nur owner, mit Bestätigung).
