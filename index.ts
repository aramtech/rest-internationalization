const fs = (await import("fs")).default;
import { lock_method, readVolatileJSON } from "$/server/utils/common/index.js";
import path from "path";
import root_paths from "../../dynamic_configuration/root_paths.js";

export type LanguagesKey = "ar" | "en";

export type LanguageIdentifier = {
    english_name: string;
    direction: "rtl" | "ltr";
    native_name: string;
    key: LanguagesKey;
    resource_path: string;
};

const ar_full_path = path.join(root_paths.src_path, "internationalization/translations/ar.lang.json");
const en_full_path = path.join(root_paths.src_path, "internationalization/translations/en.lang.json");

const available_languages: {
    [key in LanguagesKey]: LanguageIdentifier;
} = {
    ar: {
        english_name: "Arabic",
        native_name: "العربية",
        key: "ar",
        direction: "rtl",
        resource_path: ar_full_path,
    },
    en: {
        english_name: "English",
        native_name: "English",
        key: "en",
        direction: "ltr",
        resource_path: en_full_path,
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

export const resources: {
    [key in LanguagesKey]: LanguageMap;
} = {
    ar: readVolatileJSON<LanguageMap>(ar_full_path, {
        createIfNotExists: true,
        defaultValue: {
            english_name: "Arabic",
            native_name: "العربية",
            key: "ar",
            direction: "rtl",
            map: {},
        } as LanguageMap,
    }) as LanguageMap,
    en: readVolatileJSON<LanguageMap>(en_full_path, {
        createIfNotExists: true,
        defaultValue: {
            english_name: "English",
            native_name: "English",
            key: "en",
            map: {},
        } as LanguageMap,
    }) as LanguageMap,
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
    const log_file_full_path = path.join(root_paths.src_path, "internationalization/logs", language_log_file_from_key(language_key));

    const log_file_parent_dir_full_path = path.dirname(log_file_full_path);
    fs.mkdirSync(log_file_parent_dir_full_path, {
        recursive: true,
    });

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
    return log_file_full_path
};

type LangLogFile = {
    not_found_translations: string[];
};

export const add_to_log = lock_method(
    (language_key: string, phrase: string) => {
        phrase = phrase.trim().toLowerCase();
        const log_file_full_path = create_log_file_if_not_exists(language_key);
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
