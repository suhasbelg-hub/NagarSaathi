export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          name: string;
          email: string;
          role: "citizen" | "staff" | "contractor" | "admin";
          confirmed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          email: string;
          role?: "citizen" | "staff" | "contractor" | "admin";
          confirmed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          role?: "citizen" | "staff" | "contractor" | "admin";
          confirmed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          name: string;
          description: string;
        };
        Insert: {
          id: string;
          name: string;
          description?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
        };
      };
      zones: {
        Row: {
          name: string;
        };
        Insert: {
          name: string;
        };
        Update: {
          name?: string;
        };
      };
      contractor_profiles: {
        Row: {
          id: string;
          user_id: string;
          business_name: string;
          license_number: string;
          trade_category_id: string;
          preferred_zones: string[];
          status: "pending" | "approved" | "rejected";
          rejection_reason: string | null;
          approved_by: string | null;
          approved_at: string | null;
          submitted_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          user_id: string;
          business_name: string;
          license_number: string;
          trade_category_id: string;
          preferred_zones: string[];
          status?: "pending" | "approved" | "rejected";
          rejection_reason?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          submitted_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          business_name?: string;
          license_number?: string;
          trade_category_id?: string;
          preferred_zones?: string[];
          status?: "pending" | "approved" | "rejected";
          rejection_reason?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          submitted_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      grievances: {
        Row: {
          id: string;
          reference_number: string | null;
          citizen_id: string;
          category_id: string;
          zone: string;
          description: string;
          photos: Json;
          status: "filed" | "triaged" | "assigned" | "in_progress" | "resolved";
          priority: "low" | "medium" | "high" | "critical" | null;
          assigned_contractor_id: string | null;
          resolution: Json | null;
          created_at: string;
          updated_at: string;
          resolved_at: string | null;
        };
        Insert: {
          id: string;
          reference_number?: string | null;
          citizen_id: string;
          category_id: string;
          zone: string;
          description: string;
          photos?: Json;
          status?: "filed" | "triaged" | "assigned" | "in_progress" | "resolved";
          priority?: "low" | "medium" | "high" | "critical" | null;
          assigned_contractor_id?: string | null;
          resolution?: Json | null;
          created_at?: string;
          updated_at?: string;
          resolved_at?: string | null;
        };
        Update: {
          id?: string;
          reference_number?: string | null;
          citizen_id?: string;
          category_id?: string;
          zone?: string;
          description?: string;
          photos?: Json;
          status?: "filed" | "triaged" | "assigned" | "in_progress" | "resolved";
          priority?: "low" | "medium" | "high" | "critical" | null;
          assigned_contractor_id?: string | null;
          resolution?: Json | null;
          created_at?: string;
          updated_at?: string;
          resolved_at?: string | null;
        };
      };
      contractor_bids: {
        Row: {
          id: string;
          contractor_id: string;
          grievance_id: string;
          bid_notes: string;
          status: "submitted" | "awarded" | "rejected";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          contractor_id: string;
          grievance_id: string;
          bid_notes: string;
          status?: "submitted" | "awarded" | "rejected";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          contractor_id?: string;
          grievance_id?: string;
          bid_notes?: string;
          status?: "submitted" | "awarded" | "rejected";
          created_at?: string;
          updated_at?: string;
        };
      };
      status_history: {
        Row: {
          id: string;
          grievance_id: string;
          status: "filed" | "triaged" | "assigned" | "in_progress" | "resolved";
          updated_by: string;
          actor_name: string;
          actor_role: "citizen" | "staff" | "contractor" | "admin";
          notes: string;
          timestamp: string;
        };
        Insert: {
          id: string;
          grievance_id: string;
          status: "filed" | "triaged" | "assigned" | "in_progress" | "resolved";
          updated_by: string;
          actor_name: string;
          actor_role: "citizen" | "staff" | "contractor" | "admin";
          notes?: string;
          timestamp?: string;
        };
        Update: {
          id?: string;
          grievance_id?: string;
          status?: "filed" | "triaged" | "assigned" | "in_progress" | "resolved";
          updated_by?: string;
          actor_name?: string;
          actor_role?: "citizen" | "staff" | "contractor" | "admin";
          notes?: string;
          timestamp?: string;
        };
      };
      work_orders: {
        Row: {
          id: string;
          grievance_id: string;
          contractor_id: string;
          bid_id: string | null;
          status: string;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          grievance_id: string;
          contractor_id: string;
          bid_id?: string | null;
          status?: string;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          grievance_id?: string;
          contractor_id?: string;
          bid_id?: string | null;
          status?: string;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
        };
      };
    };
  };
}
