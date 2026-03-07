import React, { useState, useEffect } from "react";
import { database } from "./firebaseConfig";
import { ref, onValue, set } from "firebase/database";
import {
  ShieldCheck,
  Users,
  Wand2,
  Copy,
  RotateCcw,
  LogOut,
  Eye,
  EyeOff,
  Zap,
} from "lucide-react";
import "./index.css";

// ─── Types ────────────────────────────────────────────────────────────────────
interface BlinkState {
  option: boolean;
  color: boolean;
  screen: boolean;
}

interface SyncData {
  option: string | null;
  text: string;
  color: string;
  blink: BlinkState;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Parses text into React nodes, converting URLs and [label](url) into links. */
function renderTextWithLinks(text: string): React.ReactNode[] {
  const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<>"]+)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = linkRegex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));

    if (match[1] && match[2]) {
      parts.push(
        <a key={key++} href={match[2]} target="_blank" rel="noopener noreferrer" className="naeem-link">
          {match[1]}
        </a>
      );
    } else if (match[3]) {
      parts.push(
        <a key={key++} href={match[3]} target="_blank" rel="noopener noreferrer" className="naeem-link">
          {match[3]}
        </a>
      );
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts.length > 0 ? parts : [text];
}

/** Dynamic font size based on word count. */
const getTextStyle = (text: string, isFullscreen: boolean) => {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  let size: string;
  let scroll = false;

  if (isFullscreen) {
    if (words <= 3) size = "clamp(3.5rem, 14vw, 10rem)";
    else if (words <= 6) size = "clamp(2.75rem, 11vw, 8rem)";
    else if (words <= 12) size = "clamp(2rem, 8vw, 6rem)";
    else if (words <= 20) size = "clamp(1.6rem, 6vw, 4rem)";
    else if (words <= 35) size = "clamp(1.25rem, 4vw, 3rem)";
    else { size = "clamp(1.1rem, 3.5vw, 2.25rem)"; scroll = true; }
  } else {
    if (words <= 3) size = "clamp(2rem, 8vw, 5rem)";
    else if (words <= 8) size = "clamp(1.6rem, 6vw, 3.75rem)";
    else if (words <= 15) size = "clamp(1.3rem, 5vw, 3rem)";
    else if (words <= 25) size = "clamp(1.1rem, 4vw, 2.25rem)";
    else if (words <= 40) size = "clamp(1rem, 3.5vw, 1.75rem)";
    else { size = "clamp(0.9rem, 3vw, 1.4rem)"; scroll = true; }
  }
  return { fontSize: size, overflow: scroll ? "auto" : "hidden", maxHeight: scroll ? "100%" : "unset" };
};

// ─── App ──────────────────────────────────────────────────────────────────────
function App() {
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const stored = localStorage.getItem("qna_auth");
    return stored !== null && stored === import.meta.env.VITE_PASSWORD;
  });
  const [role, setRole] = useState<"helper" | "naeem" | null>(null);
  const [syncData, setSyncData] = useState<SyncData>({
    option: null,
    text: "",
    color: "none",
    blink: { option: false, color: false, screen: false },
  });
  const [helperTextInput, setHelperTextInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [isPeeking, setIsPeeking] = useState(false);
  const [showTextPreview, setShowTextPreview] = useState(false);

  useEffect(() => {
    const syncRef = ref(database, "sync");
    const unsubscribe = onValue(syncRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setSyncData({
          option: data.option || null,
          text: data.text || "",
          color: data.color || "none",
          blink: {
            option: !!data.blink?.option,
            color: !!data.blink?.color,
            screen: !!data.blink?.screen,
          },
        });
        if (data.text) setHelperTextInput(data.text);
      } else {
        setSyncData({ option: null, text: "", color: "none", blink: { option: false, color: false, screen: false } });
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === import.meta.env.VITE_PASSWORD) {
      localStorage.setItem("qna_auth", password);
      setIsAuthenticated(true);
    } else {
      const input = document.getElementById("pw-input");
      input?.classList.add("shake");
      setTimeout(() => input?.classList.remove("shake"), 500);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("qna_auth");
    setIsAuthenticated(false);
    setRole(null);
  };

  const handleOptionSelect = (opt: string) => {
    set(ref(database, "sync/option"), syncData.option === opt ? null : opt).catch(console.error);
  };

  const handleColorChange = (color: string) => {
    set(ref(database, "sync/color"), syncData.color === color ? "none" : color).catch(console.error);
  };

  const handleTextClear = () => {
    set(ref(database, "sync/text"), null)
      .then(() => { setHelperTextInput(""); setShowTextPreview(false); })
      .catch(console.error);
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    set(ref(database, "sync/text"), helperTextInput).catch(console.error);
    if (helperTextInput.trim()) setShowTextPreview(true);
  };

  const handleReset = () => {
    set(ref(database, "sync"), {
      option: "",
      text: "",
      color: "none",
      blink: { option: false, color: false, screen: false },
    })
      .then(() => {
        setHelperTextInput("");
        setShowTextPreview(false);
        setResetSuccess(true);
        setTimeout(() => setResetSuccess(false), 2000);
      })
      .catch((err) => {
        console.error("Reset failed:", err);
        alert("Reset failed: " + err.message);
      });
  };

  const handleCopy = () => {
    if (syncData.text) {
      navigator.clipboard.writeText(syncData.text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const handleBlinkToggle = (key: keyof BlinkState) => {
    const newVal = !syncData.blink[key];
    set(ref(database, `sync/blink/${key}`), newVal)
      .then(() => console.log(`Blink ${key} set to ${newVal}`))
      .catch((err) => {
        console.error("Blink toggle failed:", err);
        alert("Blink toggle failed: " + err.message);
      });
  };

  // ─── 1. Password Screen ──────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="app-bg screen-center">
        <div className="card animate-slide-up">
          <div className="flex flex-col items-center mb-7">
            <div className="icon-ring mb-4">
              <ShieldCheck size={26} strokeWidth={1.75} />
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-white">Secure Access</h1>
            <p className="text-slate-500 text-sm mt-1">Enter your passphrase to continue</p>
          </div>
          <form onSubmit={handleLogin} className="flex flex-col gap-3">
            <input
              id="pw-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field text-center tracking-[0.3em] text-lg"
              autoComplete="current-password"
            />
            <button type="submit" className="btn-primary">Unlock</button>
          </form>
        </div>
      </div>
    );
  }

  // ─── 2. Role Selection ───────────────────────────────────────────────────────
  if (!role) {
    return (
      <div className="app-bg screen-center">
        <div className="card animate-slide-up relative">
          <button onClick={handleLogout} className="icon-btn absolute top-4 right-4" title="Log out">
            <LogOut size={17} />
          </button>
          <div className="flex flex-col items-center mb-7">
            <div className="icon-ring mb-4">
              <Users size={24} strokeWidth={1.75} />
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-white">Choose Role</h1>
            <p className="text-slate-500 text-sm mt-1">Select which interface you need</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setRole("helper")} className="role-card">
              <div className="role-icon"><Wand2 size={20} strokeWidth={1.75} /></div>
              <span className="role-label">Helper</span>
              <span className="role-sub">Control panel</span>
            </button>
            <button onClick={() => setRole("naeem")} className="role-card">
              <div className="role-icon"><Users size={20} strokeWidth={1.75} /></div>
              <span className="role-label">Naeem</span>
              <span className="role-sub">Display screen</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── 3. Helper Screen ────────────────────────────────────────────────────────
  if (role === "helper") {
    const hasLinks =
      helperTextInput.includes("http://") ||
      helperTextInput.includes("https://") ||
      /\[([^\]]+)\]\(/.test(helperTextInput);

    // Peek preview colour classes — mirroring the Naeem screen exactly
    const peekBg =
      syncData.color === "red" ? "peek-screen-red" :
        syncData.color === "green" ? "peek-screen-green" :
          "bg-[#080c14]";

    // Add blink classes to peek preview
    const peekBlinkClasses = [
      peekBg,
      syncData.blink.screen ? "blink-screen-active" : "",
      !syncData.blink.screen && syncData.blink.color ? "blink-color-active" : ""
    ].filter(Boolean).join(" ");

    return (
      <div className="app-bg helper-scroll">
        <div className="card animate-slide-up">

          {/* ── Header ── */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-lg font-semibold text-white leading-tight">Control Panel</h1>
              <p className="text-slate-500 text-xs mt-0.5">Sync content to Naeem's screen</p>
            </div>
            <button onClick={() => setRole(null)} className="icon-btn" title="Change role">
              <LogOut size={17} />
            </button>
          </div>

          {/* ── Section: Peek ── */}
          <div className="section">
            <label className="section-label">Peek at Naeem's Screen</label>

            <button
              onClick={() => setIsPeeking((p) => !p)}
              className={[
                "flex items-center gap-2 w-full px-4 py-3 rounded-xl border font-medium text-sm",
                "touch-action-manipulation select-none transition-all duration-200 cursor-pointer",
                isPeeking
                  ? "border-blue-500/60 bg-blue-500/10 text-blue-400"
                  : "border-white/10 bg-white/5 text-slate-400 hover:border-white/20",
              ].join(" ")}
            >
              {isPeeking ? <EyeOff size={15} /> : <Eye size={15} />}
              {isPeeking ? "Hide Preview" : "Show Preview"}
            </button>

            {isPeeking && (
              <div className="mt-2 flex flex-col items-center gap-1.5">
                {/* Mini Naeem screen with blink */}
                <div
                  className={`w-full rounded-xl border border-white/10 overflow-hidden flex flex-col peek-screen ${peekBlinkClasses}`}
                  style={{ aspectRatio: "16/9" }}
                >
                  {syncData.option ? (
                    <>
                      <div className="flex-[0_0_60%] flex items-center justify-center">
                        <span
                          className={[
                            "font-bold leading-none",
                            syncData.color === "none" ? "text-blue-400" : "text-white/95",
                            syncData.blink.option ? "blink-option-active" : ""
                          ].filter(Boolean).join(" ")}
                          style={{ fontSize: "clamp(1.5rem, 8vw, 4rem)" }}
                        >
                          {syncData.option}
                        </span>
                      </div>
                      <div className="h-px bg-white/10 shrink-0" />
                      <div className="flex-1 flex items-center justify-center p-2 overflow-hidden">
                        {syncData.text
                          ? <p className="text-white/90 text-center font-medium leading-snug" style={{ fontSize: "clamp(0.55rem, 2vw, 0.8rem)", wordBreak: "break-word" }}>{renderTextWithLinks(syncData.text)}</p>
                          : <span className="text-white/25 italic" style={{ fontSize: "0.65rem" }}>No text yet</span>}
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
                      {syncData.text
                        ? <p className="text-white/90 text-center font-semibold leading-snug" style={{ fontSize: "clamp(0.6rem, 2.5vw, 0.9rem)", wordBreak: "break-word" }}>{renderTextWithLinks(syncData.text)}</p>
                        : <span className="text-white/25 italic" style={{ fontSize: "0.65rem" }}>Waiting...</span>}
                    </div>
                  )}
                </div>
                <p className="text-[0.68rem] text-slate-600 tracking-wide">Live preview · read-only</p>
              </div>
            )}
          </div>

          {/* ── Section: Colors ── */}
          <div className="section">
            <label className="section-label">Background Color</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleColorChange("red")}
                className={`color-btn red ${syncData.color === "red" ? "active" : ""}`}
              >
                <span className="color-dot bg-red-500" />
                Red
              </button>
              <button
                onClick={() => handleColorChange("green")}
                className={`color-btn green ${syncData.color === "green" ? "active" : ""}`}
              >
                <span className="color-dot bg-green-500" />
                Green
              </button>
            </div>
          </div>

          {/* ── Section: Options ── */}
          <div className="section">
            <label className="section-label">Select Option (A–F)</label>
            <div className="grid grid-cols-6 gap-2">
              {["A", "B", "C", "D", "E", "F"].map((opt) => (
                <button
                  key={opt}
                  onClick={() => handleOptionSelect(opt)}
                  className={`opt-btn ${syncData.option === opt ? "active" : ""}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* ── Section: Blink Controls ── */}
          <div className="section">
            <label className="section-label flex items-center gap-1.5">
              <Zap size={11} />
              Blink Controls
            </label>
            <div className="grid grid-cols-2 gap-2">
              {/* Blink Option */}
              <button
                onClick={() => handleBlinkToggle("option")}
                className={[
                  "flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium min-h-[44px]",
                  "cursor-pointer touch-manipulation select-none transition-all duration-200",
                  syncData.blink.option
                    ? "bg-yellow-400/10 border-yellow-400/40 text-yellow-300"
                    : "bg-white/5 border-white/8 text-slate-400 hover:border-white/15",
                ].join(" ")}
              >
                <span className={[
                  "w-2 h-2 rounded-full shrink-0",
                  syncData.blink.option ? "bg-yellow-400 animate-pulse" : "bg-slate-600",
                ].join(" ")} />
                Blink Letter
              </button>

              {/* Blink Color */}
              <button
                onClick={() => handleBlinkToggle("color")}
                className={[
                  "flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium min-h-[44px]",
                  "cursor-pointer touch-manipulation select-none transition-all duration-200",
                  syncData.blink.color
                    ? "bg-yellow-400/10 border-yellow-400/40 text-yellow-300"
                    : "bg-white/5 border-white/8 text-slate-400 hover:border-white/15",
                ].join(" ")}
              >
                <span className={[
                  "w-2 h-2 rounded-full shrink-0",
                  syncData.blink.color ? "bg-yellow-400 animate-pulse" : "bg-slate-600",
                ].join(" ")} />
                Blink Color
              </button>

              {/* Blink Screen (full width) */}
              <button
                onClick={() => handleBlinkToggle("screen")}
                className={[
                  "col-span-2 flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium min-h-[44px]",
                  "cursor-pointer touch-manipulation select-none transition-all duration-200",
                  syncData.blink.screen
                    ? "bg-yellow-400/10 border-yellow-400/40 text-yellow-300"
                    : "bg-white/5 border-white/8 text-slate-400 hover:border-white/15",
                ].join(" ")}
              >
                <span className={[
                  "w-2 h-2 rounded-full shrink-0",
                  syncData.blink.screen ? "bg-yellow-400 animate-pulse" : "bg-slate-600",
                ].join(" ")} />
                Blink Whole Screen
              </button>
            </div>
          </div>

          {/* ── Section: Text ── */}
          <div className="section">
            <label className="section-label">Broadcast Text</label>
            <form onSubmit={handleTextSubmit} className="flex flex-col gap-2">
              <textarea
                className="field resize-none text-sm leading-relaxed"
                placeholder={`Type a message...\nBare URL: https://example.com\nMarkdown: [label](https://url.com)`}
                value={helperTextInput}
                onChange={(e) => { setHelperTextInput(e.target.value); setShowTextPreview(false); }}
                rows={3}
              />

              {/* Link hint */}
              {hasLinks && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/5 border border-blue-500/20 text-blue-400 text-xs font-medium">
                  🔗 Links detected — will be tappable on Naeem's screen
                </div>
              )}

              {/* Live preview */}
              {(showTextPreview || hasLinks) && helperTextInput.trim() && (
                <div className="flex flex-col gap-1 px-3.5 py-2.5 rounded-xl bg-white/3 border border-dashed border-white/10">
                  <p className="text-[0.68rem] font-medium text-slate-600 uppercase tracking-widest">Preview</p>
                  <p className="text-sm text-white/75 leading-relaxed wrap-break-word">
                    {renderTextWithLinks(helperTextInput)}
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <button type="submit" className="btn-primary">Send</button>
                <button
                  type="button"
                  onClick={handleTextClear}
                  className="btn-danger shrink-0 px-4"
                >
                  Clear
                </button>
              </div>
            </form>
          </div>

          {/* ── Footer ── */}
          <div className="pt-2 border-t border-white/5">
            <button
              onClick={handleReset}
              className={`btn-danger w-full transition-all ${resetSuccess ? "btn-success" : ""}`}
            >
              <RotateCcw size={15} />
              {resetSuccess ? "Screen Cleared!" : "Reset Naeem's Screen"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── 4. Naeem Screen ─────────────────────────────────────────────────────────
  if (role === "naeem") {
    const colorClass =
      syncData.color === "red" ? "color-red" :
        syncData.color === "green" ? "color-green" :
          "color-dark";

    const { blink } = syncData;
    const hasOption = !!syncData.option;
    const hasText = !!syncData.text;

    // Build root classes with proper blink classes
    const rootClasses = [
      "naeem-root",
      colorClass,
      blink.screen ? "blink-screen-active" : "",
      !blink.screen && blink.color ? "blink-color-active" : ""
    ].filter(Boolean).join(" ");

    return (
      <div className={rootClasses}>
        {hasOption ? (
          <>
            <div className="naeem-top">
              <span className={[
                "naeem-letter",
                blink.option ? "blink-option-active" : "animate-pop-in"
              ].filter(Boolean).join(" ")}>
                {syncData.option}
              </span>
            </div>
            <div className="naeem-divider" />
            <div className="naeem-bottom">
              {hasText ? (
                <div className="naeem-text-area animate-fade-in">
                  <p className="naeem-text" style={getTextStyle(syncData.text, false)}>
                    {renderTextWithLinks(syncData.text)}
                  </p>
                  <button onClick={handleCopy} className={`copy-btn ${copied ? "copied" : ""}`}>
                    <Copy size={15} />
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              ) : (
                <span className="naeem-idle-sm animate-pulse-slow">No text yet</span>
              )}
            </div>
          </>
        ) : (
          <div className="naeem-fullscreen">
            {hasText ? (
              <div className="naeem-fulltext-area animate-fade-in">
                <p className="naeem-fulltext" style={getTextStyle(syncData.text, true)}>
                  {renderTextWithLinks(syncData.text)}
                </p>
                <button onClick={handleCopy} className={`copy-btn ${copied ? "copied" : ""}`}>
                  <Copy size={15} />
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            ) : (
              <span className="naeem-idle animate-pulse-slow">Waiting...</span>
            )}
          </div>
        )}

        <button onClick={() => setRole(null)} className="naeem-back">← Back</button>
      </div>
    );
  }

  return null;
}

export default App;