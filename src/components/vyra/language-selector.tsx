import { useState } from "react";
import { Check, Camera } from "lucide-react";

export interface LanguageOption {
  code: string;
  name: string;
  nativeText: string;
  romanText: string;
  isArabic?: boolean;
}

// Sample languages for the UI based on the design
export const PREVIEW_LANGUAGES: LanguageOption[] = [
  {
    code: "hi",
    name: "Hindi",
    nativeText: "स्क्रीन पर देखे के अनुसार",
    romanText: "Screen par dekhe ke anusar",
  },
  {
    code: "en",
    name: "English",
    nativeText: "As it appears on screen",
    romanText: "As it appears on screen",
  },
  {
    code: "ne",
    name: "Nepali",
    nativeText: "स्क्रिनमा देखिए जस्तै",
    romanText: "Screenma dekhiye jastai",
  },
  {
    code: "ur",
    name: "Urdu",
    nativeText: "جیسا کہ اسکرین پر ظاہر ہوتا ہے",
    romanText: "Jaisa ke screen par zahir hota hai",
  },
  {
    code: "ta",
    name: "Tamil",
    nativeText: "திரையில் தோன்றுவது போல்",
    romanText: "Thiraiyil thonruvathu pol",
  },
  {
    code: "ml",
    name: "Malayalam",
    nativeText: "സ്ക്രീനിൽ കാണുന്നതുപോലെ",
    romanText: "Screenil kanunnathupole",
  },
  {
    code: "gu",
    name: "Gujarati",
    nativeText: "સ્ક્રીન પર દેખાય છે તેમ",
    romanText: "Screen par dekhay che tem",
  },
  {
    code: "bn",
    name: "Bengali",
    nativeText: "স্ক্রিনে যেমন দেখা যাচ্ছে",
    romanText: "Screene jemon dekha jacche",
  },
  {
    code: "pa",
    name: "Punjabi",
    nativeText: "ਜਿਵੇਂ ਸਕਰੀਨ 'ਤੇ ਦਿਖਾਈ ਦਿੰਦਾ ਹੈ",
    romanText: "Jiwen screen te dikhai dinda hai",
  },
  {
    code: "te",
    name: "Telugu",
    nativeText: "స్క్రీన్‌పై కనిపించినట్లు",
    romanText: "Screenpai kanipinchinatlu",
  },
  {
    code: "sd",
    name: "Sindhi",
    nativeText: "جيئن اسڪرين تي ظاهر ٿئي ٿو",
    romanText: "Jien screen te zahir thie tho",
  },
  {
    code: "mr",
    name: "Marathi",
    nativeText: "स्क्रीनवर दिसल्याप्रमाणे",
    romanText: "Screenvar dislyapramane",
  },
  {
    code: "kn",
    name: "Kannada",
    nativeText: "ಪರದೆಯ ಮೇಲೆ ಕಾಣುವಂತೆ",
    romanText: "Paradeya mele kaanuvante",
  },
  {
    code: "ps",
    name: "Pushto",
    nativeText: "لکه څنګه چې په سکرین ښکاري",
    romanText: "Laka tsanga che pa screen khkari",
  },
  {
    code: "ms",
    name: "Malay",
    nativeText: "Seperti yang kelihatan di skrin",
    romanText: "Seperti yang kelihatan di skrin",
  },
  {
    code: "as",
    name: "Assamese",
    nativeText: "স্ক্ৰীণত দেখাৰ দৰে",
    romanText: "Screenot dekhar dore",
  },
  {
    code: "ks",
    name: "Kashmiri",
    nativeText: "يِتھ کٔنۍ سِکريٖنَس پؠٹھ چھُ وُچھنہٕ یِوان",
    romanText: "Yith kan screenas pyath chu wuchne yiwan",
  },
  {
    code: "fa",
    name: "Persian",
    nativeText: "همانطور که در صفحه نمایش داده می شود",
    romanText: "Hamantor ke dar safhe namayesh dade mishavad",
  },
  {
    code: "ar",
    name: "Arabic",
    nativeText: "ترجم باللغة العربية.",
    romanText: "Kama tara tazhar ala al-shasha",
    isArabic: true,
  },
  {
    code: "or",
    name: "Odia",
    nativeText: "ସ୍କ୍ରିନରେ ଦେଖାଯିବା ପରି",
    romanText: "Screenre dekhajiba pari",
  },
];

interface LanguageSelectorProps {
  selectedLang: string;
  onSelectLang: (code: string) => void;
  script: "native" | "roman";
  onSelectScript: (script: "native" | "roman") => void;
}

export function LanguageSelector({
  selectedLang,
  onSelectLang,
  script,
  onSelectScript,
}: LanguageSelectorProps) {
  const selectedPreview =
    PREVIEW_LANGUAGES.find((l) => l.code === selectedLang) ||
    PREVIEW_LANGUAGES.find((l) => l.code === "ar")!;

  return (
    <div className="w-full max-w-[1000px] mx-auto py-6 sm:py-10">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Left Column: Language Selection */}
        <div className="bg-[#111312] border border-white/5 rounded-2xl p-4 sm:p-8 flex flex-col min-h-[380px] sm:min-h-[450px]">
          <h2 className="text-xl font-semibold text-center text-white mb-6 sm:mb-10">
            Select your Language
          </h2>

          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3 max-w-[400px]">
              {PREVIEW_LANGUAGES.map((lang, idx) => {
                const isSelected = selectedLang === lang.code;
                const rotation = idx % 3 === 0 ? "-2deg" : idx % 2 === 0 ? "1deg" : "-1deg";
                const yOffset = idx % 2 === 0 ? "2px" : "-2px";

                return (
                  <button
                    key={lang.code}
                    onClick={() => onSelectLang(lang.code)}
                    style={{ transform: `rotate(${rotation}) translateY(${yOffset})` }}
                    className={`
                      px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs font-medium transition-all duration-300 flex items-center gap-1.5
                      ${
                        isSelected
                          ? "bg-[#18392B] text-[#4ADE80] border border-[#23533E] hover:bg-[#1C4233]"
                          : "bg-transparent text-white/70 border border-white/10 hover:border-white/20 hover:text-white hover:bg-white/5"
                      }
                    `}
                  >
                    {isSelected && <Check size={12} className="text-[#4ADE80]" />}
                    {lang.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Preview & Script Toggle */}
        <div className="bg-[#0A0D0B] border border-white/5 rounded-2xl overflow-hidden relative min-h-[340px] sm:min-h-[450px] flex flex-col group">
          {/* Background image mockup */}
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-gradient-to-br from-[#0F221B] to-[#0A0D0B] opacity-80" />
            <img
              src="https://images.unsplash.com/photo-1621609764180-2ca554a9d6f2?auto=format&fit=crop&q=80&w=800"
              alt="Preview Speaker"
              className="w-full h-full object-cover opacity-60 mix-blend-luminosity"
            />
            <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-black/60 to-transparent" />
            <div className="absolute bottom-0 inset-x-0 h-64 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
          </div>

          <div className="absolute top-4 right-4 z-10 text-white/60">
            <Camera size={18} />
          </div>

          {/* Subtitle Overlay */}
          <div className="relative z-10 flex-1 flex flex-col justify-end p-4 pb-20 sm:p-8 sm:pb-24">
            <div className="text-center w-full">
              {script === "native" ? (
                <p
                  className={`text-xl sm:text-2xl font-bold text-white drop-shadow-md ${selectedPreview.isArabic ? "font-arabic" : ""}`}
                  dir={selectedPreview.isArabic ? "rtl" : "ltr"}
                >
                  {selectedPreview.isArabic ? (
                    <>
                      ترجم <span className="text-[#F5A623]">باللغة</span> العربية.
                    </>
                  ) : (
                    selectedPreview.nativeText
                  )}
                </p>
              ) : (
                <div className="inline-block bg-white text-black px-3 py-1.5 rounded-lg text-lg font-bold">
                  {selectedPreview.isArabic ? (
                    <>
                      <span className="text-black">Kama</span>{" "}
                      <span className="text-black/40">tara tazhar ala al-shasha</span>
                    </>
                  ) : (
                    selectedPreview.romanText
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Script Toggles */}
          <div className="absolute bottom-8 inset-x-0 flex justify-center gap-4 z-20">
            <button
              onClick={() => onSelectScript("native")}
              className={`
                px-6 py-2 rounded-full text-xs font-medium transition-all duration-300
                ${
                  script === "native"
                    ? "bg-[#18392B] text-[#4ADE80] border border-[#23533E]"
                    : "bg-transparent text-white/70 border border-white/20 hover:text-white hover:bg-white/5"
                }
              `}
            >
              Native
            </button>
            <button
              onClick={() => onSelectScript("roman")}
              className={`
                px-6 py-2 rounded-full text-xs font-medium transition-all duration-300
                ${
                  script === "roman"
                    ? "bg-[#18392B] text-[#4ADE80] border border-[#23533E]"
                    : "bg-transparent text-white/70 border border-white/20 hover:text-white hover:bg-white/5"
                }
              `}
            >
              Roman
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
