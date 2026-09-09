export type CompletenessItem = { label: string; done: boolean; weight: number };

export function computeCompleteness(listing: any): { percent: number; items: CompletenessItem[] } {
  const items: CompletenessItem[] = [
    { label: "Add a logo", done: !!listing.logo_url, weight: 15 },
    { label: "Add at least one photo", done: (listing.photos || []).length > 0, weight: 20 },
    { label: "Write a description (20+ characters)", done: (listing.description || "").length >= 20, weight: 15 },
    { label: "List at least one service", done: (listing.services || []).length > 0, weight: 20 },
    { label: "Add your business hours", done: !!listing.hours, weight: 10 },
    { label: "Add a CR number or social link", done: !!(listing.cr_number || listing.social_link), weight: 10 },
    { label: "Business contact info", done: !!(listing.phone && listing.whatsapp), weight: 10 },
  ];
  const percent = items.reduce((sum, i) => sum + (i.done ? i.weight : 0), 0);
  return { percent, items };
}
