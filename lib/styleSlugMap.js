export const styleSlugMap = {
  Judo: "judo",
  "Brazilian Jiu Jitsu": "bjj",
  Wrestling: "wrestling",
};

export const slugToStyleMap = Object.fromEntries(
  Object.entries(styleSlugMap).map(([name, slug]) => [slug, name])
);
