import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { ArrowLeft, BookOpen, Check, Flame, Grid2X2, Home as HomeIcon, Lock, Play, Sparkles, Trophy, X } from "lucide-react";
import { numberCatalog, type MemoryItem } from "@/modules/number-memory/domain/catalog";
import { calculateAccuracy, createPracticeQuestion, evaluateAnswer, unlockedScope, type PracticeDirection, type ScopeSize } from "@/modules/number-memory/domain/gameplay";
import { loadLearnerSnapshot, savePersonalOverride, savePracticeSummary, sendMagicLink } from "@/modules/number-memory/application/memorySync";
import { supabase } from "@/lib/supabase";

type Screen = "home" | "learn" | "practice" | "map" | "trophies";

function MemoryIcon({ item, size = "normal" }: { item: MemoryItem; size?: "small" | "normal" }) {
  return <span className={`memory-icon memory-icon--${size}`}>{item.symbol}</span>;
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("home");
  const [scope, setScope] = useState<ScopeSize>(10);
  const [direction] = useState<PracticeDirection>("mixed");
  const [question, setQuestion] = useState(() => createPracticeQuestion(10, "mixed"));
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<ReturnType<typeof evaluateAnswer> | null>(null);
  const [answers, setAnswers] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [completedGroups, setCompletedGroups] = useState(0);
  const [learnIndex, setLearnIndex] = useState(0);
  const [remembered, setRemembered] = useState<Set<string>>(() => new Set());
  const [finished, setFinished] = useState(false);
  const [times, setTimes] = useState<number[]>([]);
  const [attempts, setAttempts] = useState<{ itemKey: string; correct: boolean; responseMs: number }[]>([]);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [totalXp, setTotalXp] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [customLabels, setCustomLabels] = useState<Record<string, string>>({});
  const [editingItem, setEditingItem] = useState<MemoryItem | null>(null);
  const [editingLabel, setEditingLabel] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authMessage, setAuthMessage] = useState("");

  useEffect(() => {
    if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/sw.js");
  }, []);

  useEffect(() => {
    if (!supabase) return;
    const hydrate = async (user: User | null) => {
      setAuthUser(user);
      if (!user) return;
      try {
        const snapshot = await loadLearnerSnapshot();
        setCompletedGroups(snapshot.completedGroups); setTotalXp(snapshot.totalXp); setCurrentStreak(snapshot.currentStreak);
        setCustomLabels(Object.fromEntries(Object.entries(snapshot.overrides).map(([key, value]) => [key, value.label || ""]).filter(([, label]) => label)));
      } catch { /* Local play remains usable if a sync request fails. */ }
    };
    void supabase.auth.getUser().then(({ data }) => { void hydrate(data.user); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => { void hydrate(session?.user ?? null); });
    return () => listener.subscription.unsubscribe();
  }, []);

  const maxScope = unlockedScope(completedGroups);
  const displayLabel = (item: MemoryItem) => customLabels[item.key] || item.label;
  const accuracy = useMemo(() => calculateAccuracy(correct, answers), [correct, answers]);
  const learnCards = numberCatalog.slice(0, 10);
  const learnItem = learnCards[learnIndex]!;

  const startPractice = (nextScope: ScopeSize = 10) => {
    setScope(nextScope > maxScope ? maxScope : nextScope);
    setQuestion(createPracticeQuestion(nextScope > maxScope ? maxScope : nextScope, direction));
    setSelected(null); setFeedback(null); setAnswers(0); setCorrect(0); setTimes([]); setAttempts([]); setFinished(false); setScreen("practice");
  };

  const answer = (key: string) => {
    if (feedback) return;
    const result = evaluateAnswer(question, key);
    const nextAnswers = answers + 1;
    const nextCorrect = correct + (result.correct ? 1 : 0);
    setSelected(key); setFeedback(result); setAnswers(nextAnswers); setCorrect(nextCorrect); setTimes((prev) => [...prev, result.responseMs]);
    const attempt = { itemKey: question.item.key, correct: result.correct, responseMs: result.responseMs };
    setAttempts((prev) => [...prev, attempt]);
    window.setTimeout(() => {
      if (nextAnswers === 10) {
        if (authUser) {
          void savePracticeSummary({ scope, direction, correctCount: nextCorrect, questionCount: nextAnswers, meanResponseMs: Math.round([...times, result.responseMs].reduce((sum, value) => sum + value, 0) / 10), totalXp: totalXp + nextCorrect * 10, completedGroups, performances: [...attempts, attempt] }).then((saved) => { setTotalXp((xp) => xp + nextCorrect * 10); setCompletedGroups(saved.completedGroups); setCurrentStreak(saved.currentStreak); });
        }
        setFinished(true); setFeedback(null);
      }
      else { setQuestion(createPracticeQuestion(scope, direction)); setSelected(null); setFeedback(null); }
    }, 700);
  };

  const nav = (target: Screen) => setScreen(target);
  const saveAssociation = () => {
    if (!editingItem) return;
    const label = editingLabel.trim() || editingItem.label;
    setCustomLabels((previous) => ({ ...previous, [editingItem.key]: label }));
    if (authUser) void savePersonalOverride({ user: authUser, itemKey: editingItem.key, label });
    setEditingItem(null);
  };
  const requestSync = async (event: React.FormEvent) => {
    event.preventDefault();
    const { error } = await sendMagicLink(authEmail.trim());
    setAuthMessage(error ? "Chưa thể gửi liên kết." : "Kiểm tra email để tiếp tục.");
  };

  return <div className="native-page"><main className="native-app">
    <header className="native-topbar">
      <button className="profile-glyph" onClick={() => authUser ? nav("trophies") : setAuthOpen(true)}>MF</button>
      <div className="top-metrics"><span><Flame size={15} /> {currentStreak || 0}</span><span className="level-dot">1</span></div>
    </header>

    {screen === "home" && <section className="screen home-screen">
      <div className="hello"><p>Memory Forge</p><h1>Rèn trí nhớ<br /><em>trong 5 phút.</em></h1></div>
      <button className="today-card" onClick={() => startPractice(10)}>
        <div className="today-card__copy"><span>PHIÊN HÔM NAY</span><strong>Nhóm 00–09</strong><small>10 liên tưởng đầu tiên</small></div>
        <div className="today-card__stack"><i>07</i><i>03</i><i>00</i></div>
        <div className="start-chip"><Play size={16} fill="currentColor" /> Bắt đầu</div>
      </button>
      <div className="section-row"><h2>Chọn đường đi</h2><span>01 / 03</span></div>
      <div className="path-picker">
        {[10, 50, 100].map((value) => <button key={value} className={`path-pill ${value === 10 ? "path-pill--active" : ""}`} disabled={value > maxScope} onClick={() => startPractice(value as ScopeSize)}>
          <strong>{value}</strong><small>{value === 10 ? "Bắt đầu" : value === 50 ? "Mở rộng" : "Toàn bộ"}</small>{value > maxScope && <Lock size={14} />}
        </button>)}
      </div>
      <div className="section-row"><h2>Ôn nhanh</h2><button onClick={() => nav("learn")}>Xem tất cả</button></div>
      <div className="quick-row">{learnCards.slice(0, 4).map((item) => <button className="quick-card" key={item.key} onClick={() => { setLearnIndex(Number(item.key)); nav("learn"); }}><span>{item.key}</span><MemoryIcon item={item} size="small" /></button>)}</div>
    </section>}

    {screen === "learn" && <section className="screen learn-screen">
      <div className="backbar"><button onClick={() => nav("home")}><ArrowLeft size={20} /></button><span>{learnIndex + 1} / 10</span><button className="text-control" onClick={() => startPractice(10)}>Luyện</button></div>
      <div className="learn-meter"><i style={{ width: `${(learnIndex + 1) * 10}%` }} /></div>
      <article className="native-card"><span className="card-number">{learnItem.key}</span><MemoryIcon item={learnItem} /><h1>{learnItem.label}</h1><p>Chạm để khắc ghi</p></article>
      <button className={`memory-button ${remembered.has(learnItem.key) ? "memory-button--done" : ""}`} onClick={() => setRemembered((prev) => { const copy = new Set(prev); copy.has(learnItem.key) ? copy.delete(learnItem.key) : copy.add(learnItem.key); return copy; })}>{remembered.has(learnItem.key) ? <><Check size={18} /> Đã nhớ</> : <><Sparkles size={18} /> Tôi đã nhớ</>}</button>
      <div className="learn-controls"><button disabled={learnIndex === 0} onClick={() => setLearnIndex((value) => value - 1)}>Trước</button><button className="next-button" disabled={learnIndex === 9} onClick={() => setLearnIndex((value) => value + 1)}>Tiếp</button></div>
    </section>}

    {screen === "practice" && <section className="screen practice-screen">
      <div className="backbar"><button onClick={() => nav("home")}><X size={21} /></button><div className="progress-dots">{Array.from({ length: 10 }, (_, index) => <i key={index} className={index < answers ? "filled" : ""} />)}</div><span>{correct}</span></div>
      {!finished ? <><p className="mode-label">{question.direction === "number_to_image" ? "SỐ → HÌNH" : "HÌNH → SỐ"}</p><h1 className="quiz-title">{question.direction === "number_to_image" ? "Chọn hình đúng" : "Chọn số đúng"}</h1><div className="quiz-prompt">{question.direction === "number_to_image" ? <b>{question.item.key}</b> : <><MemoryIcon item={question.item} /><strong>{question.item.label}</strong></>}</div><div className={`answer-grid ${question.direction === "image_to_number" ? "answer-grid--number" : ""}`}>{question.options.map((option) => { const selectedOption = selected === option.key; const right = option.key === question.item.key; return <button key={option.key} className={`${selectedOption ? (right ? "right" : "wrong") : ""} ${feedback && right ? "reveal" : ""}`} onClick={() => answer(option.key)}>{question.direction === "number_to_image" ? <><MemoryIcon item={option} size="small" /><span>{option.label}</span></> : <b>{option.key}</b>}</button>; })}</div>{feedback && <div className={`native-feedback ${feedback.correct ? "native-feedback--good" : ""}`}>{feedback.correct ? "Chính xác" : `Là ${question.item.key}`}</div>}</> : <div className="finish-card"><div className="finish-burst"><Trophy size={36} /></div><p>PHIÊN HOÀN THÀNH</p><h1>{accuracy}%</h1><span>độ chính xác</span><div><b>{correct}/10</b><b>{times.length ? `${(times.reduce((a, b) => a + b, 0) / times.length / 1000).toFixed(1)}s` : "—"}</b></div><button className="full-button" onClick={() => startPractice(scope)}>Luyện lại</button><button className="quiet-button" onClick={() => nav("home")}>Về trang chính</button></div>}
    </section>}

    {screen === "map" && <section className="screen map-screen"><div className="simple-title"><p>THƯ VIỆN</p><h1>00 — 99</h1></div><div className="native-map">{numberCatalog.map((item) => <button key={item.key} className={item.groupOrder >= completedGroups + 1 ? "locked" : ""} onClick={() => { setEditingItem(item); setEditingLabel(displayLabel(item)); }}><b>{item.key}</b><MemoryIcon item={item} size="small" /></button>)}</div></section>}
    {screen === "trophies" && <section className="screen trophy-screen"><div className="simple-title"><p>HỒ SƠ</p><h1>Dấu mốc</h1></div><div className="streak-orb"><Flame size={29} /><strong>{currentStreak || 0}</strong><span>ngày liên tiếp · {totalXp} XP</span></div>{!authUser && <button className="memory-button" onClick={() => setAuthOpen(true)}>Lưu tiến độ</button>}<div className="trophy-list"><div><span>✦</span><p><b>Khởi đầu</b><small>Hoàn thành phiên đầu tiên</small></p><Check size={18} /></div><div><span>⚡</span><p><b>Phản xạ</b><small>Trả lời dưới 2.5 giây</small></p><Lock size={17} /></div></div></section>}

    {editingItem && <div className="sheet-mask"><section className="native-sheet"><button className="sheet-close" onClick={() => setEditingItem(null)}><X size={18} /></button><MemoryIcon item={editingItem} size="small" /><p>{editingItem.key}</p><h2>Đặt liên tưởng</h2><input value={editingLabel} maxLength={64} onChange={(event) => setEditingLabel(event.target.value)} /><button className="full-button" onClick={saveAssociation}>Lưu</button></section></div>}
    {authOpen && <div className="sheet-mask"><section className="native-sheet"><button className="sheet-close" onClick={() => setAuthOpen(false)}><X size={18} /></button><p>ĐỒNG BỘ</p><h2>Lưu hành trình</h2><form onSubmit={requestSync}><input type="email" placeholder="Email của bạn" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} /><button className="full-button" type="submit">Gửi liên kết</button></form>{authMessage && <small>{authMessage}</small>}</section></div>}

    <nav className="bottom-nav"><button className={screen === "home" ? "active" : ""} onClick={() => nav("home")}><HomeIcon size={20} /><span>Trang chủ</span></button><button className={screen === "learn" ? "active" : ""} onClick={() => nav("learn")}><BookOpen size={20} /><span>Học</span></button><button className={`nav-play ${screen === "practice" ? "active" : ""}`} onClick={() => startPractice(10)}><Play size={22} fill="currentColor" /></button><button className={screen === "map" ? "active" : ""} onClick={() => nav("map")}><Grid2X2 size={20} /><span>Thẻ</span></button><button className={screen === "trophies" ? "active" : ""} onClick={() => nav("trophies")}><Trophy size={20} /><span>Mốc</span></button></nav>
  </main></div>;
}
