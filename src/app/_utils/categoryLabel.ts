export const getCategoryLabel = (category: string) => {
  switch (category) {
    case "business-hours":
      return "営業時間";
    case "menu":
      return "メニュー";
    case "other":
      return "その他";
    default:
      return category;
  }
};
