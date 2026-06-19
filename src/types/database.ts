export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      site_settings: {
        Row: {
          id: "global";
          chatbot_enabled: boolean;
          chatbot_provider: "openai" | "github";
          updated_at: string;
        };
        Insert: {
          id?: "global";
          chatbot_enabled?: boolean;
          chatbot_provider?: "openai" | "github";
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["site_settings"]["Insert"]>;
        Relationships: [];
      };
      admin_profiles: {
        Row: { id: string; user_id: string; email: string; created_at: string };
        Insert: { id?: string; user_id: string; email: string; created_at?: string };
        Update: { id?: string; user_id?: string; email?: string; created_at?: string };
        Relationships: [];
      };
      gallery_photos: {
        Row: {
          id: string;
          storage_path: string;
          public_url: string;
          alt_text: string;
          display_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          storage_path: string;
          public_url: string;
          alt_text: string;
          display_order?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["gallery_photos"]["Insert"]>;
        Relationships: [];
      };
      reservations: {
        Row: {
          id: string;
          title: string;
          guest_name: string | null;
          guest_phone: string | null;
          notes: string | null;
          party_size: number;
          status: "reserved" | "seated" | "completed" | "cancelled";
          starts_at: string;
          ends_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          guest_name?: string | null;
          guest_phone?: string | null;
          notes?: string | null;
          party_size: number;
          status?: "reserved" | "seated" | "completed" | "cancelled";
          starts_at: string;
          ends_at: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["reservations"]["Insert"]>;
        Relationships: [];
      };
      waiver_submissions: {
        Row: {
          id: string;
          full_name: string;
          phone: string;
          email: string | null;
          agreements: string[];
          signature: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          full_name: string;
          phone: string;
          email?: string | null;
          agreements: string[];
          signature: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["waiver_submissions"]["Insert"]>;
        Relationships: [];
      };
      contact_messages: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          phone: string | null;
          message: string;
          email_status: "pending" | "sent" | "failed";
          created_at: string;
        };
        Insert: {
          id?: string;
          full_name: string;
          email: string;
          phone?: string | null;
          message: string;
          email_status?: "pending" | "sent" | "failed";
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["contact_messages"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  };
};
