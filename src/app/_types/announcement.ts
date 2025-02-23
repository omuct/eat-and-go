// src/types/announcement.ts
export type Announcement = {
  id: string;
  title: string;
  content: string;
  category: "business-hours" | "menu" | "other";
  image_url?: string;
  created_at: string;
  updated_at: string;
};
