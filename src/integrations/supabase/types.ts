export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      airlines: {
        Row: {
          code: string
          created_at: string
          logo_url: string | null
          name: string
          price_multiplier: number
        }
        Insert: {
          code: string
          created_at?: string
          logo_url?: string | null
          name: string
          price_multiplier?: number
        }
        Update: {
          code?: string
          created_at?: string
          logo_url?: string | null
          name?: string
          price_multiplier?: number
        }
        Relationships: []
      }
      airport_airlines: {
        Row: {
          airline_code: string
          airline_name: string | null
          airport_id: string
          id: string
          is_active: boolean
        }
        Insert: {
          airline_code: string
          airline_name?: string | null
          airport_id: string
          id?: string
          is_active?: boolean
        }
        Update: {
          airline_code?: string
          airline_name?: string | null
          airport_id?: string
          id?: string
          is_active?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "airport_airlines_airport_id_fkey"
            columns: ["airport_id"]
            isOneToOne: false
            referencedRelation: "airports"
            referencedColumns: ["id"]
          },
        ]
      }
      airport_routes: {
        Row: {
          destination_code: string
          distance_km: number
          duration_minutes: number
          id: string
          source_code: string
        }
        Insert: {
          destination_code: string
          distance_km: number
          duration_minutes: number
          id?: string
          source_code: string
        }
        Update: {
          destination_code?: string
          distance_km?: number
          duration_minutes?: number
          id?: string
          source_code?: string
        }
        Relationships: []
      }
      airport_services: {
        Row: {
          airport_id: string
          id: string
          is_available: boolean
          service_name: string
        }
        Insert: {
          airport_id: string
          id?: string
          is_available?: boolean
          service_name: string
        }
        Update: {
          airport_id?: string
          id?: string
          is_available?: boolean
          service_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "airport_services_airport_id_fkey"
            columns: ["airport_id"]
            isOneToOne: false
            referencedRelation: "airports"
            referencedColumns: ["id"]
          },
        ]
      }
      airports: {
        Row: {
          airport_name: string
          annual_passengers_million: number | null
          category: string
          city: string
          contact_email: string | null
          contact_phone: string | null
          country: string
          created_at: string
          description: string | null
          iata_code: string
          icao_code: string | null
          id: string
          image_url: string | null
          is_active: boolean
          latitude: number
          longitude: number
          operator: string | null
          state: string
          status: string
          total_gates: number | null
          total_runways: number | null
          total_terminals: number | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          airport_name: string
          annual_passengers_million?: number | null
          category?: string
          city: string
          contact_email?: string | null
          contact_phone?: string | null
          country?: string
          created_at?: string
          description?: string | null
          iata_code: string
          icao_code?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          latitude: number
          longitude: number
          operator?: string | null
          state: string
          status?: string
          total_gates?: number | null
          total_runways?: number | null
          total_terminals?: number | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          airport_name?: string
          annual_passengers_million?: number | null
          category?: string
          city?: string
          contact_email?: string | null
          contact_phone?: string | null
          country?: string
          created_at?: string
          description?: string | null
          iata_code?: string
          icao_code?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          latitude?: number
          longitude?: number
          operator?: string | null
          state?: string
          status?: string
          total_gates?: number | null
          total_runways?: number | null
          total_terminals?: number | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      boarding_passes: {
        Row: {
          boarding_group: string
          boarding_time: string
          booking_id: string
          cabin_class: string
          created_at: string
          flight_id: string
          gate_number: string | null
          passenger_name: string
          qr_data: string
          seat_number: string
          user_id: string
        }
        Insert: {
          boarding_group: string
          boarding_time: string
          booking_id: string
          cabin_class: string
          created_at?: string
          flight_id: string
          gate_number?: string | null
          passenger_name: string
          qr_data: string
          seat_number: string
          user_id: string
        }
        Update: {
          boarding_group?: string
          boarding_time?: string
          booking_id?: string
          cabin_class?: string
          created_at?: string
          flight_id?: string
          gate_number?: string | null
          passenger_name?: string
          qr_data?: string
          seat_number?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "boarding_passes_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "boarding_passes_flight_id_fkey"
            columns: ["flight_id"]
            isOneToOne: false
            referencedRelation: "flights"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          booking_id: string
          booking_status: string
          cabin_class: string
          created_at: string
          email: string
          flight_id: string
          passenger_age: number
          passenger_name: string
          passenger_passport_id: string
          passenger_phone: string
          seat_number: string
          total_amount: number
          user_id: string
        }
        Insert: {
          booking_id: string
          booking_status?: string
          cabin_class: string
          created_at?: string
          email: string
          flight_id: string
          passenger_age: number
          passenger_name: string
          passenger_passport_id: string
          passenger_phone: string
          seat_number: string
          total_amount: number
          user_id: string
        }
        Update: {
          booking_id?: string
          booking_status?: string
          cabin_class?: string
          created_at?: string
          email?: string
          flight_id?: string
          passenger_age?: number
          passenger_name?: string
          passenger_passport_id?: string
          passenger_phone?: string
          seat_number?: string
          total_amount?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_flight_id_fkey"
            columns: ["flight_id"]
            isOneToOne: false
            referencedRelation: "flights"
            referencedColumns: ["id"]
          },
        ]
      }
      flight_gate_assignments: {
        Row: {
          airport_code: string
          assigned_at: string
          flight_id: string
          gate_blocked_until: string
          gate_id: string
          gate_number: string
          id: string
          is_active: boolean
          terminal: string
        }
        Insert: {
          airport_code: string
          assigned_at?: string
          flight_id: string
          gate_blocked_until: string
          gate_id: string
          gate_number: string
          id?: string
          is_active?: boolean
          terminal: string
        }
        Update: {
          airport_code?: string
          assigned_at?: string
          flight_id?: string
          gate_blocked_until?: string
          gate_id?: string
          gate_number?: string
          id?: string
          is_active?: boolean
          terminal?: string
        }
        Relationships: [
          {
            foreignKeyName: "flight_gate_assignments_flight_id_fkey"
            columns: ["flight_id"]
            isOneToOne: false
            referencedRelation: "flights"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flight_gate_assignments_gate_id_fkey"
            columns: ["gate_id"]
            isOneToOne: false
            referencedRelation: "gates"
            referencedColumns: ["id"]
          },
        ]
      }
      flight_status_history: {
        Row: {
          changed_at: string
          changed_by: string
          current_status: string
          flight_id: string
          id: string
          previous_status: string | null
          reason: string | null
        }
        Insert: {
          changed_at?: string
          changed_by?: string
          current_status: string
          flight_id: string
          id?: string
          previous_status?: string | null
          reason?: string | null
        }
        Update: {
          changed_at?: string
          changed_by?: string
          current_status?: string
          flight_id?: string
          id?: string
          previous_status?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flight_status_history_flight_id_fkey"
            columns: ["flight_id"]
            isOneToOne: false
            referencedRelation: "flights"
            referencedColumns: ["id"]
          },
        ]
      }
      flights: {
        Row: {
          actual_arrival_time: string | null
          actual_departure_time: string | null
          aircraft_type: string
          airline_code: string
          arrival_datetime: string
          business_price: number
          created_at: string
          delay_minutes: number
          delay_reason: string | null
          departure_datetime: string
          destination_code: string
          duration_minutes: number
          economy_price: number
          first_class_price: number
          flight_number: string
          flight_status: string
          gate_number: string | null
          id: string
          is_visible_on_ui: boolean
          number_of_stops: number
          premium_economy_price: number
          source_code: string
          terminal: string | null
        }
        Insert: {
          actual_arrival_time?: string | null
          actual_departure_time?: string | null
          aircraft_type: string
          airline_code: string
          arrival_datetime: string
          business_price: number
          created_at?: string
          delay_minutes?: number
          delay_reason?: string | null
          departure_datetime: string
          destination_code: string
          duration_minutes: number
          economy_price: number
          first_class_price: number
          flight_number: string
          flight_status?: string
          gate_number?: string | null
          id?: string
          is_visible_on_ui?: boolean
          number_of_stops?: number
          premium_economy_price: number
          source_code: string
          terminal?: string | null
        }
        Update: {
          actual_arrival_time?: string | null
          actual_departure_time?: string | null
          aircraft_type?: string
          airline_code?: string
          arrival_datetime?: string
          business_price?: number
          created_at?: string
          delay_minutes?: number
          delay_reason?: string | null
          departure_datetime?: string
          destination_code?: string
          duration_minutes?: number
          economy_price?: number
          first_class_price?: number
          flight_number?: string
          flight_status?: string
          gate_number?: string | null
          id?: string
          is_visible_on_ui?: boolean
          number_of_stops?: number
          premium_economy_price?: number
          source_code?: string
          terminal?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flights_airline_code_fkey"
            columns: ["airline_code"]
            isOneToOne: false
            referencedRelation: "airlines"
            referencedColumns: ["code"]
          },
        ]
      }
      gates: {
        Row: {
          airport_code: string
          created_at: string
          gate_number: string
          id: string
          is_active: boolean
          terminal: string
        }
        Insert: {
          airport_code: string
          created_at?: string
          gate_number: string
          id?: string
          is_active?: boolean
          terminal: string
        }
        Update: {
          airport_code?: string
          created_at?: string
          gate_number?: string
          id?: string
          is_active?: boolean
          terminal?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_gate_for_flight: {
        Args: { p_flight_id: string }
        Returns: {
          gate_number: string
          terminal: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
