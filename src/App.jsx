import { useState, useRef, useEffect, useCallback } from "react";

const API_BASE = "https://python-chatbot-p599.onrender.com";

// ── Markdown renderer ─────────────────────────────────────────────────────────
function escHtml(s) { return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
function stripHtml(s) { return s.replace(/<[^>]+>/g, ""); }

function renderTable(tableText) {
  const rows = tableText.trim().split("\n").filter(r => r.trim());
  if (rows.length < 2) return tableText;
  let html = '<div class="md-table-wrap"><table class="md-table">';
  rows.forEach((row, i) => {
    if (/^\|[-| :]+\|$/.test(row.trim())) return; // skip separator row
    const cells = row.split("|").filter((_, ci) => ci > 0 && ci < row.split("|").length - 1);
    const tag = i === 0 ? "th" : "td";
    html += "<tr>" + cells.map(c => `<${tag}>${c.trim()}</${tag}>`).join("") + "</tr>";
  });
  html += "</table></div>";
  return html;
}

function renderMarkdown(text) {
  if (!text) return "";

  // Fix HTML entities from server
  text = text.replace(/&gt;/g, ">").replace(/&lt;/g, "<").replace(/&amp;/g, "&");

  // Code blocks first
  text = text.replace(/```(\w+)?\n?([\s\S]*?)```/g, (_, lang, code) =>
    `<pre class="code-block"><code class="lang-${lang||"python"}">${escHtml(code.trim())}</code></pre>`);

  // Tables — detect | col | col | pattern
  text = text.replace(/((?:\|.+\|\n?)+)/g, (match) => {
    if (match.includes("|") && match.split("\n").filter(Boolean).length >= 2) {
      return renderTable(match);
    }
    return match;
  });

  // Horizontal rules
  text = text.replace(/^---+$/gm, '<hr class="md-hr" />');

  // Headings
  text = text.replace(/^(#{1,3})\s(.+)/gm, (_, h, t) =>
    `<h${h.length} class="md-h md-h${h.length}">${t}</h${h.length}>`);

  // Bold
  text = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // Inline code
  text = text.replace(/`([^`]+)`/g, "<code class='inline-code'>$1</code>");

  // Bullet lists
  text = text.replace(/^[\-\*•▸→]\s(.+)/gm, "<li>$1</li>");
  text = text.replace(/(<li>.*?<\/li>\n?)+/gs, m => `<ul>${m}</ul>`);

  // Arrow lines like → Step 1:
  text = text.replace(/^(→|▸|💡|⚠️|🔄|📊|📥|📤|🧪)\s(.+)/gm,
    (_, icon, t) => `<p class="icon-line"><span class="icon-bullet">${icon}</span>${t}</p>`);

  // Section headers with emoji (🎯 WHEN TO USE etc)
  text = text.replace(/^([📚🌍🎯🗺️🔧💻⚖️⚡🔗🧩📊🥇🥈🥉✅❌💡⚠️🔄🧪📥📤].*?)$/gm,
    (_, t) => `<p class="section-header">${t}</p>`);

  // Paragraphs
  text = text.replace(/\n\n/g, "</p><p>");
  text = text.replace(/^(?!<[hupli]|<pre|<hr|<div|<table)(.+)/gm, (_, t) => `<p>${t}</p>`);

  return text;
}

// ── Icons ─────────────────────────────────────────────────────────────────────
const Icon = ({ d, size = 16 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
);
const SendIcon  = () => <Icon d={["M22 2L11 13","M22 2L15 22L11 13L2 9L22 2"]} />;
const BotIcon   = () => <Icon d={["M12 2a3 3 0 0 1 3 3v6H9V5a3 3 0 0 1 3-3z","M3 11h18v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V11z","M9 16h.01","M15 16h.01"]} />;
const UserIcon  = () => <Icon d={["M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2","M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"]} />;
const PlusIcon  = () => <Icon d={["M12 5v14","M5 12h14"]} size={14} />;
const TrashIcon = () => <Icon d={["M3 6h18","M19 6l-1 14H6L5 6","M10 11v6","M14 11v6","M9 6V4h6v2"]} size={13} />;
const CopyIcon  = () => <Icon d={["M8 17H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3","M13 21h6a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2z"]} size={13} />;
const StarIcon  = (p) => <Icon d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" size={13} {...p} />;
const DownloadIcon = () => <Icon d={["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4","M7 10l5 5 5-5","M12 15V3"]} size={14} />;
const SearchIcon = () => <Icon d={["M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z","M21 21l-4.35-4.35"]} size={14} />;
const StatsIcon  = () => <Icon d={["M18 20V10","M12 20V4","M6 20v-6"]} size={14} />;
const MicIcon    = () => <Icon d={["M12 1a3 3 0 0 1 3 3v8a3 3 0 0 1-6 0V4a3 3 0 0 1 3-3z","M19 10v2a7 7 0 0 1-14 0v-2","M12 19v4","M8 23h8"]} size={16} />;
const SunIcon    = () => <Icon d={["M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z","M12 1v2","M12 21v2","M4.22 4.22l1.42 1.42","M18.36 18.36l1.42 1.42","M1 12h2","M21 12h2","M4.22 19.78l1.42-1.42","M18.36 5.64l1.42-1.42"]} size={16} />;
const MoonIcon   = () => <Icon d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" size={16} />;
const CloseIcon  = () => <Icon d={["M18 6L6 18","M6 6l12 12"]} size={16} />;
const BuildIcon  = () => <Icon d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" size={14} />;
const HistoryIcon= () => <Icon d={["M1 4v6h6","M3.51 15a9 9 0 1 0 .49-4.95"]} size={14} />;
const ClearIcon  = () => <Icon d={["M3 6h18","M19 6l-1 14H6L5 6"]} size={14} />;
const CheckIcon  = () => <Icon d="M20 6L9 17l-5-5" size={13} />;

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, []);
  return (
    <div className={`toast toast-${type}`}>
      <span>{message}</span>
      <button onClick={onClose}><CloseIcon /></button>
    </div>
  );
}

// ── Typing dots ───────────────────────────────────────────────────────────────
const TypingDots = () => <span className="typing-dots"><span/><span/><span/></span>;

// ── Message bubble ────────────────────────────────────────────────────────────
function Message({ msg, onBookmark, isBookmarked }) {
  const [copied, setCopied] = useState(false);
  const isUser = msg.role === "user";

  function copyText() {
    const plain = stripHtml(renderMarkdown(msg.content));
    navigator.clipboard.writeText(plain);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className={`msg-row ${isUser ? "user-row" : "bot-row"}`}>
      <div className={`avatar ${isUser ? "avatar-user" : "avatar-bot"}`}>
        {isUser ? <UserIcon /> : <BotIcon />}
      </div>
      <div className={`bubble ${isUser ? "bubble-user" : "bubble-bot"}`}>
        {msg.streaming && !msg.content ? <TypingDots /> : (
          <div className="bubble-content"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
        )}
        {msg.streaming && msg.content && <span className="cursor-blink">▍</span>}
        {!msg.streaming && !isUser && (
          <div className="msg-actions">
            <button className={`msg-btn ${copied ? "msg-btn-done" : ""}`} onClick={copyText} title="Copy">
              {copied ? <CheckIcon /> : <CopyIcon />}
              <span>{copied ? "Copied!" : "Copy"}</span>
            </button>
            <button className={`msg-btn ${isBookmarked ? "msg-btn-starred" : ""}`}
              onClick={() => onBookmark(msg)} title="Bookmark">
              <StarIcon /><span>{isBookmarked ? "Saved" : "Save"}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sidebar item ──────────────────────────────────────────────────────────────
function SidebarItem({ chat, active, onClick, onDelete }) {
  return (
    <div className={`sidebar-item ${active ? "sidebar-item-active" : ""}`} onClick={onClick}>
      <span className="sidebar-title">{chat.title}</span>
      <button className="sidebar-delete" onClick={e => { e.stopPropagation(); onDelete(); }}>
        <TrashIcon />
      </button>
    </div>
  );
}

// ── Search Modal ──────────────────────────────────────────────────────────────
function SearchModal({ chats, onClose, onJump }) {
  const [q, setQ] = useState("");
  const results = q.length > 1
    ? chats.flatMap(c => c.messages
        .filter(m => m.content.toLowerCase().includes(q.toLowerCase()))
        .map(m => ({ chat: c, msg: m })))
    : [];
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-search" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <SearchIcon /><input autoFocus className="search-input" placeholder="Search messages…"
            value={q} onChange={e => setQ(e.target.value)} />
          <button className="modal-close" onClick={onClose}><CloseIcon /></button>
        </div>
        <div className="modal-body">
          {q.length > 1 && results.length === 0 && <p className="modal-empty">No results found.</p>}
          {results.map(({ chat, msg }, i) => (
            <div key={i} className="search-result" onClick={() => { onJump(chat.id); onClose(); }}>
              <span className="search-chat">{chat.title}</span>
              <p className="search-snippet">
                {msg.content.slice(0, 120)}{msg.content.length > 120 ? "…" : ""}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Stats Modal ───────────────────────────────────────────────────────────────
function StatsModal({ chats, bookmarks, onClose }) {
  const totalMsgs = chats.reduce((s, c) => s + c.messages.filter(m => m.role === "user").length, 0);
  const topics = chats.flatMap(c => c.messages.filter(m => m.role === "user").map(m => m.content));
  const keywords = ["inheritance","scope","loop","function","class","exception","list","dict","tuple","decorator","generator","lambda","async","file","module"];
  const topicCounts = keywords.map(k => ({
    k, count: topics.filter(t => t.toLowerCase().includes(k)).length
  })).filter(x => x.count > 0).sort((a, b) => b.count - a.count).slice(0, 6);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>📊 Stats Dashboard</h3>
          <button className="modal-close" onClick={onClose}><CloseIcon /></button>
        </div>
        <div className="modal-body">
          <div className="stats-grid">
            <div className="stat-card"><span className="stat-num">{chats.length}</span><span className="stat-label">Sessions</span></div>
            <div className="stat-card"><span className="stat-num">{totalMsgs}</span><span className="stat-label">Questions Asked</span></div>
            <div className="stat-card"><span className="stat-num">{bookmarks.length}</span><span className="stat-label">Bookmarks</span></div>
            <div className="stat-card"><span className="stat-num">{chats.reduce((s,c) => s + c.messages.length, 0)}</span><span className="stat-label">Total Messages</span></div>
          </div>
          {topicCounts.length > 0 && (
            <>
              <h4 className="stats-section-title">Topics Covered</h4>
              <div className="topic-bars">
                {topicCounts.map(({ k, count }) => (
                  <div key={k} className="topic-bar-row">
                    <span className="topic-name">{k}</span>
                    <div className="topic-bar-bg">
                      <div className="topic-bar-fill" style={{ width: `${Math.min(100, count * 33)}%` }} />
                    </div>
                    <span className="topic-count">{count}</span>
                  </div>
                ))}
              </div>
            </>
          )}
          {bookmarks.length > 0 && (
            <>
              <h4 className="stats-section-title">Recent Bookmarks</h4>
              {bookmarks.slice(0, 3).map((b, i) => (
                <div key={i} className="history-msg assistant">
                  <span className="history-role">⭐ {b.chatTitle}</span>
                  <p className="history-content">{b.content.slice(0, 150)}…</p>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Bookmarks Modal ───────────────────────────────────────────────────────────
function BookmarksModal({ bookmarks, onDelete, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>⭐ Bookmarks ({bookmarks.length})</h3>
          <button className="modal-close" onClick={onClose}><CloseIcon /></button>
        </div>
        <div className="modal-body">
          {bookmarks.length === 0 && <p className="modal-empty">No bookmarks yet. Click "Save" on any answer.</p>}
          {bookmarks.map((b, i) => (
            <div key={i} className="history-msg assistant">
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span className="history-role">⭐ {b.chatTitle}</span>
                <button className="msg-btn" style={{ opacity:0.6 }} onClick={() => onDelete(i)}><TrashIcon /></button>
              </div>
              <p className="history-content">{b.content.slice(0, 200)}{b.content.length > 200 ? "…" : ""}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── History Modal ─────────────────────────────────────────────────────────────
function HistoryModal({ history, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Chat History ({Math.floor(history.length / 2)} turns)</h3>
          <button className="modal-close" onClick={onClose}><CloseIcon /></button>
        </div>
        <div className="modal-body">
          {history.length === 0 && <p className="modal-empty">No history yet.</p>}
          {history.map((msg, i) => (
            <div key={i} className={`history-msg ${msg.role}`}>
              <span className="history-role">{msg.role === "user" ? "🧑 You" : "🤖 Bot"}</span>
              <p className="history-content">{msg.content.slice(0, 200)}{msg.content.length > 200 ? "…" : ""}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Suggestions ───────────────────────────────────────────────────────────────
const SUGGESTIONS = [
  "What is Python inheritance?","Explain variable scope in Python",
  "Write a program to reverse a string","What are magic methods in Python?",
  "Implement a stack using a list","Explain exception handling in Python",
];

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [chats, setChats]           = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [input, setInput]           = useState("");
  const [loading, setLoading]       = useState(false);
  const [buildingVectors, setBuildingVectors] = useState(false);
  const [toasts, setToasts]         = useState([]);
  const [darkMode, setDarkMode]     = useState(true);
  const [bookmarks, setBookmarks]   = useState(() => {
    try { return JSON.parse(localStorage.getItem("pytutor-bookmarks") || "[]"); } catch { return []; }
  });
  const [modal, setModal]           = useState(null); // 'history'|'search'|'stats'|'bookmarks'
  const [historyData, setHistoryData] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const bottomRef   = useRef(null);
  const textareaRef = useRef(null);
  const recognitionRef = useRef(null);

  const activeChat = chats.find(c => c.id === activeChatId);

  // Apply theme
  useEffect(() => {
    document.body.setAttribute("data-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [activeChat?.messages]);
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) { ta.style.height = "auto"; ta.style.height = ta.scrollHeight + "px"; }
  }, [input]);

  // Save bookmarks to localStorage
  useEffect(() => {
    localStorage.setItem("pytutor-bookmarks", JSON.stringify(bookmarks));
  }, [bookmarks]);

  // ── Toast ──────────────────────────────────────────────────────────────────
  function addToast(message, type = "info") {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  }

  // ── Voice input ────────────────────────────────────────────────────────────
  function toggleVoice() {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      addToast("❌ Voice input not supported in this browser", "error"); return;
    }
    if (isListening) {
      recognitionRef.current?.stop(); setIsListening(false); return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const r = new SR();
    r.lang = "en-US"; r.interimResults = false; r.maxAlternatives = 1;
    r.onresult = e => { setInput(e.results[0][0].transcript); setIsListening(false); };
    r.onerror  = () => { addToast("❌ Voice error. Try again.", "error"); setIsListening(false); };
    r.onend    = () => setIsListening(false);
    recognitionRef.current = r;
    r.start(); setIsListening(true);
    addToast("🎙️ Listening… speak now", "info");
  }

  // ── Bookmark ───────────────────────────────────────────────────────────────
  function toggleBookmark(msg) {
    const exists = bookmarks.some(b => b.content === msg.content);
    if (exists) {
      setBookmarks(prev => prev.filter(b => b.content !== msg.content));
      addToast("Bookmark removed", "info");
    } else {
      setBookmarks(prev => [...prev, { ...msg, chatTitle: activeChat?.title || "Chat", savedAt: Date.now() }]);
      addToast("⭐ Answer bookmarked!", "success");
    }
  }

  // ── Export chat ────────────────────────────────────────────────────────────
  function exportChat() {
    if (!activeChat || activeChat.messages.length === 0) {
      addToast("⚠️ No messages to export", "warning"); return;
    }
    const lines = [`PyTutor — ${activeChat.title}`, `Exported: ${new Date().toLocaleString()}`, "=".repeat(60), ""];
    activeChat.messages.forEach(m => {
      lines.push(m.role === "user" ? `YOU: ${m.content}` : `BOT:\n${stripHtml(renderMarkdown(m.content))}`);
      lines.push("");
    });
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `pytutor-${activeChat.title.slice(0, 30).replace(/\s+/g, "-")}.txt`;
    a.click();
    addToast("📤 Chat exported!", "success");
  }

  // ── Build vectors ──────────────────────────────────────────────────────────
  async function buildVectors() {
    setBuildingVectors(true);
    addToast("⏳ Building vector store…", "info");
    try {
      const res  = await fetch(`${API_BASE}/build_vectors`, { method: "POST" });
      const data = await res.json();
      data.status === "success"
        ? addToast("✅ Vector store built!", "success")
        : addToast(`❌ ${data.message}`, "error");
    } catch { addToast("❌ Server connection failed", "error"); }
    finally { setBuildingVectors(false); }
  }

  // ── New chat ───────────────────────────────────────────────────────────────
  async function newChat() {
    try {
      const res  = await fetch(`${API_BASE}/session/new`, { method: "POST" });
      const data = await res.json();
      const chat = { id: data.session_id, sessionId: data.session_id, title: "New Chat", messages: [] };
      setChats(prev => [chat, ...prev]);
      setActiveChatId(chat.id);
      addToast("✅ New session created", "success");
      return chat.id;
    } catch { addToast("❌ Failed to create session", "error"); return null; }
  }

  // ── View history ───────────────────────────────────────────────────────────
  async function viewHistory() {
    if (!activeChatId) { addToast("⚠️ No active session", "warning"); return; }
    try {
      const res  = await fetch(`${API_BASE}/session/${activeChatId}/history`);
      const data = await res.json();
      setHistoryData(data.history || []);
      setModal("history");
    } catch { addToast("❌ Failed to fetch history", "error"); }
  }

  // ── Clear history ──────────────────────────────────────────────────────────
  async function clearHistory() {
    if (!activeChatId) { addToast("⚠️ No active session", "warning"); return; }
    try {
      await fetch(`${API_BASE}/session/${activeChatId}/clear`, { method: "POST" });
      setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, messages: [] } : c));
      addToast("🗑️ History cleared", "success");
    } catch { addToast("❌ Failed to clear", "error"); }
  }

  // ── Send message ───────────────────────────────────────────────────────────
  async function sendMessage(question, chatId) {
    if (!question.trim() || loading) return;
    let cid = chatId || activeChatId;
    if (!cid) { cid = await newChat(); if (!cid) return; }

    const userMsg = { role: "user", content: question };
    const botMsg  = { role: "assistant", content: "", streaming: true };

    setChats(prev => prev.map(c => c.id === cid
      ? { ...c,
          title: c.messages.length === 0 ? question.slice(0, 40) + (question.length > 40 ? "…" : "") : c.title,
          messages: [...c.messages, userMsg, botMsg] }
      : c));
    setInput(""); setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, session_id: cid }),
      });

      if (!res.body) {
        throw new Error("Streaming not supported");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setChats(prev => prev.map(c => c.id === cid
          ? { ...c, messages: c.messages.map((m, i) => i === c.messages.length - 1 ? { ...m, content: acc } : m) }
          : c));
      }
      setChats(prev => prev.map(c => c.id === cid
        ? { ...c, messages: c.messages.map((m, i) => i === c.messages.length - 1 ? { ...m, streaming: false } : m) }
        : c));
    } catch {
      setChats(prev => prev.map(c => c.id === cid
        ? { ...c, messages: c.messages.map((m, i) => i === c.messages.length - 1
            ? { ...m, content: "❌ Error connecting to server.", streaming: false } : m) }
        : c));
    } finally { setLoading(false); }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="app">
      {/* Toasts */}
      <div className="toast-container">
        {toasts.map(t => <Toast key={t.id} message={t.message} type={t.type} onClose={() => setToasts(p => p.filter(x => x.id !== t.id))} />)}
      </div>

      {/* Modals */}
      {modal === "history"   && <HistoryModal   history={historyData} onClose={() => setModal(null)} />}
      {modal === "search"    && <SearchModal    chats={chats} onClose={() => setModal(null)} onJump={id => { setActiveChatId(id); }} />}
      {modal === "stats"     && <StatsModal     chats={chats} bookmarks={bookmarks} onClose={() => setModal(null)} />}
      {modal === "bookmarks" && <BookmarksModal bookmarks={bookmarks}
        onDelete={i => setBookmarks(p => p.filter((_, idx) => idx !== i))}
        onClose={() => setModal(null)} />}

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <span className="sidebar-logo">🐍 PyTutor</span>
          <button className="theme-toggle" onClick={() => setDarkMode(p => !p)} title="Toggle theme">
            {darkMode ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>

        <div className="sidebar-actions">
          <button className="action-btn action-primary" onClick={newChat}><PlusIcon /> New Chat</button>
          <button className={`action-btn action-build ${buildingVectors ? "action-loading" : ""}`}
            onClick={buildVectors} disabled={buildingVectors}>
            <BuildIcon /> {buildingVectors ? "Building…" : "Build Vectors"}
          </button>
          <div className="action-row">
            <button className="action-btn action-half action-history" onClick={viewHistory} disabled={!activeChatId}>
              <HistoryIcon /> History
            </button>
            <button className="action-btn action-half action-clear" onClick={clearHistory} disabled={!activeChatId}>
              <ClearIcon /> Clear
            </button>
          </div>
          <div className="action-row">
            <button className="action-btn action-half action-export" onClick={exportChat} disabled={!activeChatId}>
              <DownloadIcon /> Export
            </button>
            <button className="action-btn action-half action-bookmark" onClick={() => setModal("bookmarks")}>
              <StarIcon /> Saves ({bookmarks.length})
            </button>
          </div>
          <div className="action-row">
            <button className="action-btn action-half action-search" onClick={() => setModal("search")}>
              <SearchIcon /> Search
            </button>
            <button className="action-btn action-half action-stats" onClick={() => setModal("stats")}>
              <StatsIcon /> Stats
            </button>
          </div>
        </div>

        <div className="sidebar-divider" />

        <div className="sidebar-list">
          {chats.length === 0 && <p className="sidebar-empty">No chats yet.<br/>Click "New Chat" to start.</p>}
          {chats.map(chat => (
            <SidebarItem key={chat.id} chat={chat} active={chat.id === activeChatId}
              onClick={() => setActiveChatId(chat.id)}
              onDelete={() => {
                setChats(p => p.filter(c => c.id !== chat.id));
                if (activeChatId === chat.id) setActiveChatId(chats.find(c => c.id !== chat.id)?.id || null);
              }} />
          ))}
        </div>

        {activeChatId && (
          <div className="sidebar-session">
            <span className="session-label">Session ID</span>
            <span className="session-id">{activeChatId.slice(0, 8)}…</span>
          </div>
        )}
        <div className="sidebar-footer">Groq · FAISS · Nomic</div>
      </aside>

      {/* Main */}
      <main className="main">
        <header className="chat-header">
          <h1 className="chat-title">{activeChat ? activeChat.title : "Python Interview Prep"}</h1>
          {activeChat && (
            <div className="header-actions">
              <span className="turn-badge">{Math.floor(activeChat.messages.length / 2)} turns</span>
              <button className="header-btn" onClick={exportChat} title="Export"><DownloadIcon /></button>
              <button className="header-btn" onClick={viewHistory} title="History"><HistoryIcon /></button>
              <button className="header-btn header-btn-danger" onClick={clearHistory} title="Clear"><ClearIcon /></button>
            </div>
          )}
        </header>

        <div className="messages">
          {!activeChat && (
            <div className="welcome">
              <div className="welcome-icon">🐍</div>
              <h2 className="welcome-title">Python Interview Prep</h2>
              <p className="welcome-sub">Ask any Python concept or coding problem.</p>
              <div className="welcome-steps">
                <div className="step"><span className="step-num">1</span><span>Click <b>Build Vectors</b> (first time only)</span></div>
                <div className="step"><span className="step-num">2</span><span>Click <b>New Chat</b> to start</span></div>
                <div className="step"><span className="step-num">3</span><span>Ask any Python question</span></div>
              </div>
              <div className="suggestions">
                {SUGGESTIONS.map(s => (
                  <button key={s} className="suggestion-btn"
                    onClick={async () => { const id = await newChat(); sendMessage(s, id); }}>{s}</button>
                ))}
              </div>
            </div>
          )}
          {activeChat?.messages.length === 0 && (
            <div className="welcome">
              <div className="welcome-icon">💬</div>
              <h2 className="welcome-title">Ask anything Python</h2>
              <p className="welcome-sub">Concept question or coding problem — your choice.</p>
              <div className="suggestions">
                {SUGGESTIONS.map(s => (
                  <button key={s} className="suggestion-btn" onClick={() => sendMessage(s)}>{s}</button>
                ))}
              </div>
            </div>
          )}
          {activeChat?.messages.map((msg, i) => (
            <Message key={i} msg={msg}
              onBookmark={toggleBookmark}
              isBookmarked={bookmarks.some(b => b.content === msg.content)} />
          ))}
          <div ref={bottomRef} />
        </div>

        <div className="input-area">
          <div className="input-box">
            <button className={`voice-btn ${isListening ? "voice-active" : ""}`}
              onClick={toggleVoice} title="Voice input">
              <MicIcon />
            </button>
            <textarea ref={textareaRef} className="input-textarea"
              placeholder={isListening ? "🎙️ Listening…" : "Ask a Python concept or coding problem…"}
              value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown} rows={1} disabled={loading} />
            <button className={`send-btn ${input.trim() && !loading ? "send-active" : ""}`}
              onClick={() => sendMessage(input)} disabled={!input.trim() || loading}>
              <SendIcon />
            </button>
          </div>
          <p className="input-hint">Enter to send · Shift+Enter new line · 🎙️ for voice</p>
        </div>
      </main>
    </div>
  );
}