export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'admin' | 'manager' | 'machineman' | 'printer_operator' | 'laminator';

export type RollStatus = 'Active' | 'Finished';

export type JobStatus = 'Open' | 'In Progress' | 'Closed';

export type EntryStatus = 'Pending' | 'Approved' | 'Rejected';

export interface Database {
  public: {
    Tables: {
      rolls: {
        Row: {
          id: string;
          roll_number: string;
          size: string | null;
          type: string | null;
          brand: string | null;
          total_meter: number;
          remaining_meter: number;
          purchase_cost: number;
          cost_per_meter: number;
          status: RollStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          roll_number: string;
          size?: string | null;
          type?: string | null;
          brand?: string | null;
          total_meter: number;
          remaining_meter: number;
          purchase_cost: number;
          status?: RollStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          roll_number?: string;
          size?: string | null;
          type?: string | null;
          brand?: string | null;
          total_meter?: number;
          remaining_meter?: number;
          purchase_cost?: number;
          status?: RollStatus;
          created_at?: string;
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          role: UserRole;
          full_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role?: UserRole;
          full_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          role?: UserRole;
          full_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      settings: {
        Row: {
          id: string;
          approval_required: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          approval_required?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          approval_required?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      jobs: {
        Row: {
          id: string;
          job_number: string;
          client_name: string;
          description: string | null;
          selected_roll_id: string | null;
          status: JobStatus;
          total_material_cost: number;
          total_waste_cost: number;
          labor_cost: number;
          other_cost: number;
          final_cost: number;
          is_locked: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          job_number?: string;
          client_name: string;
          description?: string | null;
          selected_roll_id?: string | null;
          status?: JobStatus;
          total_material_cost?: number;
          total_waste_cost?: number;
          labor_cost?: number;
          other_cost?: number;
          final_cost?: number;
          is_locked?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          job_number?: string;
          client_name?: string;
          description?: string | null;
          selected_roll_id?: string | null;
          status?: JobStatus;
          total_material_cost?: number;
          total_waste_cost?: number;
          labor_cost?: number;
          other_cost?: number;
          final_cost?: number;
          is_locked?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      job_entries: {
        Row: {
          id: string;
          job_id: string;
          roll_id: string | null;
          custom_roll_size: string | null;
          user_id: string;
          role: string;
          meter_used: number;
          waste_meter: number;
          material_cost: number;
          waste_cost: number;
          status: EntryStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          job_id: string;
          roll_id?: string | null;
          custom_roll_size?: string | null;
          user_id: string;
          role: string;
          meter_used: number;
          waste_meter: number;
          material_cost?: number;
          waste_cost?: number;
          status?: EntryStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          job_id?: string;
          roll_id?: string | null;
          custom_roll_size?: string | null;
          user_id?: string;
          role?: string;
          meter_used?: number;
          waste_meter?: number;
          material_cost?: number;
          waste_cost?: number;
          status?: EntryStatus;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}
