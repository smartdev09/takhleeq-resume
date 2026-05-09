"use client";
import {
  CUSTOM_FONT_FAMILIES,
  NON_ENGLISH_FONT_FAMILIES,
  NON_ENGLISH_FONT_FAMILY_TO_LANGUAGE,
} from "components/fonts/constants";

/**
 * getPreferredNonEnglishFontFamilies returns non-english font families that are included in
 * user's preferred languages. This is to avoid loading fonts/languages that users won't use.
 *
 * Must only be called on the client (inside useEffect or from ssr:false components).
 */
const getPreferredNonEnglishFontFamilies = () => {
  if (typeof navigator === "undefined") return [];
  const userPreferredLanguages = navigator.languages ?? [navigator.language];
  return NON_ENGLISH_FONT_FAMILIES.filter((fontFamily) => {
    const fontLanguages = NON_ENGLISH_FONT_FAMILY_TO_LANGUAGE[fontFamily];
    return userPreferredLanguages.some((preferredLanguage) =>
      fontLanguages.includes(preferredLanguage)
    );
  });
};

export const getAllFontFamiliesToLoad = () => {
  return [...CUSTOM_FONT_FAMILIES, ...getPreferredNonEnglishFontFamilies()];
};
