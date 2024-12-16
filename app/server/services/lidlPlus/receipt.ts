import * as z from "zod";

export const CurrencySchema = z.object({
  code: z.string(),
  symbol: z.string(),
});
export type Currency = z.infer<typeof CurrencySchema>;

export const ItemsLineSchema = z.object({
  currentUnitPrice: z.string(),
  quantity: z.string(),
  isWeight: z.boolean(),
  originalAmount: z.string(),
  name: z.string(),
  taxGroupName: z.string(),
  codeInput: z.string(),
  discounts: z.array(z.any()),
  deposit: z.null(),
  giftSerialNumber: z.null(),
});
export type ItemsLine = z.infer<typeof ItemsLineSchema>;

export const CardInfoSchema = z.object({
  accountNumber: z.string(),
});
export type CardInfo = z.infer<typeof CardInfoSchema>;

export const StoreSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
  postalCode: z.string(),
  locality: z.string(),
  schedule: z.string(),
});
export type Store = z.infer<typeof StoreSchema>;

export const TaxSchema = z.object({
  taxGroupName: z.string(),
  percentage: z.string(),
  amount: z.string(),
  taxableAmount: z.string(),
  netAmount: z.string(),
});
export type Tax = z.infer<typeof TaxSchema>;

export const TotalTaxesSchema = z.object({
  totalAmount: z.string(),
  totalTaxableAmount: z.string(),
  totalNetAmount: z.string(),
});
export type TotalTaxes = z.infer<typeof TotalTaxesSchema>;

export const ReceiptOneSchema = z.object({
  id: z.string(),
  barCode: z.string(),
  sequenceNumber: z.string(),
  workstation: z.string(),
  itemsLine: z.array(ItemsLineSchema),
  taxes: z.array(TaxSchema),
  totalTaxes: TotalTaxesSchema.nullable(),
  couponsUsed: z.array(z.any()),
  returnedTickets: z.array(z.any()),
  isFavorite: z.boolean(),
  date: z.coerce.date(),
  totalAmount: z.string(),
  totalAmountNumeric: z.number(),
  store: StoreSchema,
  currency: CurrencySchema,
  tenderChange: z.array(z.any()),

  isEmployee: z.boolean(),
  linesScannedCount: z.number(),
  totalDiscount: z.string(),
  taxExemptTexts: z.string(),
  languageCode: z.string(),

  printedReceiptState: z.string(),
  isHtml: z.boolean(),
  hasHtmlDocument: z.boolean(),
  hasInvoice: z.boolean(),
});
export type ReceiptOne = z.infer<typeof ReceiptOneSchema>;
