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
} from "lucide-react";
import "./index.css";

function App() {
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [role, setRole] = useState<"helper" | "naeem" | null>(null);
  const [syncData, setSyncData] = useState<{
    option: string | null;
    text: string;
    color: string;
  }>({
    option: null,
    text: "",
    color: "none",
  });
  const [helperTextInput, setHelperTextInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  useEffect(() => {
    const syncRef = ref(database, "sync");
    const unsubscribe = onValue(syncRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setSyncData({
          option: data.option || null,
          text: data.text || "",
          color: data.color || "none",
        });
        if (data.text) setHelperTextInput(data.text);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === import.meta.env.VITE_PASSWORD) {
      setIsAuthenticated(true);
    } else {
      const input = document.getElementById("pw-input");
      input?.classList.add("shake");
      setTimeout(() => input?.classList.remove("shake"), 500);
    }
  };

  const handleOptionSelect = (opt: string) => {
    const newVal = syncData.option === opt ? null : opt;
    set(ref(database, "sync/option"), newVal).catch(console.error);
  };

  const handleColorChange = (color: string) => {
    set(ref(database, "sync/color"), color).catch(console.error);
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    set(ref(database, "sync/text"), helperTextInput).catch(console.error);
  };

  const handleReset = () => {
    set(ref(database, "sync"), { option: null, text: null, color: "none" })
      .then(() => {
        setHelperTextInput("");
        setResetSuccess(true);
        setTimeout(() => setResetSuccess(false), 2000);
      })
      .catch(console.error);
  };

  const handleCopy = () => {
    if (syncData.text) {
      navigator.clipboard.writeText(syncData.text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
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
            <h1 className="text-xl font-semibold tracking-tight text-white">
              Secure Access
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Enter your passphrase to continue
            </p>
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
            <button type="submit" className="btn-primary">
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
        <div className="card animate-slide-up">
          <div className="flex flex-col items-center mb-7">
            <div className="icon-ring mb-4">
              <Users size={24} strokeWidth={1.75} />
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-white">
              Choose Role
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Select which interface you need
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setRole("helper")} className="role-card">
              <div className="role-icon">
                <Wand2 size={20} strokeWidth={1.75} />
              </div>
              <span className="role-label">Helper</span>
              <span className="role-sub">Control panel</span>
            </button>
            <button onClick={() => setRole("naeem")} className="role-card">
              <div className="role-icon">
                <Users size={20} strokeWidth={1.75} />
              </div>
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
    return (
      <div className="app-bg helper-scroll">
        <div className="card animate-slide-up">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-lg font-semibold text-white leading-tight">
                Control Panel
              </h1>
              <p className="text-slate-500 text-xs mt-0.5">
                Sync content to Naeem's screen
              </p>
            </div>
            <button
              onClick={() => setRole(null)}
              className="icon-btn"
              title="Change role"
            >
              <LogOut size={17} />
            </button>
          </div>

          {/* Section: Colors */}
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

          {/* Section: Options */}
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

          {/* Section: Text */}
          <div className="section">
            <label className="section-label">Broadcast Text</label>
            <form onSubmit={handleTextSubmit} className="flex flex-col gap-2">
              <textarea
                className="field resize-none text-sm leading-relaxed"
                placeholder="Type a message to display..."
                value={helperTextInput}
                onChange={(e) => setHelperTextInput(e.target.value)}
                rows={3}
              />
              <button type="submit" className="btn-primary">
                Send Message
              </button>
            </form>
          </div>

          {/* Footer */}
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
    const isRed = syncData.color === "red";
    const isGreen = syncData.color === "green";
    const colorClass = isRed ? "color-red" : isGreen ? "color-green" : "color-dark";

    const hasOption = !!syncData.option;
    const hasText = !!syncData.text;

    return (
      <div className={`naeem-root ${colorClass}`}>
        {hasOption ? (
          <>
            <div className="naeem-top">
              <span className="naeem-letter animate-pop-in">
                {syncData.option}
              </span>
            </div>
            <div className="naeem-divider" />
            <div className="naeem-bottom">
              {hasText ? (
                <div className="naeem-text-area animate-fade-in">
                  <p className="naeem-text">{syncData.text}</p>
                  <button
                    onClick={handleCopy}
                    className={`copy-btn ${copied ? "copied" : ""}`}
                  >
                    <Copy size={15} />
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              ) : (
                <span className="naeem-idle-sm animate-pulse-slow">
                  No text yet
                </span>
              )}
            </div>
          </>
        ) : (
          <div className="naeem-fullscreen">
            {hasText ? (
              <div className="naeem-fulltext-area animate-fade-in">
                <p className="naeem-fulltext">{syncData.text}</p>
                <button
                  onClick={handleCopy}
                  className={`copy-btn ${copied ? "copied" : ""}`}
                >
                  <Copy size={15} />
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            ) : (
              <span className="naeem-idle animate-pulse-slow">Waiting...</span>
            )}
          </div>
        )}

        <button onClick={() => setRole(null)} className="naeem-back">
          ← Back
        </button>
      </div>
    );
  }

  return null;
}

export default App;
