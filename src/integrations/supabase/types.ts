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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      audio_cache: {
        Row: {
          byte_size: number
          cache_key: string
          created_at: string
          data_base64: string
          id: string
          language_code: string | null
          mime_type: string
          provider: string
          speed: string
          text: string
          verified: boolean
          voice: string | null
        }
        Insert: {
          byte_size?: number
          cache_key: string
          created_at?: string
          data_base64: string
          id?: string
          language_code?: string | null
          mime_type?: string
          provider: string
          speed?: string
          text: string
          verified?: boolean
          voice?: string | null
        }
        Update: {
          byte_size?: number
          cache_key?: string
          created_at?: string
          data_base64?: string
          id?: string
          language_code?: string | null
          mime_type?: string
          provider?: string
          speed?: string
          text?: string
          verified?: boolean
          voice?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          emoji: string
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          emoji?: string
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      concepts: {
        Row: {
          category_slug: string | null
          created_at: string
          gloss_en: string | null
          gloss_es: string
          id: string
          kind: string
          notes: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          category_slug?: string | null
          created_at?: string
          gloss_en?: string | null
          gloss_es: string
          id?: string
          kind?: string
          notes?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          category_slug?: string | null
          created_at?: string
          gloss_en?: string | null
          gloss_es?: string
          id?: string
          kind?: string
          notes?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "concepts_category_slug_fkey"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["slug"]
          },
        ]
      }
      dictionary_entries: {
        Row: {
          alternative_meanings: string[]
          category_slug: string | null
          confidence: Database["public"]["Enums"]["confidence_level"]
          created_at: string
          example_mandinka: string | null
          example_spanish: string | null
          id: string
          ipa: string | null
          language: string
          mandinka: string
          mandinka_normalized: string | null
          notes: string | null
          pronunciation: string | null
          region: string
          regional_variants: Json
          source_date: string | null
          source_name: string | null
          source_type: string | null
          source_url: string | null
          spanish: string
          spanish_normalized: string | null
          synonyms: string[]
          updated_at: string
          verified: boolean
        }
        Insert: {
          alternative_meanings?: string[]
          category_slug?: string | null
          confidence?: Database["public"]["Enums"]["confidence_level"]
          created_at?: string
          example_mandinka?: string | null
          example_spanish?: string | null
          id?: string
          ipa?: string | null
          language?: string
          mandinka: string
          mandinka_normalized?: string | null
          notes?: string | null
          pronunciation?: string | null
          region?: string
          regional_variants?: Json
          source_date?: string | null
          source_name?: string | null
          source_type?: string | null
          source_url?: string | null
          spanish: string
          spanish_normalized?: string | null
          synonyms?: string[]
          updated_at?: string
          verified?: boolean
        }
        Update: {
          alternative_meanings?: string[]
          category_slug?: string | null
          confidence?: Database["public"]["Enums"]["confidence_level"]
          created_at?: string
          example_mandinka?: string | null
          example_spanish?: string | null
          id?: string
          ipa?: string | null
          language?: string
          mandinka?: string
          mandinka_normalized?: string | null
          notes?: string | null
          pronunciation?: string | null
          region?: string
          regional_variants?: Json
          source_date?: string | null
          source_name?: string | null
          source_type?: string | null
          source_url?: string | null
          spanish?: string
          spanish_normalized?: string | null
          synonyms?: string[]
          updated_at?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "dictionary_entries_category_slug_fkey"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["slug"]
          },
        ]
      }
      languages: {
        Row: {
          code: string
          created_at: string
          family: string | null
          flag: string
          name: string
          native_name: string | null
          region: string | null
          sort_order: number
          tts_locale: string | null
          tts_supported: boolean
        }
        Insert: {
          code: string
          created_at?: string
          family?: string | null
          flag?: string
          name: string
          native_name?: string | null
          region?: string | null
          sort_order?: number
          tts_locale?: string | null
          tts_supported?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          family?: string | null
          flag?: string
          name?: string
          native_name?: string | null
          region?: string | null
          sort_order?: number
          tts_locale?: string | null
          tts_supported?: boolean
        }
        Relationships: []
      }
      phrases: {
        Row: {
          category_slug: string | null
          confidence: Database["public"]["Enums"]["confidence_level"]
          created_at: string
          id: string
          mandinka: string
          pronunciation: string | null
          region: string
          sort_order: number
          source_name: string | null
          spanish: string
        }
        Insert: {
          category_slug?: string | null
          confidence?: Database["public"]["Enums"]["confidence_level"]
          created_at?: string
          id?: string
          mandinka: string
          pronunciation?: string | null
          region?: string
          sort_order?: number
          source_name?: string | null
          spanish: string
        }
        Update: {
          category_slug?: string | null
          confidence?: Database["public"]["Enums"]["confidence_level"]
          created_at?: string
          id?: string
          mandinka?: string
          pronunciation?: string | null
          region?: string
          sort_order?: number
          source_name?: string | null
          spanish?: string
        }
        Relationships: [
          {
            foreignKeyName: "phrases_category_slug_fkey"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["slug"]
          },
        ]
      }
      term_revisions: {
        Row: {
          change_type: string
          changed_by: string | null
          created_at: string
          id: string
          next: Json | null
          previous: Json | null
          reason: string | null
          source_name: string | null
          term_id: string | null
        }
        Insert: {
          change_type?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          next?: Json | null
          previous?: Json | null
          reason?: string | null
          source_name?: string | null
          term_id?: string | null
        }
        Update: {
          change_type?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          next?: Json | null
          previous?: Json | null
          reason?: string | null
          source_name?: string | null
          term_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "term_revisions_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      terms: {
        Row: {
          alternative_meanings: string[]
          concept_id: string
          confidence: string
          created_at: string
          example_text: string | null
          example_translation: string | null
          id: string
          ipa: string | null
          language_code: string
          normalized: string | null
          notes: string | null
          part_of_speech: string | null
          pronunciation: string | null
          region: string | null
          source_date: string | null
          source_name: string | null
          source_type: string | null
          source_url: string | null
          synonyms: string[]
          text: string
          updated_at: string
          verified: boolean
        }
        Insert: {
          alternative_meanings?: string[]
          concept_id: string
          confidence?: string
          created_at?: string
          example_text?: string | null
          example_translation?: string | null
          id?: string
          ipa?: string | null
          language_code: string
          normalized?: string | null
          notes?: string | null
          part_of_speech?: string | null
          pronunciation?: string | null
          region?: string | null
          source_date?: string | null
          source_name?: string | null
          source_type?: string | null
          source_url?: string | null
          synonyms?: string[]
          text: string
          updated_at?: string
          verified?: boolean
        }
        Update: {
          alternative_meanings?: string[]
          concept_id?: string
          confidence?: string
          created_at?: string
          example_text?: string | null
          example_translation?: string | null
          id?: string
          ipa?: string | null
          language_code?: string
          normalized?: string | null
          notes?: string | null
          part_of_speech?: string | null
          pronunciation?: string | null
          region?: string | null
          source_date?: string | null
          source_name?: string | null
          source_type?: string | null
          source_url?: string | null
          synonyms?: string[]
          text?: string
          updated_at?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "terms_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "concepts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "terms_language_code_fkey"
            columns: ["language_code"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["code"]
          },
        ]
      }
      unknown_words: {
        Row: {
          first_seen: string
          id: string
          language_code: string | null
          last_seen: string
          normalized: string
          priority: number
          resolved: boolean
          search_count: number
          text: string
        }
        Insert: {
          first_seen?: string
          id?: string
          language_code?: string | null
          last_seen?: string
          normalized: string
          priority?: number
          resolved?: boolean
          search_count?: number
          text: string
        }
        Update: {
          first_seen?: string
          id?: string
          language_code?: string | null
          last_seen?: string
          normalized?: string
          priority?: number
          resolved?: boolean
          search_count?: number
          text?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_unknown_word: {
        Args: { _language_code: string; _text: string }
        Returns: undefined
      }
      normalize_term: { Args: { _text: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "editor" | "user"
      confidence_level: "verified" | "probable" | "approximate"
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
      app_role: ["admin", "editor", "user"],
      confidence_level: ["verified", "probable", "approximate"],
    },
  },
} as const
