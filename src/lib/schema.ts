import { z } from "zod";

import { isHttpUrl, isSafeImageSource } from "./safety";
import { stripControlChars } from "./text";
import type { VCardData } from "./vcardTypes";

/**
 * Form schema. Every free-text field is length-capped and every URL is checked
 * against an http(s) allow-list so the same rules protect the form, a restored
 * draft and a pasted share link.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[0-9+\-().\s]{4,40}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Per-field length caps — the single source of truth.
 *
 * Both the Zod schema and `mergeWithDefaults` (draft restore, share-link
 * decoding, vCard import) read these. Without a shared table, a restored value
 * could be longer than the form accepts: an imported card with a 300-character
 * organisation then showed "too long" errors on fields the user never touched.
 * The `Record<keyof VCardFormValues, number>` annotation below makes a missing
 * or misspelled limit a compile error.
 */
const LIMITS = {
  // Identity
  firstName: 60,
  lastName: 60,
  middleName: 60,
  namePrefix: 20,
  nameSuffix: 20,
  nickname: 60,

  // Contact
  cellPhone: 40,
  workPhone: 40,
  email: 254,
  workEmail: 254,
  url: 2048,
  workUrl: 2048,

  // Organisation
  organization: 120,
  title: 120,
  companyShortName: 40,
  slogan: 120,
  logoUrl: 1_600_000,
  workStreet: 120,
  workCity: 120,
  workState: 120,
  workPostal: 24,
  workCountry: 80,

  // Extras
  birthday: 10,
  note: 1000,
  photo: 2048,

  // Social
  linkedIn: 2048,
  twitter: 2048,
  wechat: 64,
};

const optionalText = (max: number) => z.string().trim().max(max, "tooLong").optional();

const optionalPhone = z
  .string()
  .trim()
  .max(LIMITS.cellPhone, "tooLong")
  .refine((value) => value === "" || PHONE_RE.test(value), "invalidPhone")
  .optional();

const optionalEmail = z
  .string()
  .trim()
  .max(LIMITS.email, "tooLong")
  .refine((value) => value === "" || EMAIL_RE.test(value), "invalidEmail")
  .optional();

const optionalHttpUrl = (max: number) =>
  z
    .string()
    .trim()
    .max(max, "tooLong")
    .refine((value) => value === "" || isHttpUrl(value), "invalidUrl")
    .optional();

const optionalImage = z
  .string()
  .trim()
  .max(LIMITS.logoUrl, "tooLong")
  .refine((value) => value === "" || isSafeImageSource(value), "invalidImage")
  .optional();

const optionalDate = z
  .string()
  .trim()
  .max(LIMITS.birthday, "tooLong")
  .refine((value) => value === "" || isValidDateInput(value), "invalidDate")
  .optional();

/** `YYYY-MM-DD` and a real calendar day (rejects 2024-02-31). */
function isValidDateInput(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export const vcardSchema = z.object({
  // Identity
  firstName: z.string().trim().min(1, "firstNameRequired").max(LIMITS.firstName, "tooLong"),
  lastName: optionalText(LIMITS.lastName),
  middleName: optionalText(LIMITS.middleName),
  namePrefix: optionalText(LIMITS.namePrefix),
  nameSuffix: optionalText(LIMITS.nameSuffix),
  nickname: optionalText(LIMITS.nickname),

  // Contact
  cellPhone: optionalPhone,
  workPhone: optionalPhone,
  email: optionalEmail,
  workEmail: optionalEmail,
  url: optionalHttpUrl(LIMITS.url),
  workUrl: optionalHttpUrl(LIMITS.workUrl),

  // Organisation
  organization: optionalText(LIMITS.organization),
  title: optionalText(LIMITS.title),
  companyShortName: optionalText(LIMITS.companyShortName),
  slogan: optionalText(LIMITS.slogan),
  logoUrl: optionalImage,
  workStreet: optionalText(LIMITS.workStreet),
  workCity: optionalText(LIMITS.workCity),
  workState: optionalText(LIMITS.workState),
  workPostal: optionalText(LIMITS.workPostal),
  workCountry: optionalText(LIMITS.workCountry),

  // Extras
  birthday: optionalDate,
  note: optionalText(LIMITS.note),
  photo: optionalHttpUrl(LIMITS.photo),

  // Social
  linkedIn: optionalHttpUrl(LIMITS.linkedIn),
  twitter: optionalHttpUrl(LIMITS.twitter),
  wechat: optionalText(LIMITS.wechat),
});

export type VCardFormValues = z.infer<typeof vcardSchema>;
export type FieldErrorKey =
  | "firstNameRequired"
  | "invalidUrl"
  | "invalidEmail"
  | "invalidPhone"
  | "invalidImage"
  | "invalidDate"
  | "tooLong";

/**
 * The caps above, exposed for `mergeWithDefaults`. The annotation fails the
 * build if a field is added to the schema without a matching limit.
 */
export const FIELD_LIMITS: Record<keyof VCardFormValues, number> = LIMITS;

/** Convert flat form values into the shape consumed by the vCard writer. */
export function toVCardData(values: VCardFormValues): VCardData {
 const text = (value: string | undefined) => value?.trim() || undefined;

 const hasAddress = Boolean(
 values.workStreet || values.workCity || values.workState || values.workPostal || values.workCountry,
 );

 return {
 firstName: text(values.firstName),
 lastName: text(values.lastName),
 middleName: text(values.middleName),
 namePrefix: text(values.namePrefix),
 nameSuffix: text(values.nameSuffix),
 nickname: text(values.nickname),

 cellPhone: text(values.cellPhone),
 workPhone: text(values.workPhone),

 email: text(values.email),
 workEmail: text(values.workEmail),

 organization: text(values.organization),
 title: text(values.title),
 companyShortName: text(values.companyShortName),
 logoUrl: text(values.logoUrl),
 slogan: text(values.slogan),

 url: text(values.url),
 workUrl: text(values.workUrl),

 workAddress: hasAddress
 ? {
 street: values.workStreet?.trim() ?? "",
 city: values.workCity?.trim() ?? "",
 stateProvince: values.workState?.trim() ?? "",
 postalCode: values.workPostal?.trim() ?? "",
 countryRegion: values.workCountry?.trim() ?? "",
 }
 : undefined,

 birthday: text(values.birthday),
 note: text(values.note),
 photo: text(values.photo) ? { url: text(values.photo) as string } : undefined,

 socialUrls: {
 linkedIn: text(values.linkedIn),
 twitter: text(values.twitter),
 wechat: text(values.wechat),
 },
 };
}

/** Empty defaults for the form. */
export const emptyVCard: VCardFormValues = {
 firstName: "",
 lastName: "",
 middleName: "",
 namePrefix: "",
 nameSuffix: "",
 nickname: "",
 cellPhone: "",
 workPhone: "",
 email: "",
 workEmail: "",
 url: "",
 workUrl: "",
 organization: "",
 title: "",
 companyShortName: "",
 slogan: "",
 logoUrl: "",
 workStreet: "",
 workCity: "",
 workState: "",
 workPostal: "",
 workCountry: "",
 birthday: "",
 note: "",
 photo: "",
 linkedIn: "",
 twitter: "",
 wechat: "",
};

export const FORM_FIELD_KEYS = Object.keys(emptyVCard) as (keyof VCardFormValues)[];

/** How many fields currently carry a value (used by the progress chip). */
export function countFilledFields(values: VCardFormValues): number {
 return FORM_FIELD_KEYS.reduce((total, key) => {
 const value = values[key];
 return total + (typeof value === "string" && value.trim() !== "" ?1 :0);
 },0);
}

/**
 * Restore a draft / imported vCard without trusting its shape: unknown keys are
 * dropped, non-strings become "", control characters are stripped, and every
 * value is trimmed and capped at its schema limit — so a restored value can
 * never be longer (or dirtier) than the form itself would accept.
 */
export function mergeWithDefaults(
  partial: Partial<Record<keyof VCardFormValues, unknown>> | null,
): VCardFormValues {
  if (!partial) return { ...emptyVCard };
  const merged: VCardFormValues = { ...emptyVCard };
  for (const key of FORM_FIELD_KEYS) {
    const raw = partial[key];
    if (typeof raw === "string") {
      merged[key] = stripControlChars(raw.trim()).slice(0, FIELD_LIMITS[key]);
    }
  }
  return merged;
}
