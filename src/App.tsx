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
  Link2,
  Check,
  ArrowLeft,
  Monitor,
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

const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

// ─── App ──────────────────────────────────────────────────────────────────────
function App() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState(false);
  const [remotePassword, setRemotePassword] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const stored = localStorage.getItem("qna_auth");
    return stored !== null && stored === import.meta.env.VITE_PASSWORD;
  });
  const [secretClicks, setSecretClicks] = useState(0);
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
  const [textSent, setTextSent] = useState(false);

  useEffect(() => {
    const pwRef = ref(database, "settings/password");
    const unsubPw = onValue(pwRef, (snapshot) => {
      const dbPw = snapshot.val();
      setRemotePassword(dbPw);

      const stored = localStorage.getItem("qna_auth");
      const activePw = dbPw || import.meta.env.VITE_PASSWORD;

      if (stored !== null) {
        if (stored === activePw) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
          setRole(null);
          localStorage.removeItem("qna_auth");
        }
      }
    });

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
    return () => {
      unsubPw();
      unsubscribe();
    };
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const activePw = remotePassword || import.meta.env.VITE_PASSWORD;
    if (password === activePw) {
      localStorage.setItem("qna_auth", password);
      setIsAuthenticated(true);
      setLoginError(false);
    } else {
      setLoginError(true);
      const input = document.getElementById("pw-input");
      input?.classList.add("shake");
      setTimeout(() => input?.classList.remove("shake"), 500);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("qna_auth");
    setIsAuthenticated(false);
    setRole(null);
    setPassword("");
    setLoginError(false);
  };

  const handleOptionSelect = (opt: string) => {
    set(ref(database, "sync/option"), syncData.option === opt ? null : opt).catch(console.error);
  };

  const handleColorChange = (color: string) => {
    set(ref(database, "sync/color"), syncData.color === color ? "none" : color).catch(console.error);
  };

  const handleTextClear = () => {
    set(ref(database, "sync/text"), null)
      .then(() => {
        setHelperTextInput("");
        setShowTextPreview(false);
        setTextSent(false);
      })
      .catch(console.error);
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    set(ref(database, "sync/text"), helperTextInput)
      .then(() => {
        setTextSent(true);
        setTimeout(() => setTextSent(false), 1600);
      })
      .catch(console.error);
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
    set(ref(database, `sync/blink/${key}`), newVal).catch((err) => {
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
            <div
              className="icon-ring mb-4"
              onClick={() => {
                setSecretClicks((prev) => {
                  const next = prev + 1;
                  if (next >= 5) {
                    setTimeout(() => {
                      const newPw = prompt("Secret mode: Enter new unlock password (leave blank to reset to default):");
                      if (newPw !== null) {
                        set(ref(database, "settings/password"), newPw.trim() || null)
                          .then(() => {
                            alert("Password updated globally!");
                            setPassword("");
                          })
                          .catch((err) => alert("Failed to update password: " + err.message));
                      }
                    }, 50);
                    return 0;
                  }
                  return next;
                });
              }}
            >
              <ShieldCheck size={26} strokeWidth={1.75} />
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-white">Secure Access</h1>
            <p className="text-slate-500 text-sm mt-1.5">Enter your passphrase to continue</p>
          </div>
          <form onSubmit={handleLogin} className="flex flex-col gap-3">
            <div className="field-wrap">
              <input
                id="pw-input"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (loginError) setLoginError(false);
                }}
                className="field text-center tracking-[0.3em] text-lg"
                autoComplete="current-password"
                autoFocus
              />
              <button
                type="button"
                className="field-eye"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="field-error" role="alert">
              {loginError ? "Incorrect passphrase — try again" : "\u00A0"}
            </p>
            <button type="submit" className="btn-primary" disabled={!password.trim()}>
              Unlock
            </button>
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
            <p className="text-slate-500 text-sm mt-1.5 text-center px-2">
              Pick how this device will be used
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setRole("helper")} className="role-card">
              <div className="role-icon"><Wand2 size={20} strokeWidth={1.75} /></div>
              <span className="role-label">Helper</span>
              <span className="role-sub">Send cues &amp; signals</span>
            </button>
            <button onClick={() => setRole("naeem")} className="role-card">
              <div className="role-icon"><Monitor size={20} strokeWidth={1.75} /></div>
              <span className="role-label">Naeem</span>
              <span className="role-sub">Fullscreen display</span>
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

    const textDirty = helperTextInput !== (syncData.text || "");
    const words = wordCount(helperTextInput);
    const anyBlink = syncData.blink.option || syncData.blink.color || syncData.blink.screen;
    const hasLiveContent =
      !!syncData.option ||
      !!syncData.text ||
      syncData.color !== "none" ||
      anyBlink;

    const peekBg =
      syncData.color === "red" ? "peek-screen-red" :
        syncData.color === "green" ? "peek-screen-green" :
          "bg-[#080c14]";

    const peekBlinkClasses = [
      peekBg,
      syncData.blink.screen ? "blink-screen-active" : "",
      !syncData.blink.screen && syncData.blink.color ? "blink-color-active" : "",
    ].filter(Boolean).join(" ");

    return (
      <div className="app-bg helper-scroll">
        <div className="card animate-slide-up">

          {/* ── Header ── */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-lg font-semibold text-white leading-tight">Control Panel</h1>
              <p className="text-slate-500 text-xs mt-0.5">Sync content to Naeem&apos;s screen</p>
            </div>
            <button onClick={() => setRole(null)} className="icon-btn" title="Change role">
              <LogOut size={17} />
            </button>
          </div>

          {/* ── Live status ── */}
          <div className="status-strip" aria-live="polite">
            {hasLiveContent ? (
              <>
                <span className="status-live">
                  <span className="status-live-dot animate-live-dot" />
                  Live
                </span>
                {syncData.option && (
                  <span className="status-chip on">Option {syncData.option}</span>
                )}
                {syncData.color === "red" && <span className="status-chip red">Red</span>}
                {syncData.color === "green" && <span className="status-chip green">Green</span>}
                {anyBlink && <span className="status-chip warn">Blinking</span>}
                {syncData.text && <span className="status-chip on">Text on</span>}
              </>
            ) : (
              <span className="status-idle">Screen idle — nothing broadcasting yet</span>
            )}
          </div>

          {/* ── Section: Peek ── */}
          <div className="section">
            <div className="section-label-row">
              <label className="section-label">Peek</label>
            </div>

            <button
              onClick={() => setIsPeeking((p) => !p)}
              className={`peek-toggle ${isPeeking ? "active" : ""}`}
              aria-pressed={isPeeking}
            >
              {isPeeking ? <EyeOff size={15} /> : <Eye size={15} />}
              {isPeeking ? "Hide live preview" : "Show live preview"}
            </button>

            {isPeeking && (
              <div className="mt-0.5 flex flex-col items-center gap-1.5 animate-fade-in">
                <div
                  className={`w-full border border-white/10 overflow-hidden flex flex-col peek-screen ${peekBlinkClasses}`}
                  style={{ aspectRatio: "16/9" }}
                >
                  {syncData.option ? (
                    <>
                      <div className="flex-[0_0_60%] flex items-center justify-center">
                        <span
                          className={[
                            "font-bold leading-none",
                            syncData.color === "none" ? "text-blue-400" : "text-white/95",
                            syncData.blink.option ? "blink-option-active" : "",
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
                <p className="peek-caption">Live preview · read-only</p>
              </div>
            )}
          </div>

          {/* ── Section: Colors ── */}
          <div className="section">
            <div className="section-label-row">
              <label className="section-label">Background</label>
              {syncData.color !== "none" && (
                <span className={`status-chip ${syncData.color}`}>
                  {syncData.color === "red" ? "Red" : "Green"}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleColorChange("red")}
                className={`color-btn red ${syncData.color === "red" ? "active" : ""}`}
                aria-pressed={syncData.color === "red"}
              >
                <span className="color-dot bg-red-500" />
                Red
              </button>
              <button
                onClick={() => handleColorChange("green")}
                className={`color-btn green ${syncData.color === "green" ? "active" : ""}`}
                aria-pressed={syncData.color === "green"}
              >
                <span className="color-dot bg-green-500" />
                Green
              </button>
            </div>
          </div>

          {/* ── Section: Options ── */}
          <div className="section">
            <div className="section-label-row">
              <label className="section-label">Option A–F</label>
              {syncData.option && (
                <span className="status-chip on">{syncData.option}</span>
              )}
            </div>
            <div className="grid grid-cols-6 gap-2">
              {["A", "B", "C", "D", "E", "F"].map((opt) => (
                <button
                  key={opt}
                  onClick={() => handleOptionSelect(opt)}
                  className={`opt-btn ${syncData.option === opt ? "active" : ""}`}
                  aria-pressed={syncData.option === opt}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* ── Section: Blink Controls ── */}
          <div className="section">
            <div className="section-label-row">
              <label className="section-label">
                <Zap size={11} />
                Blink
              </label>
              {anyBlink && <span className="status-chip warn">On</span>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleBlinkToggle("option")}
                className={`blink-btn ${syncData.blink.option ? "active" : ""}`}
                aria-pressed={syncData.blink.option}
              >
                <span className="blink-dot" />
                Letter
              </button>
              <button
                onClick={() => handleBlinkToggle("color")}
                className={`blink-btn ${syncData.blink.color ? "active" : ""}`}
                aria-pressed={syncData.blink.color}
              >
                <span className="blink-dot" />
                Color
              </button>
              <button
                onClick={() => handleBlinkToggle("screen")}
                className={`blink-btn col-span-2 ${syncData.blink.screen ? "active" : ""}`}
                aria-pressed={syncData.blink.screen}
              >
                <span className="blink-dot" />
                Whole screen
              </button>
            </div>
          </div>

          {/* ── Section: Text ── */}
          <div className="section">
            <div className="section-label-row">
              <label className="section-label">Broadcast text</label>
              {textDirty && <span className="status-chip on">Unsent</span>}
            </div>
            <form onSubmit={handleTextSubmit} className="flex flex-col gap-2">
              <textarea
                className="field resize-none text-sm leading-relaxed"
                placeholder={`Type a message...\nBare URL: https://example.com\nMarkdown: [label](https://url.com)`}
                value={helperTextInput}
                onChange={(e) => {
                  setHelperTextInput(e.target.value);
                  setShowTextPreview(false);
                }}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    e.preventDefault();
                    (e.currentTarget.form as HTMLFormElement | null)?.requestSubmit();
                  }
                }}
                rows={3}
              />

              <div className="text-meta">
                <span>
                  {words > 0 ? `${words} word${words === 1 ? "" : "s"}` : "Empty"}
                  {" · "}
                  Ctrl+Enter to send
                </span>
                {textDirty ? <span className="dirty">Not on screen yet</span> : null}
              </div>

              {hasLinks && (
                <div className="hint-banner">
                  <Link2 size={13} strokeWidth={2} />
                  Links will be tappable on Naeem&apos;s screen
                </div>
              )}

              {(showTextPreview || hasLinks) && helperTextInput.trim() && (
                <div className="preview-box animate-fade-in">
                  <p className="preview-label">Preview</p>
                  <p className="text-sm text-white/75 leading-relaxed wrap-break-word">
                    {renderTextWithLinks(helperTextInput)}
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="submit"
                  className={`btn-primary ${textDirty ? "is-dirty" : ""}`}
                  disabled={!textDirty}
                >
                  {textSent ? (
                    <>
                      <Check size={15} />
                      Sent
                    </>
                  ) : (
                    "Send"
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleTextClear}
                  className="btn-danger shrink-0 px-4"
                  disabled={!helperTextInput && !syncData.text}
                >
                  Clear
                </button>
              </div>
            </form>
          </div>

          {/* ── Footer ── */}
          <div className="helper-footer">
            <button
              onClick={handleReset}
              className={`btn-danger w-full ${resetSuccess ? "btn-success" : ""}`}
              disabled={!hasLiveContent && !resetSuccess}
            >
              {resetSuccess ? <Check size={15} /> : <RotateCcw size={15} />}
              {resetSuccess ? "Screen cleared" : "Reset Naeem's screen"}
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

    const rootClasses = [
      "naeem-root",
      colorClass,
      blink.screen ? "blink-screen-active" : "",
      !blink.screen && blink.color ? "blink-color-active" : "",
    ].filter(Boolean).join(" ");

    return (
      <div className={rootClasses}>
        {hasOption ? (
          <>
            <div className="naeem-top">
              <span className={[
                "naeem-letter",
                blink.option ? "blink-option-active" : "animate-pop-in",
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
                    {copied ? <Check size={15} /> : <Copy size={15} />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              ) : (
                <span className="naeem-idle-sm animate-pulse-slow">Waiting for text</span>
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
                  {copied ? <Check size={15} /> : <Copy size={15} />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            ) : (
              <div className="naeem-idle-wrap">
                <div className="naeem-idle-ring" aria-hidden>
                  <div className="naeem-idle-ring-inner" />
                </div>
                <span className="naeem-idle">Waiting for cue</span>
                <span className="naeem-idle-hint">Helper will push the next signal</span>
              </div>
            )}
          </div>
        )}

        <button onClick={() => setRole(null)} className="naeem-back" title="Change role">
          <ArrowLeft size={14} />
          Back
        </button>
      </div>
    );
  }

  return null;
}

export default App;
