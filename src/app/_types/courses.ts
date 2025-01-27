export type AffiliationType = "教職員" | "学生" | "その他";

export const COURSE_NAMES = [
  "機械システムコース",
  "メカトロニクスコース",
  "電子情報コース",
  "環境物質化学コース",
  "都市環境コース",
  "エネルギー機械コース",
  "プロダクトデザインコース",
  "エレクトロニクスコース",
  "知能情報コース",
] as const;

export type CourseName = (typeof COURSE_NAMES)[number];

export interface UserProfile {
  id: string;
  name: string | null;
  affiliation_type: AffiliationType | null;
  student_year?: number | null;
  student_course?: number | null;
}
