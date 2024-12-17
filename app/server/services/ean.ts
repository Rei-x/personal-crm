import * as z from "zod";

export const CategoryDetailSchema = z.object({
  code: z.string(),
  text: z.string(),
});

export const CompanySchema = z.object({
  city: z.string(),
  name: z.string(),
  nip: z.string(),
  postalCode: z.string(),
  street: z.string(),
  webPage: z.string(),
});

export const LicensingMoSchema = z.object({
  moName: z.string(),
});

export const Gs1LicenceSchema = z.object({
  licenseeGLN: z.string(),
  licensingMO: LicensingMoSchema,
});

export const EanSuccessSchema = z.object({
  brand: z.string(),
  categoryDetails: z.array(CategoryDetailSchema),
  company: CompanySchema,
  description: z.null(),
  descriptionLanguage: z.string(),
  gs1Licence: Gs1LicenceSchema,
  gtinNumber: z.string(),
  gtinStatus: z.string(),
  imageUrls: z.array(z.any()),
  isComplete: z.boolean(),
  isGlobal: z.boolean(),
  isPublic: z.boolean(),
  isVerified: z.boolean(),
  lastModified: z.coerce.date(),
  name: z.string(),
  netContent: z.array(z.string()),
  netVolume: z.string(),
  productPage: z.null(),
  source: z.string(),
  targetMarket: z.array(z.string()),
  unit: z.string(),
});

const ErrorSchema = z.object({
  errors: z.array(z.record(z.string().array())),
});

export const getEanInfo = async (ean: string) => {
  const data = await fetch(
    `https://www.eprodukty.gs1.pl/api/v1/products/product_has_gcp/${ean}/?activeMembershipId=undefined`
  );

  if (data.ok) {
    return EanSuccessSchema.parse(await data.json());
  }

  const parseResult = ErrorSchema.safeParse(await data.json());

  if (!parseResult.success) {
    throw new Error("Failed to parse error response");
  }

  return undefined;
};
