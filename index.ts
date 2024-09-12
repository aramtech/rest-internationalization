const fs = (await import("fs")).default;
import { lock_method, resolve_path } from "$/server/utils/common/index.js";
import path from "path";

export type LanguagesKey = "ar" | "en";

export type LanguageIdentifier = {
    english_name: string;
    direction: "rtl" | "ltr"; 
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
        direction: "rtl",
        resource_path: resolve_path("./translations/ar.lang.json", import.meta.url),
    },
    en: {
        english_name: "English",
        native_name: "English",
        key: "en",
        direction: "ltr",
        resource_path: resolve_path("./translations/en.lang.json", import.meta.url),
    },
};
const default_language = available_languages.en;

type LanguageMap = {
    native_name: string;
    key: LanguagesKey;
    english_name: string;
    direction: "rtl" | "ltr"; 
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

const language_log_file_from_key = (language_key: string) => {
    return `${language_key}.log.json`;
};

const create_log_file_if_not_exists = (language_key: string) => {
    const log_file_full_path = resolve_path(
        path.join("./logs", language_log_file_from_key(language_key)),
        import.meta.url,
    );
    if (!fs.existsSync(log_file_full_path)) {
        fs.writeFileSync(
            log_file_full_path,
            JSON.stringify(
                {
                    not_found_translations: [],
                },
                null,
                4,
            ),
        );
    }
};

type LangLogFile = {
    not_found_translations: string[];
};

export const add_to_log = lock_method(
    (language_key: string, phrase: string) => {
        phrase = phrase.toLowerCase();
        const log_file_full_path = resolve_path(
            path.join("./logs", language_log_file_from_key(language_key)),
            import.meta.url,
        );
        create_log_file_if_not_exists(language_key);
        const log = JSON.parse(fs.readFileSync(log_file_full_path, "utf-8")) as LangLogFile;
        if (!log.not_found_translations.find((ph) => ph == phrase)) {
            log.not_found_translations.push(phrase);
            fs.writeFileSync(log_file_full_path, JSON.stringify(log, null, 4));
        }
    },
    { lock_name: "log_not_found_translation" },
);

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
    if (resource?.map?.[phrase]) {
        return resource?.map?.[phrase];
    }

    if (language_key != default_language.key) {
        add_to_log(language_key, phrase)
            .then(() => {})
            .catch((error) => {
                console.log("Error logging to unfound translation", error);
            });
    }

    return phrase;
};
export { available_languages, default_language, t };

