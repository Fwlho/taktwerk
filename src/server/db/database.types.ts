// Datenbanktypen. Wird ersetzt durch `npm run db:types`, sobald die lokale DB läuft.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type MemberRole = "owner" | "editor" | "external" | "viewer";
export type AddressForm = "du" | "sie";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          avatar_path: string | null;
          locale: string;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: { full_name?: string; avatar_path?: string | null; locale?: string };
        Relationships: [];
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: { name?: string };
        Relationships: [];
      };
      organization_profiles: {
        Row: {
          organization_id: string;
          industry: string | null;
          location: string | null;
          radius_km: number | null;
          website: string | null;
          target_audiences: string[];
          address_form: AddressForm;
          tone: string | null;
          services: string[];
          onboarding_completed_at: string | null;
          updated_at: string;
        };
        Insert: never;
        Update: {
          industry?: string | null;
          location?: string | null;
          radius_km?: number | null;
          website?: string | null;
          target_audiences?: string[];
          address_form?: AddressForm;
          tone?: string | null;
          services?: string[];
          onboarding_completed_at?: string | null;
        };
        Relationships: [];
      };
      memberships: {
        Row: {
          organization_id: string;
          user_id: string;
          role: MemberRole;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: { role?: MemberRole };
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
      invitations: {
        Row: {
          id: string;
          organization_id: string;
          email: string;
          role: MemberRole;
          token_hash: string;
          invited_by: string | null;
          expires_at: string;
          accepted_at: string | null;
          accepted_by: string | null;
          created_at: string;
        };
        Insert: {
          organization_id: string;
          email: string;
          role: MemberRole;
          token_hash: string;
          expires_at?: string;
        };
        Update: never;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      create_organization: { Args: { p_name: string; p_slug: string }; Returns: string };
      my_pending_invitations: {
        Args: Record<string, never>;
        Returns: { id: string; organization_name: string; role: MemberRole; expires_at: string }[];
      };
      accept_invitation: { Args: { p_token: string }; Returns: string };
      accept_invitation_by_id: { Args: { p_invitation_id: string }; Returns: string };
    };
    Enums: { member_role: MemberRole; address_form: AddressForm };
    CompositeTypes: { [_ in never]: never };
  };
};
