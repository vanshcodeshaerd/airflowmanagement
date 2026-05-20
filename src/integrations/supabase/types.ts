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
      admin_actions: {
        Row: {
          action_type: string
          admin_id: string
          created_at: string
          id: string
          new_value: Json | null
          notes: string | null
          previous_value: Json | null
          reason: string | null
          target_id: string
          target_table: string
        }
        Insert: {
          action_type: string
          admin_id: string
          created_at?: string
          id?: string
          new_value?: Json | null
          notes?: string | null
          previous_value?: Json | null
          reason?: string | null
          target_id: string
          target_table: string
        }
        Update: {
          action_type?: string
          admin_id?: string
          created_at?: string
          id?: string
          new_value?: Json | null
          notes?: string | null
          previous_value?: Json | null
          reason?: string | null
          target_id?: string
          target_table?: string
        }
        Relationships: []
      }
      aircraft_model: {
        Row: {
          aircraft_type: string | null
          airline_name: string
          business_price: number | null
          business_seats: number | null
          economy_price: number | null
          economy_seats: number | null
          first_class_price: number | null
          first_class_seats: number | null
          iata_airline_code: string | null
          model_id: string
          seating_capacity: number
        }
        Insert: {
          aircraft_type?: string | null
          airline_name: string
          business_price?: number | null
          business_seats?: number | null
          economy_price?: number | null
          economy_seats?: number | null
          first_class_price?: number | null
          first_class_seats?: number | null
          iata_airline_code?: string | null
          model_id: string
          seating_capacity: number
        }
        Update: {
          aircraft_type?: string | null
          airline_name?: string
          business_price?: number | null
          business_seats?: number | null
          economy_price?: number | null
          economy_seats?: number | null
          first_class_price?: number | null
          first_class_seats?: number | null
          iata_airline_code?: string | null
          model_id?: string
          seating_capacity?: number
        }
        Relationships: []
      }
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
          location_id: string | null
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
          location_id?: string | null
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
          location_id?: string | null
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
      baggage: {
        Row: {
          baggage_status: string | null
          baggage_type: string | null
          created_at: string
          flight_number: string | null
          tag_id: string
          ticket_number: string
          weight: number | null
        }
        Insert: {
          baggage_status?: string | null
          baggage_type?: string | null
          created_at?: string
          flight_number?: string | null
          tag_id: string
          ticket_number: string
          weight?: number | null
        }
        Update: {
          baggage_status?: string | null
          baggage_type?: string | null
          created_at?: string
          flight_number?: string | null
          tag_id?: string
          ticket_number?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "baggage_ticket_number_fkey"
            columns: ["ticket_number"]
            isOneToOne: false
            referencedRelation: "passenger"
            referencedColumns: ["ticket_number"]
          },
        ]
      }
      boarding_pass_updates: {
        Row: {
          booking_id: string
          id: string
          new_value: string | null
          notified_passenger: boolean
          old_value: string | null
          update_description: string | null
          update_type: string
          updated_at: string
        }
        Insert: {
          booking_id: string
          id?: string
          new_value?: string | null
          notified_passenger?: boolean
          old_value?: string | null
          update_description?: string | null
          update_type: string
          updated_at?: string
        }
        Update: {
          booking_id?: string
          id?: string
          new_value?: string | null
          notified_passenger?: boolean
          old_value?: string | null
          update_description?: string | null
          update_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      boarding_passes: {
        Row: {
          arrival_time: string | null
          boarding_group: string
          boarding_time: string
          booking_id: string
          cabin_class: string
          created_at: string
          departure_time: string | null
          flight_id: string
          gate_number: string | null
          invalidation_reason: string | null
          is_updated: boolean
          is_valid: boolean
          passenger_name: string
          qr_data: string
          seat_number: string
          update_reason: string | null
          user_id: string
        }
        Insert: {
          arrival_time?: string | null
          boarding_group: string
          boarding_time: string
          booking_id: string
          cabin_class: string
          created_at?: string
          departure_time?: string | null
          flight_id: string
          gate_number?: string | null
          invalidation_reason?: string | null
          is_updated?: boolean
          is_valid?: boolean
          passenger_name: string
          qr_data: string
          seat_number: string
          update_reason?: string | null
          user_id: string
        }
        Update: {
          arrival_time?: string | null
          boarding_group?: string
          boarding_time?: string
          booking_id?: string
          cabin_class?: string
          created_at?: string
          departure_time?: string | null
          flight_id?: string
          gate_number?: string | null
          invalidation_reason?: string | null
          is_updated?: boolean
          is_valid?: boolean
          passenger_name?: string
          qr_data?: string
          seat_number?: string
          update_reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "boarding_passes_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "booking"
            referencedColumns: ["booking_id"]
          },
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
          cancellation_reason: string | null
          cancelled_at: string | null
          created_at: string
          email: string
          flight_id: string
          passenger_age: number
          passenger_name: string
          passenger_passport_id: string
          passenger_phone: string
          refund_ref_id: string | null
          seat_number: string
          total_amount: number
          user_id: string
        }
        Insert: {
          booking_id: string
          booking_status?: string
          cabin_class: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          email: string
          flight_id: string
          passenger_age: number
          passenger_name: string
          passenger_passport_id: string
          passenger_phone: string
          refund_ref_id?: string | null
          seat_number: string
          total_amount: number
          user_id: string
        }
        Update: {
          booking_id?: string
          booking_status?: string
          cabin_class?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          email?: string
          flight_id?: string
          passenger_age?: number
          passenger_name?: string
          passenger_passport_id?: string
          passenger_phone?: string
          refund_ref_id?: string | null
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
      check_in: {
        Row: {
          boarding_pass_issued: boolean | null
          checkin_id: string
          checkin_method: string | null
          checkin_status: string | null
          created_at: string
          flight_number: string | null
          seat_confirmed: string | null
          ticket_number: string
        }
        Insert: {
          boarding_pass_issued?: boolean | null
          checkin_id: string
          checkin_method?: string | null
          checkin_status?: string | null
          created_at?: string
          flight_number?: string | null
          seat_confirmed?: string | null
          ticket_number: string
        }
        Update: {
          boarding_pass_issued?: boolean | null
          checkin_id?: string
          checkin_method?: string | null
          checkin_status?: string | null
          created_at?: string
          flight_number?: string | null
          seat_confirmed?: string | null
          ticket_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "check_in_ticket_number_fkey"
            columns: ["ticket_number"]
            isOneToOne: false
            referencedRelation: "passenger"
            referencedColumns: ["ticket_number"]
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
      flight_stops: {
        Row: {
          flight_number: string
          stop_location: string
          stop_number: number
        }
        Insert: {
          flight_number: string
          stop_location: string
          stop_number: number
        }
        Update: {
          flight_number?: string
          stop_location?: string
          stop_number?: number
        }
        Relationships: []
      }
      flights: {
        Row: {
          actual_arrival_time: string | null
          actual_departure_time: string | null
          aircraft_type: string
          airline_code: string
          arrival_datetime: string
          business_price: number
          cancellation_reason: string | null
          cancelled_at: string | null
          created_at: string
          delay_minutes: number
          delay_reason: string | null
          departure_datetime: string
          destination_code: string
          destination_location_id: string | null
          duration_minutes: number
          economy_price: number
          first_class_price: number
          flight_number: string
          flight_status: string
          gate_number: string | null
          id: string
          is_active: boolean
          is_bookable: boolean
          is_visible_on_ui: boolean
          model_id: string | null
          number_of_stops: number
          origin_location_id: string | null
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
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          delay_minutes?: number
          delay_reason?: string | null
          departure_datetime: string
          destination_code: string
          destination_location_id?: string | null
          duration_minutes: number
          economy_price: number
          first_class_price: number
          flight_number: string
          flight_status?: string
          gate_number?: string | null
          id?: string
          is_active?: boolean
          is_bookable?: boolean
          is_visible_on_ui?: boolean
          model_id?: string | null
          number_of_stops?: number
          origin_location_id?: string | null
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
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          delay_minutes?: number
          delay_reason?: string | null
          departure_datetime?: string
          destination_code?: string
          destination_location_id?: string | null
          duration_minutes?: number
          economy_price?: number
          first_class_price?: number
          flight_number?: string
          flight_status?: string
          gate_number?: string | null
          id?: string
          is_active?: boolean
          is_bookable?: boolean
          is_visible_on_ui?: boolean
          model_id?: string | null
          number_of_stops?: number
          origin_location_id?: string | null
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
          max_aircraft_size: string | null
          terminal: string
          terminal_number: string | null
        }
        Insert: {
          airport_code: string
          created_at?: string
          gate_number: string
          id?: string
          is_active?: boolean
          max_aircraft_size?: string | null
          terminal: string
          terminal_number?: string | null
        }
        Update: {
          airport_code?: string
          created_at?: string
          gate_number?: string
          id?: string
          is_active?: boolean
          max_aircraft_size?: string | null
          terminal?: string
          terminal_number?: string | null
        }
        Relationships: []
      }
      location: {
        Row: {
          airport_name: string | null
          annual_pax_mn: number | null
          category: string | null
          city: string
          country: string
          created_at: string
          iata_code: string | null
          is_active: boolean
          latitude: number | null
          location_id: string
          longitude: number | null
          operator: string | null
          state: string
          total_gates: number | null
        }
        Insert: {
          airport_name?: string | null
          annual_pax_mn?: number | null
          category?: string | null
          city: string
          country?: string
          created_at?: string
          iata_code?: string | null
          is_active?: boolean
          latitude?: number | null
          location_id: string
          longitude?: number | null
          operator?: string | null
          state: string
          total_gates?: number | null
        }
        Update: {
          airport_name?: string | null
          annual_pax_mn?: number | null
          category?: string | null
          city?: string
          country?: string
          created_at?: string
          iata_code?: string | null
          is_active?: boolean
          latitude?: number | null
          location_id?: string
          longitude?: number | null
          operator?: string | null
          state?: string
          total_gates?: number | null
        }
        Relationships: []
      }
      passenger: {
        Row: {
          age: number | null
          contact_info: string | null
          created_at: string
          email: string | null
          is_active: boolean
          nationality: string | null
          passenger_name: string
          passport_id: string | null
          ticket_number: string
          user_id: string | null
        }
        Insert: {
          age?: number | null
          contact_info?: string | null
          created_at?: string
          email?: string | null
          is_active?: boolean
          nationality?: string | null
          passenger_name: string
          passport_id?: string | null
          ticket_number: string
          user_id?: string | null
        }
        Update: {
          age?: number | null
          contact_info?: string | null
          created_at?: string
          email?: string | null
          is_active?: boolean
          nationality?: string | null
          passenger_name?: string
          passport_id?: string | null
          ticket_number?: string
          user_id?: string | null
        }
        Relationships: []
      }
      passenger_notifications: {
        Row: {
          booking_id: string | null
          flight_id: string | null
          id: string
          is_read: boolean
          message: string
          notification_type: string
          read_at: string | null
          sent_at: string
          title: string
          user_id: string
        }
        Insert: {
          booking_id?: string | null
          flight_id?: string | null
          id?: string
          is_read?: boolean
          message: string
          notification_type: string
          read_at?: string | null
          sent_at?: string
          title: string
          user_id: string
        }
        Update: {
          booking_id?: string | null
          flight_id?: string | null
          id?: string
          is_read?: boolean
          message?: string
          notification_type?: string
          read_at?: string | null
          sent_at?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      payment: {
        Row: {
          amount: number
          booking_id: string | null
          gateway_upi_id: string | null
          payment_id: string
          payment_method: string
          payment_status: string
          payment_timestamp: string
          remarks: string | null
          ticket_number: string
          transaction_reference: string | null
          transaction_status: string | null
          updated_at: string | null
          user_upi_id: string | null
        }
        Insert: {
          amount: number
          booking_id?: string | null
          gateway_upi_id?: string | null
          payment_id: string
          payment_method: string
          payment_status: string
          payment_timestamp?: string
          remarks?: string | null
          ticket_number: string
          transaction_reference?: string | null
          transaction_status?: string | null
          updated_at?: string | null
          user_upi_id?: string | null
        }
        Update: {
          amount?: number
          booking_id?: string | null
          gateway_upi_id?: string | null
          payment_id?: string
          payment_method?: string
          payment_status?: string
          payment_timestamp?: string
          remarks?: string | null
          ticket_number?: string
          transaction_reference?: string | null
          transaction_status?: string | null
          updated_at?: string | null
          user_upi_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_ticket_number_fkey"
            columns: ["ticket_number"]
            isOneToOne: false
            referencedRelation: "passenger"
            referencedColumns: ["ticket_number"]
          },
        ]
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
      refund_records: {
        Row: {
          admin_notes: string | null
          approved_at: string | null
          approved_by: string | null
          booking_id: string
          flight_id: string | null
          flight_number: string | null
          id: string
          initiated_at: string
          initiated_by: string | null
          is_active: boolean | null
          is_auto_refund: boolean | null
          processed_at: string | null
          refund_amount: number
          refund_reason: string | null
          refund_request_id: string | null
          refund_to_upi: string | null
          refund_type: string
          rejected_at: string | null
          rejection_reason: string | null
          request_booking_id: string | null
          request_email: string | null
          request_txn_id: string | null
          requested_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          booking_id: string
          flight_id?: string | null
          flight_number?: string | null
          id?: string
          initiated_at?: string
          initiated_by?: string | null
          is_active?: boolean | null
          is_auto_refund?: boolean | null
          processed_at?: string | null
          refund_amount: number
          refund_reason?: string | null
          refund_request_id?: string | null
          refund_to_upi?: string | null
          refund_type?: string
          rejected_at?: string | null
          rejection_reason?: string | null
          request_booking_id?: string | null
          request_email?: string | null
          request_txn_id?: string | null
          requested_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          booking_id?: string
          flight_id?: string | null
          flight_number?: string | null
          id?: string
          initiated_at?: string
          initiated_by?: string | null
          is_active?: boolean | null
          is_auto_refund?: boolean | null
          processed_at?: string | null
          refund_amount?: number
          refund_reason?: string | null
          refund_request_id?: string | null
          refund_to_upi?: string | null
          refund_type?: string
          rejected_at?: string | null
          rejection_reason?: string | null
          request_booking_id?: string | null
          request_email?: string | null
          request_txn_id?: string | null
          requested_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      terminal: {
        Row: {
          capacity: number | null
          location_id: string
          terminal_name: string
          terminal_number: string
        }
        Insert: {
          capacity?: number | null
          location_id: string
          terminal_name: string
          terminal_number: string
        }
        Update: {
          capacity?: number | null
          location_id?: string
          terminal_name?: string
          terminal_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "terminal_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "location"
            referencedColumns: ["location_id"]
          },
        ]
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
      booking: {
        Row: {
          amount_paid: number | null
          booking_id: string | null
          booking_status: string | null
          cabin_class: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          created_at: string | null
          email: string | null
          flight_id: string | null
          passenger_age: number | null
          passenger_name: string | null
          passenger_passport_id: string | null
          passenger_phone: string | null
          seat_number: string | null
          user_id: string | null
        }
        Insert: {
          amount_paid?: number | null
          booking_id?: string | null
          booking_status?: string | null
          cabin_class?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          email?: string | null
          flight_id?: string | null
          passenger_age?: number | null
          passenger_name?: string | null
          passenger_passport_id?: string | null
          passenger_phone?: string | null
          seat_number?: string | null
          user_id?: string | null
        }
        Update: {
          amount_paid?: number | null
          booking_id?: string | null
          booking_status?: string | null
          cabin_class?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          email?: string | null
          flight_id?: string | null
          passenger_age?: number | null
          passenger_name?: string | null
          passenger_passport_id?: string | null
          passenger_phone?: string | null
          seat_number?: string | null
          user_id?: string | null
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
      flight: {
        Row: {
          aircraft_type: string | null
          airline_code: string | null
          arrival_datetime: string | null
          business_price: number | null
          delay_minutes: number | null
          delay_reason: string | null
          departure_datetime: string | null
          destination_code: string | null
          destination_location_id: string | null
          duration_minutes: number | null
          economy_price: number | null
          first_class_price: number | null
          flight_date: string | null
          flight_number: string | null
          gate_number: string | null
          is_bookable: boolean | null
          is_visible_on_ui: boolean | null
          model_id: string | null
          origin_location_id: string | null
          source_code: string | null
          status: string | null
          terminal: string | null
        }
        Insert: {
          aircraft_type?: string | null
          airline_code?: string | null
          arrival_datetime?: string | null
          business_price?: number | null
          delay_minutes?: number | null
          delay_reason?: string | null
          departure_datetime?: string | null
          destination_code?: string | null
          destination_location_id?: string | null
          duration_minutes?: number | null
          economy_price?: number | null
          first_class_price?: number | null
          flight_date?: string | null
          flight_number?: string | null
          gate_number?: string | null
          is_bookable?: boolean | null
          is_visible_on_ui?: boolean | null
          model_id?: string | null
          origin_location_id?: string | null
          source_code?: string | null
          status?: string | null
          terminal?: string | null
        }
        Update: {
          aircraft_type?: string | null
          airline_code?: string | null
          arrival_datetime?: string | null
          business_price?: number | null
          delay_minutes?: number | null
          delay_reason?: string | null
          departure_datetime?: string | null
          destination_code?: string | null
          destination_location_id?: string | null
          duration_minutes?: number | null
          economy_price?: number | null
          first_class_price?: number | null
          flight_date?: string | null
          flight_number?: string | null
          gate_number?: string | null
          is_bookable?: boolean | null
          is_visible_on_ui?: boolean | null
          model_id?: string | null
          origin_location_id?: string | null
          source_code?: string | null
          status?: string | null
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
      refund_info: {
        Row: {
          initiated_at: string | null
          initiated_by: string | null
          payment_id: string | null
          processed_at: string | null
          refund_amount: number | null
          refund_id: string | null
          refund_reason: string | null
          refund_status: string | null
          refund_type: string | null
          user_id: string | null
        }
        Insert: {
          initiated_at?: string | null
          initiated_by?: string | null
          payment_id?: string | null
          processed_at?: string | null
          refund_amount?: number | null
          refund_id?: string | null
          refund_reason?: string | null
          refund_status?: string | null
          refund_type?: string | null
          user_id?: string | null
        }
        Update: {
          initiated_at?: string | null
          initiated_by?: string | null
          payment_id?: string | null
          processed_at?: string | null
          refund_amount?: number | null
          refund_id?: string | null
          refund_reason?: string | null
          refund_status?: string | null
          refund_type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_cancel_flight: {
        Args: { p_flight_id: string; p_reason: string }
        Returns: undefined
      }
      admin_change_gate: {
        Args: {
          p_flight_id: string
          p_new_gate: string
          p_new_terminal: string
        }
        Returns: undefined
      }
      admin_delay_flight: {
        Args: { p_delay_minutes: number; p_flight_id: string; p_reason: string }
        Returns: undefined
      }
      assign_gate_for_flight: {
        Args: { p_flight_id: string }
        Returns: {
          gate_number: string
          terminal: string
        }[]
      }
      confirm_booking_with_payment: {
        Args: {
          p_booking_id: string
          p_cabin_class: string
          p_flight_id: string
          p_passenger_age: number
          p_passenger_email: string
          p_passenger_name: string
          p_passenger_passport: string
          p_passenger_phone: string
          p_payment_id: string
          p_seat_number: string
          p_total_amount: number
          p_txn_ref: string
          p_user_id: string
          p_user_upi: string
        }
        Returns: undefined
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
