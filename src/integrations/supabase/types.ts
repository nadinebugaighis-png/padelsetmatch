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
      [table: string]: {
        Row: Record<string, any>;
        Insert: Record<string, any>;
        Update: Record<string, any>;
        Relationships: any[];
      };
    };
    Views: {
      [view: string]: {
        Row: Record<string, any>;
      };
    };
    Functions: {
      [fn: string]: {
        Args: Record<string, any>;
        Returns: any;
      };
    };
    Enums: {
      [enumName: string]: any[];
    };
  };
};
