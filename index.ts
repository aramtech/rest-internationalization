const fs = (await import("fs")).default;
import { resolve_path } from "$/server/utils/common/index.js";

export type LanguagesKey = "ar" | "en";

export type LanguageIdentifier = {
    english_name: string;
    native_name: string;
    key: LanguagesKey;
    resource_path: string;
};

const available_languages: {
    [key in LanguagesKey]: LanguageIdentifier;
} = {
    ar: {
        english_name: "Arabic",
        native_name: "العربية",
        key: "ar",
        resource_path: resolve_path("./translations/ar.lang.json", import.meta.url),
    },
    en: {
        english_name: "English",
        native_name: "English",
        key: "en",
        resource_path: resolve_path("./translations/en.lang.json", import.meta.url),
    },
};
const default_language = available_languages.en;

type LanguageMap = {
    native_name: string;
    key: LanguagesKey;
    english_name: string;
    map: {
        [key: string]: string | undefined;
    };
};

const resources: {
    [key in LanguagesKey]: LanguageMap;
} = {
    ar: JSON.parse(fs.readFileSync(available_languages.ar.resource_path, "utf-8")),
    en: JSON.parse(fs.readFileSync(available_languages.en.resource_path, "utf-8")),
};
for (const resource of Object.values(resources)) {
    for (const phrase in resource?.map || {}) {
        const lower_phrase = String(phrase).toLowerCase();
        resource.map[lower_phrase] = resource.map[phrase];
    }
}
/**
 *
 * @param {string} phrase
 * @param {AvailableLanguages} [language_key]
 */
const t = (phrase: string, language_key?: LanguagesKey) => {
    if (!phrase || typeof phrase != "string") {
        return phrase;
    }
    phrase = String(phrase).toLowerCase();
    if (!language_key || !available_languages[language_key]) {
        language_key = default_language.key;
    }
    const resource = resources[language_key];
    return resource?.map?.[phrase] || phrase;
};
export { t };

    export { available_languages, default_language };
