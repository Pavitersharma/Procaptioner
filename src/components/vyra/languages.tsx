import { useEffect, useState } from "react";
import { SectionTag } from "./primitives";

const LANGS = [
  { name: "English", line: "Your story matters.", engine: "whisper" },
  { name: "Hindi", line: "आपकी कहानी महत्वपूर्ण है।", engine: "indictrans2" },
  { name: "Punjabi", line: "ਤੁਹਾਡੀ ਕਹਾਣੀ ਮਹੱਤਵਪੂਰਨ ਹੈ।", engine: "indictrans2" },
  { name: "Tamil", line: "உங்கள் கதை முக்கியமானது.", engine: "indictrans2" },
  { name: "Bengali", line: "আপনার গল্প গুরুত্বপূর্ণ।", engine: "indictrans2" },
  { name: "Telugu", line: "మీ కథ ముఖ్యమైనది.", engine: "indictrans2" },
  { name: "Marathi", line: "तुमची गोष्ट महत्त्वाची आहे.", engine: "indictrans2" },
  { name: "Gujarati", line: "તમારી વાર્તા મહત્વપૂર્ણ છે.", engine: "indictrans2" },
  { name: "Kannada", line: "ನಿಮ್ಮ ಕಥೆ ಮುಖ್ಯ.", engine: "indictrans2" },
  { name: "Malayalam", line: "നിങ്ങളുടെ കഥ പ്രധാനമാണ്.", engine: "indictrans2" },
  { name: "Odia", line: "ଆପଣଙ୍କ କାହାଣୀ ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ।", engine: "indictrans2" },
  { name: "Assamese", line: "আপোনাৰ কাহিনী গুৰুত্বপূৰ্ণ।", engine: "indictrans2" },
  { name: "Urdu", line: "آپ کی کہانی اہم ہے۔", engine: "indictrans2" },
  { name: "Bhojpuri", line: "रउआ कहानी महत्वपूर्ण बा।", engine: "nllb" },
  { name: "Nepali", line: "तपाईंको कथा महत्त्वपूर्ण छ।", engine: "indictrans2" },
  { name: "Sanskrit", line: "भवतः कथा महत्त्वपूर्णा अस्ति।", engine: "indictrans2" },
  { name: "Japanese", line: "あなたの物語は大切です。", engine: "nllb" },
  { name: "Spanish", line: "Tu historia importa.", engine: "nllb" },
];

export function Languages() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % LANGS.length), 2200);
    return () => clearInterval(t);
  }, []);
  const current = LANGS[i] ?? LANGS[0]!;

  return (
    <section id="languages" className="relative border-t border-border py-24 md:py-40">
      <div className="mx-auto max-w-[1280px] px-5 md:px-10">
        <SectionTag index="05">Multilingual</SectionTag>
        <h2 className="text-display mt-8 text-[clamp(2.4rem,6vw,5.5rem)]">
          One voice.
          <br />
          <span className="text-muted-foreground">Every language.</span>
        </h2>

        <div className="relative mt-16 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center">
          <ul className="flex flex-wrap gap-2">
            {LANGS.map((l, idx) => (
              <li key={l.name}>
                <button
                  onClick={() => setI(idx)}
                  className={`border px-3.5 py-2 font-mono text-[0.65rem] tracking-[0.14em] uppercase transition-all duration-300 ${
                    idx === i
                      ? "border-accent text-accent"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                  style={{ transform: idx === i ? "translateY(-2px)" : undefined }}
                >
                  {l.name}
                </button>
              </li>
            ))}
          </ul>

          <div className="relative aspect-[16/9] overflow-hidden border border-border bg-[radial-gradient(ellipse_at_50%_0%,var(--surface-2),#050505)]">
            <div className="absolute inset-0 grid place-items-center px-8">
              <p
                key={current.name}
                className="animate-[fade-in_0.5s_cubic-bezier(0.16,1,0.3,1)] text-center text-[clamp(1.4rem,3.4vw,2.6rem)] leading-tight font-semibold tracking-tight text-white"
              >
                {current.line}
              </p>
            </div>
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between border-t border-white/10 px-4 py-3">
              <span className="font-mono text-[0.6rem] tracking-[0.18em] text-white/60 uppercase">
                {current.name} ·{" "}
                {current.engine === "indictrans2"
                  ? "★ IndicTrans2"
                  : current.engine === "nllb"
                    ? "NLLB-200"
                    : "Whisper"}
              </span>
              <span className="font-mono text-[0.6rem] tracking-[0.18em] text-accent uppercase">
                {current.engine === "whisper" ? "Direct ASR" : "AI translated"} · 70+ langs
              </span>
            </div>
          </div>
        </div>

        {/* split translation UI */}
        <div className="mt-14 grid gap-px border border-border bg-border md:grid-cols-2">
          {[
            {
              label: "Source · English",
              rows: [
                "Today we're building something…",
                "Most editors lose four hours a week.",
                "We wanted that number to be zero.",
              ],
            },
            { label: `Target · ${current.name}`, rows: [current.line, "—", "—"] },
          ].map((col, ci) => (
            <div key={col.label} className="bg-surface-0 p-5">
              <p className="label-mono mb-4">{col.label}</p>
              {col.rows.map((r, ri) => (
                <p
                  key={ri}
                  className={`border-b border-border py-3 text-sm ${ci === 1 ? "text-foreground" : "text-muted-foreground"}`}
                >
                  {r}
                </p>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
