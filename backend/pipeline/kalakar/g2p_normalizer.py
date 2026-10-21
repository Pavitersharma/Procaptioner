"""
Kalakar Speech Pipeline — Stage 4: Colloquial G2P Transliteration Normalizer
Implements Kalakar.io's Grapheme-to-Phoneme (G2P) normalizer for Hinglish, Roman Urdu, and Indic dialects.

Converts Devanagari / Indic script phonemes into conversational Latin script format
used by 90%+ of short-form social media creators on Instagram Reels & YouTube Shorts.

Features:
- Conversational Desi texting lexicon (e.g., 'यार' -> 'yaar', 'भाई' -> 'bhai', 'पैसा' -> 'paisa')
- English loanword restoration (e.g., 'ट्रिक' -> 'trick', 'वीडियो' -> 'video', 'टैटू' -> 'tattoo')
- Hindi schwa-deletion & conversational casing
- Dual-script token preservation (native word + roman_word)
"""

import re
import logging
from indic_transliteration import sanscript
from indic_transliteration.sanscript import transliterate

logger = logging.getLogger(__name__)

# ─── 1. High-Frequency Colloquial Hinglish & Loanword Lexicon ────────────────
COLLOQUIAL_LEXICON: dict[str, str] = {
    # Pronouns & demonstratives
    "ये": "ye",
    "यह": "yeh",
    "वो": "woh",
    "वोह": "woh",
    "आप": "aap",
    "तुम": "tum",
    "हम": "hum",
    "मैं": "main",
    "मुझे": "mujhe",
    "तुझे": "tujhe",
    "हमे": "hume",
    "हमें": "humein",
    "उसने": "usne",
    "इसने": "isne",
    "उनका": "unka",
    "इनका": "inka",
    "मेरा": "mera",
    "मेरी": "meri",
    "मेरे": "mere",
    "तेरा": "tera",
    "तेरी": "teri",
    "तेरे": "tere",
    "अपना": "apna",
    "अपनी": "apni",
    "अपने": "apne",

    # Conjunctions, adverbs & particles
    "और": "aur",
    "या": "ya",
    "तो": "toh",
    "भी": "bhi",
    "ही": "hi",
    "ना": "na",
    "नहीं": "nahi",
    "नही": "nahi",
    "मत": "mat",
    "अगर": "agar",
    "मगर": "magar",
    "लेकिन": "lekin",
    "पर": "par",
    "क्योंकि": "kyunki",
    "क्युकी": "kyuki",
    "इसलिए": "isliye",
    "तक": "tak",
    "से": "se",
    "को": "ko",
    "में": "mein",
    "पे": "pe",
    "का": "ka",
    "की": "ki",
    "के": "ke",
    "जैसे": "jaise",
    "वैसा": "waisa",
    "वैसे": "waise",
    "ऐसा": "aisa",
    "ऐसे": "aise",
    "यहाँ": "yahan",
    "यहां": "yahan",
    "वहाँ": "wahan",
    "वहां": "wahan",
    "कहाँ": "kahan",
    "कहा": "kaha",
    "कहा": "kaha",
    "कहा": "kaha",
    "जहाँ": "jahan",
    "अब": "ab",
    "कब": "kab",
    "जब": "jab",
    "तब": "tab",
    "सब": "sab",
    "क्या": "kya",
    "क्यों": "kyun",
    "क्यो": "kyun",
    "कैसे": "kaise",
    "कितना": "kitna",
    "कितने": "kitne",

    # Verbs & auxiliaries
    "है": "hai",
    "हैं": "hain",
    "हो": "ho",
    "हूँ": "hoon",
    "था": "tha",
    "थी": "thi",
    "थे": "the",
    "होगा": "hoga",
    "होगी": "hogi",
    "होंगे": "honge",
    "रहा": "raha",
    "रही": "rahi",
    "रहे": "rahe",
    "कर": "kar",
    "करो": "karo",
    "करना": "karna",
    "करके": "karke",
    "करता": "karta",
    "करती": "karti",
    "करते": "karte",
    "किया": "kiya",
    "किए": "kiye",
    "दी": "di",
    "दिया": "diya",
    "दिए": "diye",
    "दो": "do",
    "दे": "de",
    "देना": "dena",
    "लो": "lo",
    "ले": "le",
    "लेना": "lena",
    "लिया": "liya",
    "लिए": "liye",
    "ली": "li",
    "देख": "dekh",
    "देखो": "dekho",
    "देखना": "dekhna",
    "देखा": "dekha",
    "बताओ": "batao",
    "बता": "bata",
    "बोल": "bol",
    "बोलो": "bolo",
    "सुना": "suna",
    "सुनो": "suno",
    "जाओ": "jao",
    "जा": "ja",
    "गया": "gaya",
    "गई": "gayi",
    "गए": "gaye",
    "आओ": "aao",
    "आ": "aa",
    "आया": "aaya",
    "आई": "aayi",
    "आए": "aaye",
    "चल": "chal",
    "चलो": "chalo",
    "मिलेगा": "milega",
    "मिलेगी": "milegi",
    "मिलती": "milti",
    "निकल": "nikal",
    "निकलेगा": "niklega",
    "निकली": "nikli",

    # Colloquial Desi Slang (The exact examples in Kalakar's blueprint)
    "यार": "yaar",
    "भाई": "bhai",
    "पैसा": "paisa",
    "पैसे": "paise",
    "सीन": "scene",
    "मस्त": "mast",
    "बहुत": "bohot",
    "बोहोत": "bohot",
    "बड़ा": "bada",
    "बड़ी": "badi",
    "बड़े": "bade",
    "छोटा": "chhota",
    "अच्छा": "accha",
    "अच्छी": "acchi",
    "अच्छे": "acche",
    "सच्ची": "sachi",
    "खतरनाक": "khatarnak",
    "ज़बरदस्त": "zabardast",
    "जबरदस्त": "zabardast",
    "एकदम": "ekdum",
    "बिल्कुल": "bilkul",
    "प्यारे": "pyare",
    "वाले": "wale",
    "वालों": "walon",
    "चीज़": "cheez",
    "चीज": "cheez",
    "बात": "baat",
    "काम": "kaam",
    "टाइम": "time",
    "दिन": "din",
    "रात": "raat",
    "सुबह": "subah",
    "शाम": "shaam",
    "घर": "ghar",
    "जगह": "jagah",
    "लोग": "log",
    "दोस्त": "dost",
    "तरीका": "tareeka",
    "फायदा": "fayda",
    "नुकसान": "nuksan",

    # Common English Loanwords (Restored to accurate Latin spelling)
    "ट्रिक": "trick",
    "ट्रिक्स": "tricks",
    "वीडियो": "video",
    "कंटेंट": "content",
    "क्रिएटर": "creator",
    "एडिटिंग": "editing",
    "सब्सक्राइब": "subscribe",
    "फॉलो": "follow",
    "लाइक": "like",
    "शेयर": "share",
    "कमेंट": "comment",
    "डेमो": "demo",
    "टैटू": "tattoo",
    "ब्लैकनेस": "blackness",
    "क्लीनिंग": "cleaning",
    "गारंटी": "guarantee",
    "वारंटी": "warranty",
    "अपग्रेड": "upgrade",
    "वर्जन": "version",
    "रिजल्ट": "result",
    "परसेंट": "percent",
    "मशीन": "machine",
    "परमानेंट": "permanent",
    "ग्राउंड": "ground",
    "क्रिकेट": "cricket",
    "मोबाइल": "mobile",
    "फोन": "phone",
    "लैपटॉप": "laptop",
    "स्क्रीन": "screen",
    "ऑनलाइन": "online",
    "ऑफलाइन": "offline",
    "कैमरा": "camera",
    "माइक": "mic",
    "स्टूडियो": "studio",
    "ऑडियो": "audio",
    "क्वालिटी": "quality",
    "प्राइम": "prime",
    "वायरल": "viral",
    "ट्रेंड": "trend",
    "ट्रेंडिंग": "trending",
    "सुपर": "super",
    "फास्ट": "fast",
    "लिंक": "link",
    "बायो": "bio",
}

# Regex to check if text contains Devanagari characters
DEVANAGARI_REGEX = re.compile(r"[\u0900-\u097F]")


def contains_devanagari(text: str) -> bool:
    """Returns True if text contains at least one Devanagari character."""
    return bool(DEVANAGARI_REGEX.search(text))


def clean_schwa(roman_text: str) -> str:
    """
    Apply conversational Hindi schwa deletion to sanskritized transliterations.
    e.g., 'bahuta' -> 'bahut', 'Trika' -> 'trick', 'sIna' -> 'seen', 'bhAI' -> 'bhai'.
    """
    text = roman_text

    # Replace uppercase Sanskrit markers with colloquial equivalents
    text = text.replace("aa", "a").replace("AA", "a").replace("A", "a")
    text = text.replace("ee", "i").replace("II", "i").replace("I", "i")
    text = text.replace("oo", "u").replace("UU", "u").replace("U", "u")
    text = text.replace("ai", "ai").replace("AI", "ai")
    text = text.replace("au", "au").replace("AU", "au")
    text = text.replace("kh", "kh").replace("KH", "kh")
    text = text.replace("gh", "gh").replace("GH", "gh")
    text = text.replace("ch", "ch").replace("CH", "ch")
    text = text.replace("jh", "jh").replace("JH", "jh")
    text = text.replace("Th", "th").replace("TH", "th")
    text = text.replace("Dh", "dh").replace("DH", "dh")
    text = text.replace("th", "th").replace("dh", "dh")
    text = text.replace("ph", "f").replace("PH", "f")
    text = text.replace("bh", "bh").replace("BH", "bh")
    text = text.replace("sh", "sh").replace("Sh", "sh").replace("SH", "sh")
    text = text.replace("R", "r")
    text = text.replace("T", "t")
    text = text.replace("D", "d")
    text = text.replace("N", "n")

    # Word-final schwa deletion: drop trailing 'a' if preceded by consonant and word > 3 chars
    # e.g., 'paisa' keeps 'a', but 'bahuta' becomes 'bahut', 'kara' becomes 'kar'
    if len(text) > 3 and text.endswith("a") and not text.endswith(("aa", "ia", "ya", "sa", "ga", "na", "ka")):
        text = text[:-1]

    return text.lower()


def normalise_word_to_hinglish(word: str) -> str:
    """
    Transliterate a single word from Devanagari to conversational Roman Hinglish.
    Preserves existing Latin words as-is.
    """
    clean_w = word.strip(".,!?;:\"'()[]{}")
    if not clean_w:
        return word

    # 1. If word is already English / Latin, keep it
    if not contains_devanagari(clean_w):
        return word

    # 2. Check high-frequency colloquial dictionary
    if clean_w in COLLOQUIAL_LEXICON:
        matched = COLLOQUIAL_LEXICON[clean_w]
        # Preserve original trailing/leading punctuation
        return word.replace(clean_w, matched)

    # 3. Fallback to algorithmic phonetic transliteration
    try:
        raw_roman = transliterate(clean_w, sanscript.DEVANAGARI, sanscript.ITRANS)
        refined = clean_schwa(raw_roman)
        return word.replace(clean_w, refined)
    except Exception as e:
        logger.debug(f"Transliteration fallback error for '{clean_w}': {e}")
        return word


def normalise_to_roman_hinglish(tokens: list) -> list:
    """
    Takes a list of word tokens and populates token.roman_word with conversational Hinglish.
    Compatible with WordSegment objects or dictionaries.
    """
    for token in tokens:
        # If token is WordSegment object
        if hasattr(token, "word"):
            raw_w = token.word
            roman_w = normalise_word_to_hinglish(raw_w)
            token.roman_word = roman_w
        elif isinstance(token, dict):
            raw_w = token.get("word", "")
            roman_w = normalise_word_to_hinglish(raw_w)
            token["roman_word"] = roman_w

    return tokens


def transliterate_full_text(text: str) -> str:
    """
    Transliterate a full sentence/paragraph into conversational Roman Hinglish.
    """
    words = text.split()
    roman_words = [normalise_word_to_hinglish(w) for w in words]
    return " ".join(roman_words)
