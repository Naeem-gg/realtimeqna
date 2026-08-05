import React, { useState, useEffect } from "react";
import { database } from "./firebaseConfig";
import { ref, onValue, set } from "firebase/database";
import {
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
  Radio,
} from "lucide-react";
import "./index.css";

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

  // ─── Auth ────────────────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="shell shell-center">
        <div className="auth anim-enter">
          <div className="auth-card">
            <div className="auth-brand">
              <div
                className="auth-logo"
                onClick={() => {
                  setSecretClicks((prev) => {
                    const next = prev + 1;
                    if (next >= 5) {
                      setTimeout(() => {
                        const newPw = prompt("Admin: enter new unlock password (blank = reset default):");
                        if (newPw !== null) {
                          set(ref(database, "settings/password"), newPw.trim() || null)
                            .then(() => {
                              alert("Password updated.");
                              setPassword("");
                            })
                            .catch((err) => alert("Failed: " + err.message));
                        }
                      }, 50);
                      return 0;
                    }
                    return next;
                  });
                }}
              >
                QN
              </div>
              <h1 className="auth-title">QNA Realtime</h1>
              <p className="auth-desc">Sign in to open the live cue console</p>
            </div>
            <form onSubmit={handleLogin} className="auth-form">
              <div className="field-row">
                <input
                  id="pw-input"
                  type={showPassword ? "text" : "password"}
                  placeholder="Passphrase"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (loginError) setLoginError(false);
                  }}
                  className="field"
                  autoComplete="current-password"
                  autoFocus
                />
                <button
                  type="button"
                  className="btn-icon field-affix"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <p className="field-error" role="alert">
                {loginError ? "Incorrect passphrase" : "\u00A0"}
              </p>
              <button type="submit" className="btn btn-primary" disabled={!password.trim()}>
                Continue
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ─── Role ────────────────────────────────────────────────────────────────────
  if (!role) {
    return (
      <div className="shell shell-center">
        <div className="frame anim-enter" style={{ maxWidth: 440 }}>
          <div className="topbar">
            <div className="brand">
              <div className="brand-mark">QN</div>
              <div className="brand-text">
                <span className="brand-name">QNA Realtime</span>
                <span className="brand-sub">Select workspace</span>
              </div>
            </div>
            <button onClick={handleLogout} className="btn-icon" title="Sign out">
              <LogOut size={15} />
            </button>
          </div>
          <div className="role-grid">
            <button onClick={() => setRole("helper")} className="role-card">
              <div className="role-icon"><Wand2 size={18} strokeWidth={1.75} /></div>
              <span className="role-label">Helper</span>
              <span className="role-desc">Operator console for cues, signals, and broadcast text</span>
              <span className="role-kbd">CONTROL</span>
            </button>
            <button onClick={() => setRole("naeem")} className="role-card">
              <div className="role-icon"><Monitor size={18} strokeWidth={1.75} /></div>
              <span className="role-label">Naeem</span>
              <span className="role-desc">Fullscreen display for live answers and messages</span>
              <span className="role-kbd">DISPLAY</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Helper ──────────────────────────────────────────────────────────────────
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

    const stageClass = [
      "preview-stage",
      syncData.color === "red" ? "red" : "",
      syncData.color === "green" ? "green" : "",
      syncData.blink.screen ? "blink-screen-active" : "",
      !syncData.blink.screen && syncData.blink.color ? "blink-color-active" : "",
    ].filter(Boolean).join(" ");

    return (
      <div className="shell shell-scroll">
        <div className="frame frame-flush anim-enter">
          <div className="topbar">
            <div className="brand">
              <div className="brand-mark">QN</div>
              <div className="brand-text">
                <span className="brand-name">Control</span>
                <span className="brand-sub">Helper console</span>
              </div>
            </div>
            <div className="topbar-actions">
              <span className={`badge ${hasLiveContent ? "badge-live" : "badge-idle"}`}>
                <span className={`badge-dot ${hasLiveContent ? "anim-dot" : ""}`} />
                {hasLiveContent ? "Live" : "Idle"}
              </span>
              <button onClick={() => setRole(null)} className="btn-icon" title="Switch role">
                <LogOut size={15} />
              </button>
            </div>
          </div>

          <div className="telemetry" aria-live="polite">
            {hasLiveContent ? (
              <>
                <Radio size={12} style={{ color: "var(--color-ok)", flexShrink: 0 }} />
                {syncData.option && <span className="chip chip-accent">{syncData.option}</span>}
                {syncData.color === "red" && <span className="chip chip-red">RED</span>}
                {syncData.color === "green" && <span className="chip chip-green">GREEN</span>}
                {anyBlink && <span className="chip chip-warn">BLINK</span>}
                {syncData.text && <span className="chip">TEXT</span>}
              </>
            ) : (
              <span className="telemetry-empty">No active cues — display is clear</span>
            )}
          </div>

          <div className="body">
            {/* Preview */}
            <div className="panel">
              <div className="panel-head">
                <span className="panel-title">Monitor</span>
              </div>
              <button
                onClick={() => setIsPeeking((p) => !p)}
                className={`preview-toggle ${isPeeking ? "active" : ""}`}
                aria-pressed={isPeeking}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  {isPeeking ? <EyeOff size={14} /> : <Eye size={14} />}
                  {isPeeking ? "Hide preview" : "Show display preview"}
                </span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, opacity: 0.6 }}>
                  {isPeeking ? "ON" : "OFF"}
                </span>
              </button>

              {isPeeking && (
                <div className="anim-fade">
                  <div className={stageClass}>
                    {syncData.option ? (
                      <>
                        <div className="preview-letter">
                          <span className={syncData.blink.option ? "blink-option-active" : ""}>
                            {syncData.option}
                          </span>
                        </div>
                        <div className="preview-split" />
                        <div className="preview-text">
                          {syncData.text
                            ? renderTextWithLinks(syncData.text)
                            : <span className="preview-empty">No text</span>}
                        </div>
                      </>
                    ) : (
                      <div className="preview-text" style={{ flex: 1 }}>
                        {syncData.text
                          ? renderTextWithLinks(syncData.text)
                          : <span className="preview-empty">Waiting…</span>}
                      </div>
                    )}
                  </div>
                  <p className="preview-caption">Live · read only</p>
                </div>
              )}
            </div>

            {/* Background */}
            <div className="panel">
              <div className="panel-head">
                <span className="panel-title">Background</span>
                {syncData.color !== "none" && (
                  <span className={`chip ${syncData.color === "red" ? "chip-red" : "chip-green"}`}>
                    {syncData.color.toUpperCase()}
                  </span>
                )}
              </div>
              <div className="seg seg-2">
                <button
                  onClick={() => handleColorChange("red")}
                  className={`seg-btn red ${syncData.color === "red" ? "active" : ""}`}
                  aria-pressed={syncData.color === "red"}
                >
                  <span className="signal-dot" style={{ background: "var(--color-signal-red)" }} />
                  Red
                </button>
                <button
                  onClick={() => handleColorChange("green")}
                  className={`seg-btn green ${syncData.color === "green" ? "active" : ""}`}
                  aria-pressed={syncData.color === "green"}
                >
                  <span className="signal-dot" style={{ background: "var(--color-signal-green)" }} />
                  Green
                </button>
              </div>
            </div>

            {/* Options */}
            <div className="panel">
              <div className="panel-head">
                <span className="panel-title">Answer key</span>
                {syncData.option && <span className="chip chip-accent">{syncData.option}</span>}
              </div>
              <div className="seg seg-6">
                {["A", "B", "C", "D", "E", "F"].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => handleOptionSelect(opt)}
                    className={`seg-btn opt-btn ${syncData.option === opt ? "active" : ""}`}
                    aria-pressed={syncData.option === opt}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Blink */}
            <div className="panel">
              <div className="panel-head">
                <span className="panel-title" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Zap size={11} />
                  Attention
                </span>
                {anyBlink && <span className="chip chip-warn">ACTIVE</span>}
              </div>
              <div className="toggle-grid">
                <button
                  onClick={() => handleBlinkToggle("option")}
                  className={`toggle ${syncData.blink.option ? "active" : ""}`}
                  aria-pressed={syncData.blink.option}
                >
                  Letter
                  <span className="toggle-switch" />
                </button>
                <button
                  onClick={() => handleBlinkToggle("color")}
                  className={`toggle ${syncData.blink.color ? "active" : ""}`}
                  aria-pressed={syncData.blink.color}
                >
                  Color
                  <span className="toggle-switch" />
                </button>
                <button
                  onClick={() => handleBlinkToggle("screen")}
                  className={`toggle toggle-wide ${syncData.blink.screen ? "active" : ""}`}
                  aria-pressed={syncData.blink.screen}
                >
                  Whole screen
                  <span className="toggle-switch" />
                </button>
              </div>
            </div>

            {/* Text */}
            <div className="panel">
              <div className="panel-head">
                <span className="panel-title">Broadcast</span>
                {textDirty && <span className="chip chip-accent">UNSENT</span>}
              </div>
              <form onSubmit={handleTextSubmit}>
                <textarea
                  className="field"
                  placeholder={"Message to display…\nhttps://example.com\n[label](https://url.com)"}
                  value={helperTextInput}
                  onChange={(e) => {
                    setHelperTextInput(e.target.value);
                    setShowTextPreview(false);
                  }}
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                      e.preventDefault();
                      e.currentTarget.form?.requestSubmit();
                    }
                  }}
                  rows={3}
                />
                <div className="meta-row">
                  <span>
                    {words > 0 ? `${words} word${words === 1 ? "" : "s"}` : "Empty"}
                    {" · ⌘/Ctrl + Enter"}
                  </span>
                  {textDirty ? <span className="dirty">Not on display</span> : null}
                </div>

                {hasLinks && (
                  <div className="hint">
                    <Link2 size={13} />
                    Links open as tappable targets on the display
                  </div>
                )}

                {(showTextPreview || hasLinks) && helperTextInput.trim() && (
                  <div className="render-preview anim-fade">
                    <p className="render-preview-label">Preview</p>
                    <p className="render-preview-body">{renderTextWithLinks(helperTextInput)}</p>
                  </div>
                )}

                <div className="action-row">
                  <button
                    type="submit"
                    className={`btn btn-primary ${textDirty ? "emphasis" : ""}`}
                    disabled={!textDirty}
                  >
                    {textSent ? <><Check size={15} /> Sent</> : "Send"}
                  </button>
                  <button
                    type="button"
                    onClick={handleTextClear}
                    className="btn btn-ghost"
                    disabled={!helperTextInput && !syncData.text}
                    style={{ minWidth: 76 }}
                  >
                    Clear
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="footer-bar">
            <button
              onClick={handleReset}
              className={`btn btn-danger ${resetSuccess ? "success" : ""}`}
              style={{ width: "100%" }}
              disabled={!hasLiveContent && !resetSuccess}
            >
              {resetSuccess ? <Check size={15} /> : <RotateCcw size={15} />}
              {resetSuccess ? "Display cleared" : "Reset display"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Naeem ───────────────────────────────────────────────────────────────────
  if (role === "naeem") {
    const colorMod =
      syncData.color === "red" ? "red" :
        syncData.color === "green" ? "green" : "";
    const { blink } = syncData;
    const hasOption = !!syncData.option;
    const hasText = !!syncData.text;

    const rootClass = [
      "display",
      colorMod,
      blink.screen ? "blink-screen-active" : "",
      !blink.screen && blink.color ? "blink-color-active" : "",
    ].filter(Boolean).join(" ");

    return (
      <div className={rootClass}>
        <div className="display-chrome">
          <button onClick={() => setRole(null)} className="btn-icon" title="Back">
            <ArrowLeft size={15} />
          </button>
          <span className={`badge ${hasOption || hasText || colorMod ? "badge-live" : "badge-idle"}`}>
            <span className="badge-dot" />
            {hasOption || hasText || colorMod ? "Receiving" : "Standby"}
          </span>
        </div>

        {hasOption ? (
          <>
            <div className="display-top">
              <span className={[
                "display-letter",
                blink.option ? "blink-option-active" : "anim-pop",
              ].filter(Boolean).join(" ")}>
                {syncData.option}
              </span>
            </div>
            <div className="display-rule" />
            <div className="display-bottom">
              {hasText ? (
                <div className="display-copy-wrap anim-fade">
                  <p className="display-text" style={getTextStyle(syncData.text, false)}>
                    {renderTextWithLinks(syncData.text)}
                  </p>
                  <button onClick={handleCopy} className={`copy-btn ${copied ? "copied" : ""}`}>
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              ) : (
                <span className="wait-sm anim-pulse-soft">Waiting for text</span>
              )}
            </div>
          </>
        ) : (
          <div className="display-full">
            {hasText ? (
              <div className="display-copy-wrap anim-fade">
                <p className="display-text lg" style={getTextStyle(syncData.text, true)}>
                  {renderTextWithLinks(syncData.text)}
                </p>
                <button onClick={handleCopy} className={`copy-btn ${copied ? "copied" : ""}`}>
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            ) : (
              <div className="wait">
                <div className="wait-ring" aria-hidden>
                  <div className="wait-core" />
                </div>
                <span className="wait-title">Standby</span>
                <span className="wait-sub">Waiting for next cue</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return null;
}

export default App;
