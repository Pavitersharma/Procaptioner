"""
ProCaptioner Subtitle Engine — Language Registry
Master registry of 100+ supported languages with metadata for ASR, translation, and rendering.
"""

from dataclasses import dataclass
from enum import Enum


class TranslationEngine(Enum):
    INDICTRANS2 = "indictrans2"
    NLLB = "nllb"
    NONE = "none"  # Source language, no translation needed


class TextDirection(Enum):
    LTR = "ltr"
    RTL = "rtl"


@dataclass(frozen=True)
class Language:
    """Represents a supported language with all metadata needed for the pipeline."""
    code: str                     # ISO 639-1 or custom short code
    name: str                     # Display name in English
    native_name: str              # Name in the language itself
    whisper_code: str             # Code used by Whisper for ASR
    translation_engine: TranslationEngine
    translation_code: str         # Code used by the translation model
    script: str                   # Primary script name
    font_family: str              # Recommended Noto Sans font
    direction: TextDirection = TextDirection.LTR
    region: str = "Other"


# ─── Indian Scheduled Languages (IndicTrans2) ─────────────────────────────────
INDIAN_LANGUAGES = [
    Language("hi", "Hindi", "हिन्दी", "hi", TranslationEngine.INDICTRANS2, "hin_Deva", "Devanagari", "NotoSansDevanagari", region="Indian"),
    Language("mr", "Marathi", "मराठी", "mr", TranslationEngine.INDICTRANS2, "mar_Deva", "Devanagari", "NotoSansDevanagari", region="Indian"),
    Language("pa", "Punjabi", "ਪੰਜਾਬੀ", "pa", TranslationEngine.INDICTRANS2, "pan_Guru", "Gurmukhi", "NotoSansGurmukhi", region="Indian"),
    Language("ta", "Tamil", "தமிழ்", "ta", TranslationEngine.INDICTRANS2, "tam_Taml", "Tamil", "NotoSansTamil", region="Indian"),
    Language("te", "Telugu", "తెలుగు", "te", TranslationEngine.INDICTRANS2, "tel_Telu", "Telugu", "NotoSansTelugu", region="Indian"),
    Language("bn", "Bengali", "বাংলা", "bn", TranslationEngine.INDICTRANS2, "ben_Beng", "Bengali", "NotoSansBengali", region="Indian"),
    Language("gu", "Gujarati", "ગુજરાતી", "gu", TranslationEngine.INDICTRANS2, "guj_Gujr", "Gujarati", "NotoSansGujarati", region="Indian"),
    Language("kn", "Kannada", "ಕನ್ನಡ", "kn", TranslationEngine.INDICTRANS2, "kan_Knda", "Kannada", "NotoSansKannada", region="Indian"),
    Language("ml", "Malayalam", "മലയാളം", "ml", TranslationEngine.INDICTRANS2, "mal_Mlym", "Malayalam", "NotoSansMalayalam", region="Indian"),
    Language("or", "Odia", "ଓଡ଼ିଆ", "or", TranslationEngine.INDICTRANS2, "ory_Orya", "Odia", "NotoSansOriya", region="Indian"),
    Language("as", "Assamese", "অসমীয়া", "as", TranslationEngine.INDICTRANS2, "asm_Beng", "Bengali", "NotoSansBengali", region="Indian"),
    Language("ur", "Urdu", "اردو", "ur", TranslationEngine.INDICTRANS2, "urd_Arab", "Arabic", "NotoNaskhArabic", TextDirection.RTL, region="Indian"),
    Language("sa", "Sanskrit", "संस्कृतम्", "sa", TranslationEngine.INDICTRANS2, "san_Deva", "Devanagari", "NotoSansDevanagari", region="Indian"),
    Language("ne", "Nepali", "नेपाली", "ne", TranslationEngine.INDICTRANS2, "npi_Deva", "Devanagari", "NotoSansDevanagari", region="Indian"),
    Language("sd", "Sindhi", "سنڌي", "sd", TranslationEngine.INDICTRANS2, "snd_Arab", "Arabic", "NotoNaskhArabic", TextDirection.RTL, region="Indian"),
    Language("kok", "Konkani", "कोंकणी", "hi", TranslationEngine.INDICTRANS2, "gom_Deva", "Devanagari", "NotoSansDevanagari", region="Indian"),  # Whisper uses Hindi
    Language("mai", "Maithili", "मैथिली", "hi", TranslationEngine.INDICTRANS2, "mai_Deva", "Devanagari", "NotoSansDevanagari", region="Indian"),  # Whisper uses Hindi
    Language("doi", "Dogri", "डोगरी", "hi", TranslationEngine.INDICTRANS2, "doi_Deva", "Devanagari", "NotoSansDevanagari", region="Indian"),
    Language("brx", "Bodo", "बड़ो", "hi", TranslationEngine.INDICTRANS2, "brx_Deva", "Devanagari", "NotoSansDevanagari", region="Indian"),
    Language("sat", "Santali", "ᱥᱟᱱᱛᱟᱲᱤ", "hi", TranslationEngine.INDICTRANS2, "sat_Olck", "Ol Chiki", "NotoSansOlChiki", region="Indian"),
    Language("ks", "Kashmiri", "کٲشُر", "hi", TranslationEngine.INDICTRANS2, "kas_Arab", "Arabic", "NotoNaskhArabic", TextDirection.RTL, region="Indian"),
    Language("mni", "Manipuri", "মৈতৈলোন্", "hi", TranslationEngine.INDICTRANS2, "mni_Beng", "Bengali", "NotoSansBengali", region="Indian"),
]

# ─── Indian Non-Scheduled Languages (via Hindi ASR + NLLB) ────────────────────
INDIAN_REGIONAL_LANGUAGES = [
    Language("bho", "Bhojpuri", "भोजपुरी", "hi", TranslationEngine.NLLB, "bho_Deva", "Devanagari", "NotoSansDevanagari", region="Indian Regional"),
    Language("mag", "Magahi", "मगही", "hi", TranslationEngine.NLLB, "mag_Deva", "Devanagari", "NotoSansDevanagari", region="Indian Regional"),
    Language("awa", "Awadhi", "अवधी", "hi", TranslationEngine.NLLB, "awa_Deva", "Devanagari", "NotoSansDevanagari", region="Indian Regional"),
    Language("hne", "Chhattisgarhi", "छत्तीसगढ़ी", "hi", TranslationEngine.NLLB, "hne_Deva", "Devanagari", "NotoSansDevanagari", region="Indian Regional"),
]

# ─── Global Languages (NLLB-200) ─────────────────────────────────────────────
GLOBAL_LANGUAGES = [
    # English (source — no translation needed for transcription)
    Language("en", "English", "English", "en", TranslationEngine.NONE, "eng_Latn", "Latin", "NotoSans", region="Global"),

    # European
    Language("es", "Spanish", "Español", "es", TranslationEngine.NLLB, "spa_Latn", "Latin", "NotoSans", region="European"),
    Language("fr", "French", "Français", "fr", TranslationEngine.NLLB, "fra_Latn", "Latin", "NotoSans", region="European"),
    Language("de", "German", "Deutsch", "de", TranslationEngine.NLLB, "deu_Latn", "Latin", "NotoSans", region="European"),
    Language("it", "Italian", "Italiano", "it", TranslationEngine.NLLB, "ita_Latn", "Latin", "NotoSans", region="European"),
    Language("pt", "Portuguese", "Português", "pt", TranslationEngine.NLLB, "por_Latn", "Latin", "NotoSans", region="European"),
    Language("ru", "Russian", "Русский", "ru", TranslationEngine.NLLB, "rus_Cyrl", "Cyrillic", "NotoSans", region="European"),
    Language("nl", "Dutch", "Nederlands", "nl", TranslationEngine.NLLB, "nld_Latn", "Latin", "NotoSans", region="European"),
    Language("pl", "Polish", "Polski", "pl", TranslationEngine.NLLB, "pol_Latn", "Latin", "NotoSans", region="European"),
    Language("sv", "Swedish", "Svenska", "sv", TranslationEngine.NLLB, "swe_Latn", "Latin", "NotoSans", region="European"),
    Language("no", "Norwegian", "Norsk", "no", TranslationEngine.NLLB, "nob_Latn", "Latin", "NotoSans", region="European"),
    Language("da", "Danish", "Dansk", "da", TranslationEngine.NLLB, "dan_Latn", "Latin", "NotoSans", region="European"),
    Language("fi", "Finnish", "Suomi", "fi", TranslationEngine.NLLB, "fin_Latn", "Latin", "NotoSans", region="European"),
    Language("el", "Greek", "Ελληνικά", "el", TranslationEngine.NLLB, "ell_Grek", "Greek", "NotoSans", region="European"),
    Language("cs", "Czech", "Čeština", "cs", TranslationEngine.NLLB, "ces_Latn", "Latin", "NotoSans", region="European"),
    Language("ro", "Romanian", "Română", "ro", TranslationEngine.NLLB, "ron_Latn", "Latin", "NotoSans", region="European"),
    Language("hu", "Hungarian", "Magyar", "hu", TranslationEngine.NLLB, "hun_Latn", "Latin", "NotoSans", region="European"),
    Language("tr", "Turkish", "Türkçe", "tr", TranslationEngine.NLLB, "tur_Latn", "Latin", "NotoSans", region="European"),
    Language("uk", "Ukrainian", "Українська", "uk", TranslationEngine.NLLB, "ukr_Cyrl", "Cyrillic", "NotoSans", region="European"),
    Language("bg", "Bulgarian", "Български", "bg", TranslationEngine.NLLB, "bul_Cyrl", "Cyrillic", "NotoSans", region="European"),
    Language("hr", "Croatian", "Hrvatski", "hr", TranslationEngine.NLLB, "hrv_Latn", "Latin", "NotoSans", region="European"),
    Language("sk", "Slovak", "Slovenčina", "sk", TranslationEngine.NLLB, "slk_Latn", "Latin", "NotoSans", region="European"),
    Language("sl", "Slovenian", "Slovenščina", "sl", TranslationEngine.NLLB, "slv_Latn", "Latin", "NotoSans", region="European"),
    Language("lt", "Lithuanian", "Lietuvių", "lt", TranslationEngine.NLLB, "lit_Latn", "Latin", "NotoSans", region="European"),
    Language("lv", "Latvian", "Latviešu", "lv", TranslationEngine.NLLB, "lvs_Latn", "Latin", "NotoSans", region="European"),
    Language("et", "Estonian", "Eesti", "et", TranslationEngine.NLLB, "est_Latn", "Latin", "NotoSans", region="European"),
    Language("sr", "Serbian", "Српски", "sr", TranslationEngine.NLLB, "srp_Cyrl", "Cyrillic", "NotoSans", region="European"),
    Language("ca", "Catalan", "Català", "ca", TranslationEngine.NLLB, "cat_Latn", "Latin", "NotoSans", region="European"),

    # East Asian
    Language("ja", "Japanese", "日本語", "ja", TranslationEngine.NLLB, "jpn_Jpan", "Japanese", "NotoSansCJKjp", region="East Asian"),
    Language("ko", "Korean", "한국어", "ko", TranslationEngine.NLLB, "kor_Hang", "Hangul", "NotoSansCJKkr", region="East Asian"),
    Language("zh", "Chinese (Simplified)", "中文", "zh", TranslationEngine.NLLB, "zho_Hans", "CJK", "NotoSansCJKsc", region="East Asian"),
    Language("zh-tw", "Chinese (Traditional)", "繁體中文", "zh", TranslationEngine.NLLB, "zho_Hant", "CJK", "NotoSansCJKtc", region="East Asian"),
    Language("th", "Thai", "ไทย", "th", TranslationEngine.NLLB, "tha_Thai", "Thai", "NotoSansThai", region="East Asian"),
    Language("vi", "Vietnamese", "Tiếng Việt", "vi", TranslationEngine.NLLB, "vie_Latn", "Latin", "NotoSans", region="East Asian"),
    Language("id", "Indonesian", "Bahasa Indonesia", "id", TranslationEngine.NLLB, "ind_Latn", "Latin", "NotoSans", region="Southeast Asian"),
    Language("ms", "Malay", "Bahasa Melayu", "ms", TranslationEngine.NLLB, "zsm_Latn", "Latin", "NotoSans", region="Southeast Asian"),
    Language("tl", "Filipino", "Filipino", "tl", TranslationEngine.NLLB, "tgl_Latn", "Latin", "NotoSans", region="Southeast Asian"),
    Language("my", "Myanmar", "မြန်မာ", "my", TranslationEngine.NLLB, "mya_Mymr", "Myanmar", "NotoSansMyanmar", region="Southeast Asian"),
    Language("km", "Khmer", "ខ្មែរ", "km", TranslationEngine.NLLB, "khm_Khmr", "Khmer", "NotoSansKhmer", region="Southeast Asian"),
    Language("lo", "Lao", "ລາວ", "lo", TranslationEngine.NLLB, "lao_Laoo", "Lao", "NotoSansLao", region="Southeast Asian"),

    # Middle Eastern
    Language("ar", "Arabic", "العربية", "ar", TranslationEngine.NLLB, "arb_Arab", "Arabic", "NotoNaskhArabic", TextDirection.RTL, region="Middle Eastern"),
    Language("fa", "Persian", "فارسی", "fa", TranslationEngine.NLLB, "pes_Arab", "Arabic", "NotoNaskhArabic", TextDirection.RTL, region="Middle Eastern"),
    Language("he", "Hebrew", "עברית", "he", TranslationEngine.NLLB, "heb_Hebr", "Hebrew", "NotoSansHebrew", TextDirection.RTL, region="Middle Eastern"),

    # African
    Language("sw", "Swahili", "Kiswahili", "sw", TranslationEngine.NLLB, "swh_Latn", "Latin", "NotoSans", region="African"),
    Language("yo", "Yoruba", "Yorùbá", "yo", TranslationEngine.NLLB, "yor_Latn", "Latin", "NotoSans", region="African"),
    Language("ig", "Igbo", "Igbo", "ig", TranslationEngine.NLLB, "ibo_Latn", "Latin", "NotoSans", region="African"),
    Language("am", "Amharic", "አማርኛ", "am", TranslationEngine.NLLB, "amh_Ethi", "Ethiopic", "NotoSansEthiopic", region="African"),
    Language("ha", "Hausa", "Hausa", "ha", TranslationEngine.NLLB, "hau_Latn", "Latin", "NotoSans", region="African"),
    Language("zu", "Zulu", "isiZulu", "zu", TranslationEngine.NLLB, "zul_Latn", "Latin", "NotoSans", region="African"),
    Language("so", "Somali", "Soomaali", "so", TranslationEngine.NLLB, "som_Latn", "Latin", "NotoSans", region="African"),
]


# ─── Combined Registry ───────────────────────────────────────────────────────
ALL_LANGUAGES = INDIAN_LANGUAGES + INDIAN_REGIONAL_LANGUAGES + GLOBAL_LANGUAGES

# Lookup maps
LANGUAGE_BY_CODE: dict[str, Language] = {lang.code: lang for lang in ALL_LANGUAGES}
LANGUAGE_BY_WHISPER_CODE: dict[str, list[Language]] = {}
for lang in ALL_LANGUAGES:
    LANGUAGE_BY_WHISPER_CODE.setdefault(lang.whisper_code, []).append(lang)

# ─── Convenience helpers ──────────────────────────────────────────────────────

def get_language(code: str) -> Language | None:
    """Get a language by its short code."""
    return LANGUAGE_BY_CODE.get(code)


def get_translation_languages() -> list[Language]:
    """Get all languages that can be used as translation targets."""
    return [l for l in ALL_LANGUAGES if l.translation_engine != TranslationEngine.NONE]


def get_languages_by_region() -> dict[str, list[Language]]:
    """Group languages by region for UI display."""
    groups: dict[str, list[Language]] = {}
    for lang in ALL_LANGUAGES:
        groups.setdefault(lang.region, []).append(lang)
    return groups


def get_whisper_supported_languages() -> list[Language]:
    """Get languages that Whisper can directly transcribe (have their own ASR code)."""
    seen = set()
    result = []
    for lang in ALL_LANGUAGES:
        if lang.whisper_code == lang.code and lang.whisper_code not in seen:
            seen.add(lang.whisper_code)
            result.append(lang)
    return result
