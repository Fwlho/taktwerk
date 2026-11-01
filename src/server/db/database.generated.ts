export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string;
          actor_id: string | null;
          changes: NonNullable<Json>;
          created_at: string;
          entity_id: string;
          entity_type: string;
          id: number;
          organization_id: string;
          post_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          action: string;
          actor_id?: string | null;
          changes?: NonNullable<Json>;
          created_at?: string;
          entity_id: string;
          entity_type: string;
          id?: never;
          organization_id: string;
          post_id?: string | null;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          changes?: NonNullable<Json>;
          created_at?: string;
          entity_id?: string;
          entity_type?: string;
          id?: never;
          organization_id?: string;
          post_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "activity_log_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_requests: {
        Row: {
          created_at: string;
          finished_at: string | null;
          id: string;
          input_tokens: number;
          kind: Database["public"]["Enums"]["ai_request_kind"];
          model: string | null;
          organization_id: string;
          output_tokens: number;
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          finished_at?: string | null;
          id?: string;
          input_tokens?: number;
          kind: Database["public"]["Enums"]["ai_request_kind"];
          model?: string | null;
          organization_id: string;
          output_tokens?: number;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          finished_at?: string | null;
          id?: string;
          input_tokens?: number;
          kind?: Database["public"]["Enums"]["ai_request_kind"];
          model?: string | null;
          organization_id?: string;
          output_tokens?: number;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ai_requests_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      approval_request_posts: {
        Row: {
          approval_request_id: string;
          organization_id: string;
          post_id: string;
        };
        ComputedFields: never;
        Insert: {
          approval_request_id: string;
          organization_id: string;
          post_id: string;
        };
        Update: {
          approval_request_id?: string;
          organization_id?: string;
          post_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "approval_request_posts_approval_request_id_organization_id_fkey";
            columns: ["approval_request_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "approval_requests";
            referencedColumns: ["id", "organization_id"];
          },
          {
            foreignKeyName: "approval_request_posts_post_id_organization_id_fkey";
            columns: ["post_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id", "organization_id"];
          },
        ];
      };
      approval_requests: {
        Row: {
          channel_id: string | null;
          closed_at: string | null;
          created_at: string;
          id: string;
          message: string | null;
          organization_id: string;
          requested_by: string | null;
          status: string;
          week_start: string;
        };
        ComputedFields: never;
        Insert: {
          channel_id?: string | null;
          closed_at?: string | null;
          created_at?: string;
          id?: string;
          message?: string | null;
          organization_id: string;
          requested_by?: string | null;
          status?: string;
          week_start: string;
        };
        Update: {
          channel_id?: string | null;
          closed_at?: string | null;
          created_at?: string;
          id?: string;
          message?: string | null;
          organization_id?: string;
          requested_by?: string | null;
          status?: string;
          week_start?: string;
        };
        Relationships: [
          {
            foreignKeyName: "approval_requests_channel_id_organization_id_fkey";
            columns: ["channel_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "channels";
            referencedColumns: ["id", "organization_id"];
          },
          {
            foreignKeyName: "approval_requests_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      approvals: {
        Row: {
          comment_id: string | null;
          decided_at: string;
          decided_by: string | null;
          decision: Database["public"]["Enums"]["approval_decision"];
          id: string;
          organization_id: string;
          post_id: string;
        };
        ComputedFields: never;
        Insert: {
          comment_id?: string | null;
          decided_at?: string;
          decided_by?: string | null;
          decision: Database["public"]["Enums"]["approval_decision"];
          id?: string;
          organization_id: string;
          post_id: string;
        };
        Update: {
          comment_id?: string | null;
          decided_at?: string;
          decided_by?: string | null;
          decision?: Database["public"]["Enums"]["approval_decision"];
          id?: string;
          organization_id?: string;
          post_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "approvals_comment_id_organization_id_fkey";
            columns: ["comment_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "comments";
            referencedColumns: ["id", "organization_id"];
          },
          {
            foreignKeyName: "approvals_post_id_organization_id_fkey";
            columns: ["post_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id", "organization_id"];
          },
        ];
      };
      assets: {
        Row: {
          alt_text: string | null;
          created_at: string;
          duration_s: number | null;
          file_name: string;
          height: number | null;
          id: string;
          kind: Database["public"]["Enums"]["asset_kind"];
          mime_type: string;
          organization_id: string;
          size_bytes: number;
          storage_path: string;
          uploaded_by: string | null;
          width: number | null;
        };
        ComputedFields: never;
        Insert: {
          alt_text?: string | null;
          created_at?: string;
          duration_s?: number | null;
          file_name: string;
          height?: number | null;
          id?: string;
          kind: Database["public"]["Enums"]["asset_kind"];
          mime_type: string;
          organization_id: string;
          size_bytes: number;
          storage_path: string;
          uploaded_by?: string | null;
          width?: number | null;
        };
        Update: {
          alt_text?: string | null;
          created_at?: string;
          duration_s?: number | null;
          file_name?: string;
          height?: number | null;
          id?: string;
          kind?: Database["public"]["Enums"]["asset_kind"];
          mime_type?: string;
          organization_id?: string;
          size_bytes?: number;
          storage_path?: string;
          uploaded_by?: string | null;
          width?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "assets_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      campaign_channels: {
        Row: {
          budget_planned_cents: number;
          campaign_id: string;
          channel_id: string;
          organization_id: string;
        };
        ComputedFields: never;
        Insert: {
          budget_planned_cents?: number;
          campaign_id: string;
          channel_id: string;
          organization_id: string;
        };
        Update: {
          budget_planned_cents?: number;
          campaign_id?: string;
          channel_id?: string;
          organization_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "campaign_channels_campaign_id_organization_id_fkey";
            columns: ["campaign_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id", "organization_id"];
          },
          {
            foreignKeyName: "campaign_channels_channel_id_organization_id_fkey";
            columns: ["channel_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "channels";
            referencedColumns: ["id", "organization_id"];
          },
        ];
      };
      campaigns: {
        Row: {
          budget_planned_cents: number;
          created_at: string;
          created_by: string | null;
          end_date: string | null;
          goal: Database["public"]["Enums"]["campaign_goal"];
          goal_description: string | null;
          goal_target: number | null;
          id: string;
          name: string;
          organization_id: string;
          start_date: string;
          status: Database["public"]["Enums"]["campaign_status"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          budget_planned_cents?: number;
          created_at?: string;
          created_by?: string | null;
          end_date?: string | null;
          goal?: Database["public"]["Enums"]["campaign_goal"];
          goal_description?: string | null;
          goal_target?: number | null;
          id?: string;
          name: string;
          organization_id: string;
          start_date: string;
          status?: Database["public"]["Enums"]["campaign_status"];
          updated_at?: string;
        };
        Update: {
          budget_planned_cents?: number;
          created_at?: string;
          created_by?: string | null;
          end_date?: string | null;
          goal?: Database["public"]["Enums"]["campaign_goal"];
          goal_description?: string | null;
          goal_target?: number | null;
          id?: string;
          name?: string;
          organization_id?: string;
          start_date?: string;
          status?: Database["public"]["Enums"]["campaign_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "campaigns_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      channel_credentials: {
        Row: {
          auth_tag: string;
          channel_id: string;
          ciphertext: string;
          expires_at: string | null;
          iv: string;
          organization_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          auth_tag: string;
          channel_id: string;
          ciphertext: string;
          expires_at?: string | null;
          iv: string;
          organization_id: string;
          updated_at?: string;
        };
        Update: {
          auth_tag?: string;
          channel_id?: string;
          ciphertext?: string;
          expires_at?: string | null;
          iv?: string;
          organization_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "channel_credentials_channel_id_organization_id_fkey";
            columns: ["channel_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "channels";
            referencedColumns: ["id", "organization_id"];
          },
        ];
      };
      channels: {
        Row: {
          connection_status: Database["public"]["Enums"]["connection_status"];
          created_at: string;
          external_account_name: string | null;
          id: string;
          name: string;
          organization_id: string;
          provider: string | null;
          type: Database["public"]["Enums"]["channel_type"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          connection_status?: Database["public"]["Enums"]["connection_status"];
          created_at?: string;
          external_account_name?: string | null;
          id?: string;
          name: string;
          organization_id: string;
          provider?: string | null;
          type: Database["public"]["Enums"]["channel_type"];
          updated_at?: string;
        };
        Update: {
          connection_status?: Database["public"]["Enums"]["connection_status"];
          created_at?: string;
          external_account_name?: string | null;
          id?: string;
          name?: string;
          organization_id?: string;
          provider?: string | null;
          type?: Database["public"]["Enums"]["channel_type"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "channels_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      comments: {
        Row: {
          author_id: string | null;
          body: string;
          created_at: string;
          edited_at: string | null;
          id: string;
          organization_id: string;
          post_id: string;
          quoted_text: string | null;
        };
        ComputedFields: never;
        Insert: {
          author_id?: string | null;
          body: string;
          created_at?: string;
          edited_at?: string | null;
          id?: string;
          organization_id: string;
          post_id: string;
          quoted_text?: string | null;
        };
        Update: {
          author_id?: string | null;
          body?: string;
          created_at?: string;
          edited_at?: string | null;
          id?: string;
          organization_id?: string;
          post_id?: string;
          quoted_text?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "comments_post_id_organization_id_fkey";
            columns: ["post_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id", "organization_id"];
          },
        ];
      };
      industry_templates: {
        Row: {
          content: NonNullable<Json>;
          goal: Database["public"]["Enums"]["campaign_goal"];
          id: string;
          industry: string;
          name: string;
        };
        ComputedFields: never;
        Insert: {
          content: NonNullable<Json>;
          goal: Database["public"]["Enums"]["campaign_goal"];
          id?: string;
          industry: string;
          name: string;
        };
        Update: {
          content?: NonNullable<Json>;
          goal?: Database["public"]["Enums"]["campaign_goal"];
          id?: string;
          industry?: string;
          name?: string;
        };
        Relationships: [];
      };
      invitations: {
        Row: {
          accepted_at: string | null;
          accepted_by: string | null;
          created_at: string;
          email: string;
          expires_at: string;
          id: string;
          invited_by: string | null;
          organization_id: string;
          role: Database["public"]["Enums"]["member_role"];
          token_hash: string;
        };
        ComputedFields: never;
        Insert: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          created_at?: string;
          email: string;
          expires_at?: string;
          id?: string;
          invited_by?: string | null;
          organization_id: string;
          role: Database["public"]["Enums"]["member_role"];
          token_hash: string;
        };
        Update: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          created_at?: string;
          email?: string;
          expires_at?: string;
          id?: string;
          invited_by?: string | null;
          organization_id?: string;
          role?: Database["public"]["Enums"]["member_role"];
          token_hash?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invitations_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      memberships: {
        Row: {
          created_at: string;
          organization_id: string;
          role: Database["public"]["Enums"]["member_role"];
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          organization_id: string;
          role: Database["public"]["Enums"]["member_role"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          organization_id?: string;
          role?: Database["public"]["Enums"]["member_role"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "memberships_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          created_at: string;
          id: string;
          organization_id: string;
          payload: NonNullable<Json>;
          pushed_at: string | null;
          read_at: string | null;
          type: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          organization_id: string;
          payload?: NonNullable<Json>;
          pushed_at?: string | null;
          read_at?: string | null;
          type: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          organization_id?: string;
          payload?: NonNullable<Json>;
          pushed_at?: string | null;
          read_at?: string | null;
          type?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      organization_profiles: {
        Row: {
          address_form: Database["public"]["Enums"]["address_form"];
          industry: string | null;
          location: string | null;
          onboarding_completed_at: string | null;
          organization_id: string;
          radius_km: number | null;
          services: string[];
          target_audiences: string[];
          tone: string | null;
          updated_at: string;
          website: string | null;
        };
        ComputedFields: never;
        Insert: {
          address_form?: Database["public"]["Enums"]["address_form"];
          industry?: string | null;
          location?: string | null;
          onboarding_completed_at?: string | null;
          organization_id: string;
          radius_km?: number | null;
          services?: string[];
          target_audiences?: string[];
          tone?: string | null;
          updated_at?: string;
          website?: string | null;
        };
        Update: {
          address_form?: Database["public"]["Enums"]["address_form"];
          industry?: string | null;
          location?: string | null;
          onboarding_completed_at?: string | null;
          organization_id?: string;
          radius_km?: number | null;
          services?: string[];
          target_audiences?: string[];
          tone?: string | null;
          updated_at?: string;
          website?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "organization_profiles_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: true;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      organizations: {
        Row: {
          ai_daily_limit: number;
          created_at: string;
          created_by: string | null;
          id: string;
          name: string;
          slug: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          ai_daily_limit?: number;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          name: string;
          slug: string;
          updated_at?: string;
        };
        Update: {
          ai_daily_limit?: number;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          name?: string;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      post_ai_prompts: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          kind: Database["public"]["Enums"]["ai_prompt_kind"];
          organization_id: string;
          position: number;
          post_id: string;
          prompt: string;
          result: string | null;
          result_at: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          kind?: Database["public"]["Enums"]["ai_prompt_kind"];
          organization_id: string;
          position?: number;
          post_id: string;
          prompt?: string;
          result?: string | null;
          result_at?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          kind?: Database["public"]["Enums"]["ai_prompt_kind"];
          organization_id?: string;
          position?: number;
          post_id?: string;
          prompt?: string;
          result?: string | null;
          result_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "post_ai_prompts_post_id_organization_id_fkey";
            columns: ["post_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id", "organization_id"];
          },
        ];
      };
      post_assets: {
        Row: {
          asset_id: string;
          organization_id: string;
          position: number;
          post_id: string;
        };
        ComputedFields: never;
        Insert: {
          asset_id: string;
          organization_id: string;
          position?: number;
          post_id: string;
        };
        Update: {
          asset_id?: string;
          organization_id?: string;
          position?: number;
          post_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "post_assets_asset_id_organization_id_fkey";
            columns: ["asset_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "assets";
            referencedColumns: ["id", "organization_id"];
          },
          {
            foreignKeyName: "post_assets_post_id_organization_id_fkey";
            columns: ["post_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id", "organization_id"];
          },
        ];
      };
      post_assignees: {
        Row: {
          created_at: string;
          organization_id: string;
          post_id: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          organization_id: string;
          post_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          organization_id?: string;
          post_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "post_assignees_organization_id_user_id_fkey";
            columns: ["organization_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "memberships";
            referencedColumns: ["organization_id", "user_id"];
          },
          {
            foreignKeyName: "post_assignees_post_id_organization_id_fkey";
            columns: ["post_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id", "organization_id"];
          },
        ];
      };
      post_groups: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          organization_id: string;
          title: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          organization_id: string;
          title?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          organization_id?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "post_groups_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      posts: {
        Row: {
          body: string;
          campaign_id: string | null;
          channel_id: string;
          created_at: string;
          created_by: string | null;
          external_post_id: string | null;
          group_id: string | null;
          id: string;
          internal_notes: string | null;
          organization_id: string;
          planned_on: string | null;
          publish_error: string | null;
          published_at: string | null;
          scheduled_at: string | null;
          status: Database["public"]["Enums"]["post_status"];
          title: string;
          updated_at: string;
          updated_by: string | null;
          version: number;
        };
        ComputedFields: never;
        Insert: {
          body?: string;
          campaign_id?: string | null;
          channel_id: string;
          created_at?: string;
          created_by?: string | null;
          external_post_id?: string | null;
          group_id?: string | null;
          id?: string;
          internal_notes?: string | null;
          organization_id: string;
          planned_on?: string | null;
          publish_error?: string | null;
          published_at?: string | null;
          scheduled_at?: string | null;
          status?: Database["public"]["Enums"]["post_status"];
          title?: string;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Update: {
          body?: string;
          campaign_id?: string | null;
          channel_id?: string;
          created_at?: string;
          created_by?: string | null;
          external_post_id?: string | null;
          group_id?: string | null;
          id?: string;
          internal_notes?: string | null;
          organization_id?: string;
          planned_on?: string | null;
          publish_error?: string | null;
          published_at?: string | null;
          scheduled_at?: string | null;
          status?: Database["public"]["Enums"]["post_status"];
          title?: string;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "posts_campaign_id_organization_id_fkey";
            columns: ["campaign_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id", "organization_id"];
          },
          {
            foreignKeyName: "posts_channel_id_organization_id_fkey";
            columns: ["channel_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "channels";
            referencedColumns: ["id", "organization_id"];
          },
          {
            foreignKeyName: "posts_group_id_organization_id_fkey";
            columns: ["group_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "post_groups";
            referencedColumns: ["id", "organization_id"];
          },
          {
            foreignKeyName: "posts_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_path: string | null;
          created_at: string;
          full_name: string;
          id: string;
          locale: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          avatar_path?: string | null;
          created_at?: string;
          full_name?: string;
          id: string;
          locale?: string;
          updated_at?: string;
        };
        Update: {
          avatar_path?: string | null;
          created_at?: string;
          full_name?: string;
          id?: string;
          locale?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      prompt_templates: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          kind: Database["public"]["Enums"]["ai_prompt_kind"];
          name: string;
          organization_id: string;
          prompt: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          kind?: Database["public"]["Enums"]["ai_prompt_kind"];
          name: string;
          organization_id: string;
          prompt: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          kind?: Database["public"]["Enums"]["ai_prompt_kind"];
          name?: string;
          organization_id?: string;
          prompt?: string;
        };
        Relationships: [
          {
            foreignKeyName: "prompt_templates_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      push_subscriptions: {
        Row: {
          auth: string;
          created_at: string;
          endpoint: string;
          id: string;
          p256dh: string;
          user_agent: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          auth: string;
          created_at?: string;
          endpoint: string;
          id?: string;
          p256dh: string;
          user_agent?: string | null;
          user_id?: string;
        };
        Update: {
          auth?: string;
          created_at?: string;
          endpoint?: string;
          id?: string;
          p256dh?: string;
          user_agent?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      user_preferences: {
        Row: {
          key: string;
          organization_id: string;
          updated_at: string;
          user_id: string;
          value: NonNullable<Json>;
        };
        ComputedFields: never;
        Insert: {
          key: string;
          organization_id: string;
          updated_at?: string;
          user_id?: string;
          value: NonNullable<Json>;
        };
        Update: {
          key?: string;
          organization_id?: string;
          updated_at?: string;
          user_id?: string;
          value?: NonNullable<Json>;
        };
        Relationships: [
          {
            foreignKeyName: "user_preferences_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      week_template_slots: {
        Row: {
          channel_id: string;
          id: string;
          notes: string | null;
          organization_id: string;
          position: number;
          prompts: NonNullable<Json>;
          time_of_day: string | null;
          title: string;
          week_template_id: string;
          weekday: number;
        };
        ComputedFields: never;
        Insert: {
          channel_id: string;
          id?: string;
          notes?: string | null;
          organization_id: string;
          position?: number;
          prompts?: NonNullable<Json>;
          time_of_day?: string | null;
          title?: string;
          week_template_id: string;
          weekday: number;
        };
        Update: {
          channel_id?: string;
          id?: string;
          notes?: string | null;
          organization_id?: string;
          position?: number;
          prompts?: NonNullable<Json>;
          time_of_day?: string | null;
          title?: string;
          week_template_id?: string;
          weekday?: number;
        };
        Relationships: [
          {
            foreignKeyName: "week_template_slots_channel_id_organization_id_fkey";
            columns: ["channel_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "channels";
            referencedColumns: ["id", "organization_id"];
          },
          {
            foreignKeyName: "week_template_slots_week_template_id_organization_id_fkey";
            columns: ["week_template_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "week_templates";
            referencedColumns: ["id", "organization_id"];
          },
        ];
      };
      week_templates: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          is_default: boolean;
          name: string;
          organization_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          is_default?: boolean;
          name: string;
          organization_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          is_default?: boolean;
          name?: string;
          organization_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "week_templates_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      accept_invitation: { Args: { p_token: string }; Returns: string };
      accept_invitation_by_id: {
        Args: { p_invitation_id: string };
        Returns: string;
      };
      ai_usage_today: {
        Args: { p_org: string };
        Returns: {
          daily_limit: number;
          used: number;
        }[];
      };
      apply_week_template: {
        Args: { p_template: string; p_week_start: string };
        Returns: number;
      };
      approve_week: {
        Args: { p_comment?: string; p_request: string };
        Returns: number;
      };
      begin_ai_request: {
        Args: {
          p_kind: Database["public"]["Enums"]["ai_request_kind"];
          p_org: string;
        };
        Returns: string;
      };
      copy_week: {
        Args: {
          p_channel?: string;
          p_from: string;
          p_org: string;
          p_to: string;
        };
        Returns: number;
      };
      create_organization: {
        Args: { p_name: string; p_slug: string };
        Returns: string;
      };
      finish_ai_request: {
        Args: {
          p_id: string;
          p_input: number;
          p_model: string;
          p_output: number;
        };
        Returns: undefined;
      };
      my_pending_invitations: {
        Args: Record<PropertyKey, never>;
        Returns: {
          expires_at: string;
          id: string;
          organization_name: string;
          role: Database["public"]["Enums"]["member_role"];
        }[];
      };
      save_week_as_template: {
        Args: {
          p_default?: boolean;
          p_name: string;
          p_org: string;
          p_week_start: string;
        };
        Returns: string;
      };
      submit_week_for_approval: {
        Args: {
          p_channel?: string;
          p_message?: string;
          p_org: string;
          p_week_start: string;
        };
        Returns: string;
      };
      transition_post_status: {
        Args: {
          p_comment?: string;
          p_post_id: string;
          p_to: Database["public"]["Enums"]["post_status"];
        };
        Returns: {
          body: string;
          campaign_id: string | null;
          channel_id: string;
          created_at: string;
          created_by: string | null;
          external_post_id: string | null;
          group_id: string | null;
          id: string;
          internal_notes: string | null;
          organization_id: string;
          planned_on: string | null;
          publish_error: string | null;
          published_at: string | null;
          scheduled_at: string | null;
          status: Database["public"]["Enums"]["post_status"];
          title: string;
          updated_at: string;
          updated_by: string | null;
          version: number;
        };
        SetofOptions: {
          from: "*";
          to: "posts";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      transition_posts_status: {
        Args: {
          p_comment?: string;
          p_post_ids: string[];
          p_to: Database["public"]["Enums"]["post_status"];
        };
        Returns: {
          body: string;
          campaign_id: string | null;
          channel_id: string;
          created_at: string;
          created_by: string | null;
          external_post_id: string | null;
          group_id: string | null;
          id: string;
          internal_notes: string | null;
          organization_id: string;
          planned_on: string | null;
          publish_error: string | null;
          published_at: string | null;
          scheduled_at: string | null;
          status: Database["public"]["Enums"]["post_status"];
          title: string;
          updated_at: string;
          updated_by: string | null;
          version: number;
        }[];
        SetofOptions: {
          from: "*";
          to: "posts";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
    };
    Enums: {
      address_form: "du" | "sie";
      ai_prompt_kind: "text" | "image" | "video" | "caption";
      ai_request_kind: "text" | "adapt" | "prompt" | "ideas" | "campaign";
      approval_decision: "approved" | "changes_requested";
      asset_kind: "image" | "video" | "logo" | "document";
      campaign_goal:
        "inquiries" | "recruiting" | "awareness" | "event" | "other";
      campaign_status: "draft" | "running" | "paused" | "completed";
      channel_type:
        | "instagram"
        | "facebook"
        | "youtube"
        | "linkedin"
        | "tiktok"
        | "offline";
      connection_status: "not_connected" | "connected" | "expired" | "error";
      member_role: "owner" | "editor" | "external" | "viewer";
      offline_kind:
        "flyer" | "poster" | "vehicle" | "fair" | "print_ad" | "other";
      post_status:
        | "idea"
        | "draft"
        | "in_review"
        | "changes_requested"
        | "approved"
        | "scheduled"
        | "published"
        | "evaluated";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      address_form: ["du", "sie"],
      ai_prompt_kind: ["text", "image", "video", "caption"],
      ai_request_kind: ["text", "adapt", "prompt", "ideas", "campaign"],
      approval_decision: ["approved", "changes_requested"],
      asset_kind: ["image", "video", "logo", "document"],
      campaign_goal: ["inquiries", "recruiting", "awareness", "event", "other"],
      campaign_status: ["draft", "running", "paused", "completed"],
      channel_type: [
        "instagram",
        "facebook",
        "youtube",
        "linkedin",
        "tiktok",
        "offline",
      ],
      connection_status: ["not_connected", "connected", "expired", "error"],
      member_role: ["owner", "editor", "external", "viewer"],
      offline_kind: ["flyer", "poster", "vehicle", "fair", "print_ad", "other"],
      post_status: [
        "idea",
        "draft",
        "in_review",
        "changes_requested",
        "approved",
        "scheduled",
        "published",
        "evaluated",
      ],
    },
  },
} as const;
