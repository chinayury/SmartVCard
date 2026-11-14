import { useHead } from "@unhead/react";

interface MetaOptions {
	title?: string;
	description?: string;
	/** Canonical-ish path used in the og:url tag. */
	path?: string;
	/** Keep the route out of search indexes (recipient-facing pages). */
	noindex?: boolean;
}

/** Sets the document title and description for the current route. */
export function useDocumentHead({ title, description, path, noindex }: MetaOptions) {
	useHead({
		title,
		meta: [
			...(description ? [{ name: "description", content: description }] : []),
			...(noindex ? [{ name: "robots", content: "noindex" }] : []),
		],
		link: path ? [{ rel: "canonical", href: path }] : [],
	});
}
