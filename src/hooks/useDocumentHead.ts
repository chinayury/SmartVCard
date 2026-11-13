import { useHead } from "@unhead/react";

interface MetaOptions {
 title?: string;
 description?: string;
 /** Canonical-ish path used in the og:url tag. */
 path?: string;
}

/** Sets the document title and description for the current route. */
export function useDocumentHead({ title, description, path }: MetaOptions) {
 useHead({
 title,
 meta: description ? [{ name: "description", content: description }] : [],
 link: path ? [{ rel: "canonical", href: path }] : [],
 });
}
