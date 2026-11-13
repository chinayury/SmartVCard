export interface Address {
 street: string;
 city: string;
 stateProvince: string;
 postalCode: string;
 countryRegion: string;
}

export interface Photo {
 url: string;
}

export interface SocialUrls {
 linkedIn?: string;
 twitter?: string;
 wechat?: string;
}

/**
 * The vCard-shaped view of the form. Only fields this app can actually
 * produce are declared — no unreachable properties.
 */
export interface VCardData {
 firstName?: string;
 lastName?: string;
 middleName?: string;
 namePrefix?: string;
 nameSuffix?: string;
 nickname?: string;

 cellPhone?: string;
 workPhone?: string;

 email?: string;
 workEmail?: string;

 organization?: string;
 title?: string;
 /** Short brand name printed on the card when no logo image is set. */
 companyShortName?: string;
 /** Data URL (uploaded file) or remote http(s) URL. */
 logoUrl?: string;
 slogan?: string;

 url?: string;
 workUrl?: string;

 workAddress?: Address;
 birthday?: string;
 note?: string;
 photo?: Photo;

 socialUrls?: SocialUrls;
}
