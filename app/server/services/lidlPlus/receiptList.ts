import * as z from "zod";

export const CurrencySchema = z.object({
  code: z.string(),
  symbol: z.string(),
});
export type Currency = z.infer<typeof CurrencySchema>;

export const ReceiptListElementSchema = z.object({
  id: z.string(),
  isFavorite: z.boolean(),
  date: z.coerce.date(),
  currency: CurrencySchema,
  totalAmount: z.number(),
  storeCode: z.string(),
  articlesCount: z.number(),
  couponsUsedCount: z.number(),
  vendor: z.null(),
  isHtml: z.boolean(),
  hasHtmlDocument: z.boolean(),
  returns: z.array(z.any()),
  iconUrl: z.string(),
});
export type ReceiptListElement = z.infer<typeof ReceiptListElementSchema>;

export const ReceiptListSchema = z.array(ReceiptListElementSchema);
