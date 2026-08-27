import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  ArrowRight,
  Award,
  BookOpen,
  Check,
  ChevronRight,
  Flame,
  Grid2X2,
  ImagePlus,
  Infinity,
  LayoutDashboard,
  LockKeyhole,
  Medal,
  Pause,
  Play,
  RotateCcw,
  Settings2,
  Sparkles,
  Target,
  Trophy,
  Upload,
  X,
  Zap,
} from "lucide-react";
import { numberCatalog, type MemoryItem } from "@/modules/number-memory/domain/catalog";
import { deletePersonalOverride, loadLearnerSnapshot, savePersonalOverride, savePracticeSummary, sendMagicLink } from "@/modules/number-memory/application/memorySync";
import { supabase } from "@/lib/supabase";
import { validateAndNormalizeImage } from "@/modules/number-memory/application/memoryImages";
import {
  calculateAccuracy,
  createPracticeQuestion,
  evaluateAnswer,
  isGroupMastered,
  unlockedScope,
  type PracticeDirection,
  type ScopeSize,
} from "@/modules/number-memory/domain/gameplay";

type View = "journey" | "learn" | "map" | "practice" | "achievements";

const levelData: { scope: ScopeSize; eyebrow: string; title: string; description: string; note: string }[] = [
  { scope: 10, eyebrow: "Nền tảng", title: "Làm chủ 10 liên tưởng đầu", description: "Nhận diện nhanh 00–09 và tạo phản xạ đầu tiên.", note: "6 / 10 thẻ vững vàng" },
  { scope: 50, eyebrow: "Mở rộng", title: "Liên kết 50 mã số", description: "Khóa mốc này sau khi năm nhóm đầu đạt độ vững vàng.", note: "Cần hoàn thành 4 nhóm nữa" },
  { scope: 100, eyebrow: "Toàn bộ bản đồ", title: "Gọi tên 100 ký ức", description: "Bài luyện tổng hợp dành cho trí nhớ bền vững.", note: "Cần hoàn thành 9 nhóm nữa" },
];

const navItems: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "journey", label: "Lộ trình", icon: LayoutDashboard },
  { id: "learn", label: "Học thẻ", icon: BookOpen },
  { id: "map", label: "Bản đồ 100", icon: Grid2X2 },
  { id: "practice", label: "Luyện tập", icon: Zap },
  { id: "achievements", label: "Thành tích", icon: Trophy },
];

function Marker({ item, customLabel, compact = false }: { item: MemoryItem; customLabel?: string; compact?: boolean }) {
  return (
    <div className={`marker ${compact ? "marker--compact" : ""}`} aria-hidden="true">
      <div className="marker__shape">{item.symbol}</div>
      {!compact && <span>{customLabel || item.label}</span>}
    </div>
  );
}

function ProgressRing({ value }: { value: number }) {
  return (
    <div className="progress-ring" style={{ "--progress": `${value * 3.6}deg` } as React.CSSProperties}>
      <span>{value}%</span>
    </div>
  );
}

export default function Home() {
  const [activeView, setActiveView] = useState<View>("journey");
  const [scope, setScope] = useState<ScopeSize>(10);
  const [direction, setDirection] = useState<PracticeDirection>("mixed");
  const [question, setQuestion] = useState(() => createPracticeQuestion(10, "mixed"));
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<ReturnType<typeof evaluateAnswer> | null>(null);
  const [session, setSession] = useState({ correct: 7, answered: 10, xp: 124 });
  const [completedGroups, setCompletedGroups] = useState(0);
  const [activeGroup, setActiveGroup] = useState(0);
  const [groupStats, setGroupStats] = useState<Record<number, { sessions: number; questions: number; correct: number; correctResponseMs: number[] }>>({});
  const [learnIndex, setLearnIndex] = useState(0);
  const [learnedKeys, setLearnedKeys] = useState<Set<string>>(() => new Set());
  const [sessionFinished, setSessionFinished] = useState(false);
  const [responseTimes, setResponseTimes] = useState<number[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedMapItem, setSelectedMapItem] = useState<MemoryItem | null>(null);
  const [customLabels, setCustomLabels] = useState<Record<string, string>>({});
  const [customImages, setCustomImages] = useState<Record<string, string>>({});
  const [editingLabel, setEditingLabel] = useState("");
  const [customFiles, setCustomFiles] = useState<Record<string, File>>({});
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authNotice, setAuthNotice] = useState("");
  const [syncStatus, setSyncStatus] = useState<"local" | "saving" | "synced" | "error">("local");
  const [totalXp, setTotalXp] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [attemptLog, setAttemptLog] = useState<{ itemKey: string; correct: boolean; responseMs: number }[]>([]);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js");
    }
  }, []);

  useEffect(() => {
    const hydrate = async (user: User | null) => {
      setAuthUser(user);
      if (!user) return;
      try {
        const snapshot = await loadLearnerSnapshot();
        setCompletedGroups(snapshot.completedGroups);
        setActiveGroup(snapshot.completedGroups);
        setTotalXp(snapshot.totalXp);
        setCurrentStreak(snapshot.currentStreak);
        setCustomLabels(Object.fromEntries(Object.entries(snapshot.overrides).map(([key, value]) => [key, value.label || ""]).filter(([, label]) => label)));
        setCustomImages(Object.fromEntries(Object.entries(snapshot.overrides).map(([key, value]) => [key, value.signedUrl || ""]).filter(([, url]) => url)));
        setSyncStatus("synced");
      } catch {
        setSyncStatus("error");
      }
    };
    if (!supabase) return;
    void supabase.auth.getUser().then(({ data }) => { void hydrate(data.user); });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => { void hydrate(nextSession?.user ?? null); });
    return () => subscription.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const pauseForVisibility = () => {
      if (document.hidden && activeView === "practice" && !feedback) setIsPaused(true);
    };
    document.addEventListener("visibilitychange", pauseForVisibility);
    return () => document.removeEventListener("visibilitychange", pauseForVisibility);
  }, [activeView, feedback]);

  const accuracy = useMemo(() => calculateAccuracy(session.correct, session.answered), [session]);
  const displayLabel = (item: MemoryItem) => customLabels[item.key] || item.label;

  const maxScope = unlockedScope(completedGroups);
  const unlockedGroupCount = Math.min(10, Math.max(1, completedGroups + 1));
  const learnedCount = learnedKeys.size;
  const meanResponseMs = responseTimes.length ? Math.round(responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length) : null;

  const startPractice = (nextScope: ScopeSize = scope, nextDirection: PracticeDirection = direction) => {
    const allowedScope = nextScope > maxScope ? maxScope : nextScope;
    setScope(allowedScope);
    setDirection(nextDirection);
    setQuestion(createPracticeQuestion(allowedScope, nextDirection, allowedScope === 10 ? activeGroup : 0));
    setSelected(null);
    setFeedback(null);
    setIsPaused(false);
    setSession({ correct: 0, answered: 0, xp: 0 });
    setResponseTimes([]);
    setAttemptLog([]);
    setSessionFinished(false);
    setActiveView("practice");
  };

  const submitAnswer = (key: string) => {
    if (feedback || isPaused) return;
    const result = evaluateAnswer(question, key);
    setSelected(key);
    setFeedback(result);
    const nextAnswered = session.answered + 1;
    const nextCorrect = session.correct + (result.correct ? 1 : 0);
    setSession((previous) => ({ ...previous, correct: nextCorrect, answered: nextAnswered, xp: previous.xp + result.xpEarned }));
    setResponseTimes((previous) => [...previous, result.responseMs]);
    const currentAttempt = { itemKey: question.item.key, correct: result.correct, responseMs: result.responseMs };
    setAttemptLog((previous) => [...previous, currentAttempt]);
    window.setTimeout(() => {
      if (nextAnswered >= 10) {
        const previousGroup = groupStats[activeGroup] ?? { sessions: 0, questions: 0, correct: 0, correctResponseMs: [] };
        const nextGroup = { sessions: previousGroup.sessions + 1, questions: previousGroup.questions + nextAnswered, correct: previousGroup.correct + nextCorrect, correctResponseMs: [...previousGroup.correctResponseMs, ...[...attemptLog, currentAttempt].filter((attempt) => attempt.correct).map((attempt) => attempt.responseMs)] };
        const mastered = scope === 10 && isGroupMastered(nextGroup);
        const nextCompletedGroups = mastered ? Math.max(completedGroups, activeGroup + 1) : completedGroups;
        setGroupStats((previous) => ({ ...previous, [activeGroup]: nextGroup }));
        if (mastered) { setCompletedGroups(nextCompletedGroups); setActiveGroup(Math.min(9, activeGroup + 1)); }
        if (authUser) {
          const resultingTotalXp = totalXp + session.xp + result.xpEarned;
          setSyncStatus("saving");
          void savePracticeSummary({
            scope,
            direction,
            correctCount: nextCorrect,
            questionCount: nextAnswered,
            meanResponseMs: Math.round([...responseTimes, result.responseMs].reduce((sum, value) => sum + value, 0) / Math.max(1, responseTimes.length + 1)),
            totalXp: resultingTotalXp,
            completedGroups: nextCompletedGroups,
            performances: [...attemptLog, currentAttempt],
          }).then((saved) => { setTotalXp(resultingTotalXp); setCompletedGroups(saved.completedGroups); setActiveGroup(saved.completedGroups); setCurrentStreak(saved.currentStreak); setSyncStatus("synced"); }).catch(() => setSyncStatus("error"));
        }
        setSessionFinished(true);
        setFeedback(null);
      } else {
        setQuestion(createPracticeQuestion(scope, direction, scope === 10 ? activeGroup : 0));
        setSelected(null);
        setFeedback(null);
      }
    }, 1100);
  };

  const openEditor = (item: MemoryItem) => {
    setSelectedMapItem(item);
    setEditingLabel(customLabels[item.key] || item.label);
  };

  const saveCustomLabel = () => {
    if (!selectedMapItem) return;
    const trimmed = editingLabel.trim();
    setCustomLabels((previous) => ({ ...previous, [selectedMapItem.key]: trimmed || selectedMapItem.label }));
    if (authUser) {
      setSyncStatus("saving");
      void savePersonalOverride({ user: authUser, itemKey: selectedMapItem.key, label: trimmed, imageFile: customFiles[selectedMapItem.key] })
        .then(() => setSyncStatus("synced"))
        .catch(() => setSyncStatus("error"));
    }
    setSelectedMapItem(null);
  };

  const handleCustomImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedMapItem) return;
    try {
      const normalized = await validateAndNormalizeImage(file);
      setCustomFiles((previous) => ({ ...previous, [selectedMapItem.key]: normalized }));
      setCustomImages((previous) => ({ ...previous, [selectedMapItem.key]: URL.createObjectURL(normalized) }));
      setAuthNotice("");
    } catch (error) {
      setAuthNotice(error instanceof Error ? error.message : "Không thể dùng ảnh này.");
    }
  };

  const requestMagicLink = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(authEmail)) { setAuthNotice("Hãy nhập một địa chỉ email hợp lệ."); return; }
    const { error } = await sendMagicLink(authEmail.trim().toLowerCase());
    setAuthNotice(error ? "Chưa thể gửi liên kết. Hãy kiểm tra email hoặc thử lại." : "Liên kết đăng nhập đã được gửi. Hãy mở email để đồng bộ hồ sơ này.");
  };

  const currentLevel = levelData.find((level) => level.scope === scope)!;
  const learnableCards = numberCatalog.slice(0, unlockedGroupCount * 10);
  const learnItem = learnableCards[learnIndex] ?? numberCatalog[0]!;

  return (
    <div className="forge-shell">
      <aside className="side-rail">
        <div className="brand-lockup">
          <div className="brand-mark"><span>MF</span></div>
          <div><p className="brand-name">Memory Forge</p><p className="brand-subtitle">Xưởng ký ức cá nhân</p></div>
        </div>
        <nav className="primary-nav" aria-label="Điều hướng chính">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`nav-item ${activeView === id ? "nav-item--active" : ""}`} onClick={() => setActiveView(id)}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="rail-bottom">
          <div className="streak-card"><Flame size={18} /><div><strong>{currentStreak || "—"} ngày</strong><span>chuỗi rèn luyện</span></div></div>
          <button className="ghost-rail"><Settings2 size={18} /><span>Thiết lập</span></button>
        </div>
      </aside>

      <main className="main-workspace">
        <header className="topbar">
          <div><p className="eyebrow">Không gian rèn luyện của bạn</p><h1>{activeView === "journey" ? "Tôi luyện trí nhớ." : activeView === "learn" ? "Nhìn kỹ. Gợi đúng." : activeView === "map" ? "Bản đồ liên tưởng." : activeView === "practice" ? "Phản xạ trong tích tắc." : "Dấu mốc của bạn."}</h1></div>
          <div className="topbar__meta"><span className={`online-dot ${syncStatus === "error" ? "online-dot--error" : ""}`} />{authUser ? (syncStatus === "saving" ? "Đang đồng bộ" : syncStatus === "error" ? "Chờ kết nối lại" : "Hồ sơ đã đồng bộ") : <button className="sync-link" onClick={() => setAuthDialogOpen(true)}>Lưu hồ sơ</button>}<button className="avatar" aria-label="Hồ sơ người học" onClick={() => setAuthDialogOpen(true)}>{authUser?.email?.slice(0, 1).toUpperCase() || "M"}</button></div>
        </header>

        {activeView === "journey" && (
          <section className="journey-view view-enter">
            <div className="hero-panel">
              <div className="hero-copy">
                <div className="hero-kicker"><Sparkles size={15} /> Hôm nay, hãy rèn 10 liên tưởng</div>
                <h2>Nhớ một con số.<br /><em>Gọi dậy một hình ảnh.</em></h2>
                <p>Đi theo nhịp độ 10 → 50 → 100. Mỗi lượt nhanh hơn sẽ làm đường dẫn ký ức sắc nét hơn.</p>
                <div className="hero-actions"><button className="primary-button" onClick={() => startPractice(10, "mixed")}>Bắt đầu 5 phút <ArrowRight size={18} /></button><button className="text-button" onClick={() => setActiveView("map")}>Xem bản đồ 100</button></div>
              </div>
              <div className="hero-art" style={{ backgroundImage: "url('/manus-storage/memory-forge-visual-reference_393ca62d.png')" }}>
                <div className="art-glow" /><div className="floating-card floating-card--one"><span>07</span><Marker item={numberCatalog[7]!} compact /></div><div className="floating-card floating-card--two"><span>03</span><Marker item={numberCatalog[3]!} compact /></div>
              </div>
            </div>

            <div className="section-heading"><div><p className="eyebrow">LỘ TRÌNH GỢI NHỚ</p><h3>Đi từng nhóm. Giữ từng dấu ấn.</h3></div><button className="small-link" onClick={() => setActiveView("map")}>Bản đồ đầy đủ <ChevronRight size={16} /></button></div>
            <div className="path-grid">
              {levelData.map((level, index) => {
                const unlocked = level.scope <= maxScope;
                return (
                  <article className={`path-card ${unlocked ? "path-card--active" : "path-card--locked"}`} key={level.scope}>
                    <div className="path-card__top"><span>0{index + 1}</span>{unlocked ? <span className="status-chip">Đang rèn</span> : <LockKeyhole size={16} />}</div>
                    <p className="eyebrow">{level.eyebrow}</p><h4>{level.title}</h4><p>{level.description}</p>
                    <div className="path-card__foot">{unlocked ? <><div className="mini-progress"><span style={{ width: `${Math.min(100, learnedCount * 10)}%` }} /></div><small>{learnedCount} / 10 thẻ đã đánh dấu nhớ</small></> : <small><LockKeyhole size={13} /> {level.note}</small>}</div>
                    <button disabled={!unlocked} onClick={() => { setLearnIndex(0); setActiveView("learn"); }} className="card-action">{unlocked ? "Học thẻ" : "Chưa mở"}<ArrowRight size={16} /></button>
                  </article>
                );
              })}
            </div>
            <section className="recall-strip"><div className="recall-strip__number">07</div><Marker item={numberCatalog[7]!} /><div><p className="eyebrow">ÔN LẠI NHẸ NHÀNG</p><h3>Cái rìu — 07</h3><p>Chạm vào liên tưởng nhanh nhất của bạn, trước khi bắt đầu phiên mới.</p></div><button className="outline-button" onClick={() => startPractice(10, "number_to_image")}>Ôn thẻ này</button></section>
          </section>
        )}

        {activeView === "learn" && (
          <section className="learn-view view-enter">
            <div className="learn-header"><div><p className="eyebrow">HỌC THEO TỪNG DẤU ẤN</p><h2>Nhóm đang mở · {String(Math.floor(learnItem.groupOrder * 10)).padStart(2, "0")}–{String(Math.floor(learnItem.groupOrder * 10) + 9).padStart(2, "0")}</h2><p>Đọc mã, nhìn hình, nói to liên tưởng. Khi sẵn sàng, đánh dấu thẻ để đưa vào phiên phản xạ.</p></div><button className="outline-button" onClick={() => startPractice(10, "mixed")}><Zap size={16} /> Chuyển sang luyện</button></div>
            <div className="learn-stage"><div className="learn-index"><span>THẺ {learnIndex + 1} / {learnableCards.length}</span><div><i style={{ width: `${((learnIndex + 1) / learnableCards.length) * 100}%` }} /></div></div><article className="learn-card"><span className="learn-card__code">{learnItem.key}</span>{customImages[learnItem.key] ? <img src={customImages[learnItem.key]} alt={displayLabel(learnItem)} /> : <Marker item={learnItem} customLabel={displayLabel(learnItem)} />}<div><p className="eyebrow">LIÊN TƯỞNG CỦA BẠN</p><h3>{displayLabel(learnItem)}</h3></div></article><div className="learn-actions"><button className="outline-button" disabled={learnIndex === 0} onClick={() => setLearnIndex((index) => Math.max(0, index - 1))}>Quay lại</button><button className={`remember-button ${learnedKeys.has(learnItem.key) ? "remember-button--active" : ""}`} onClick={() => setLearnedKeys((previous) => { const next = new Set(previous); if (next.has(learnItem.key)) next.delete(learnItem.key); else next.add(learnItem.key); return next; })}>{learnedKeys.has(learnItem.key) ? <><Check size={17} /> Đã ghi nhớ</> : <><Sparkles size={17} /> Tôi đã nhớ</>}</button><button className="primary-button" disabled={learnIndex === learnableCards.length - 1} onClick={() => setLearnIndex((index) => Math.min(learnableCards.length - 1, index + 1))}>Thẻ tiếp <ArrowRight size={17} /></button></div></div>
            <div className="learn-thumbnails">{learnableCards.map((item, index) => <button key={item.key} onClick={() => setLearnIndex(index)} className={`learn-thumb ${index === learnIndex ? "learn-thumb--active" : ""} ${learnedKeys.has(item.key) ? "learn-thumb--remembered" : ""}`}><span>{item.key}</span><Marker item={item} compact /></button>)}</div>
          </section>
        )}

        {activeView === "map" && (
          <section className="map-view view-enter">
            <div className="map-header"><div><p className="eyebrow">CATALOG CHUẨN · 00–99</p><h2>Chạm để đặt liên tưởng của riêng bạn.</h2><p>Các thẻ đã mở là vật liệu cho phiên luyện. Thẻ khóa vẫn có thể xem, nhưng chưa tham gia bài kiểm tra.</p></div><button className="outline-button" onClick={() => startPractice(10, "mixed")}><Play size={16} /> Luyện nhóm đang mở</button></div>
            <div className="map-legend"><span><i className="legend-dot legend-dot--ready" /> Đang mở</span><span><i className="legend-dot legend-dot--locked" /> Chờ tôi luyện</span><span><i className="legend-dot legend-dot--custom" /> Đã cá nhân hóa</span></div>
            <div className="memory-grid">
              {numberCatalog.map((item) => {
                const unlocked = item.groupOrder < unlockedGroupCount;
                const customized = Boolean(customLabels[item.key] || customImages[item.key]);
                return <button key={item.key} className={`memory-cell ${unlocked ? "memory-cell--unlocked" : "memory-cell--locked"} ${customized ? "memory-cell--custom" : ""}`} onClick={() => openEditor(item)}>
                  <span className="memory-cell__code">{item.key}</span>
                  {customImages[item.key] ? <img src={customImages[item.key]} alt="" className="memory-cell__image" /> : <Marker item={item} compact />}
                  <span className="memory-cell__label">{displayLabel(item)}</span>
                  {unlocked ? <span className="memory-cell__tick"><Check size={11} /></span> : <span className="memory-cell__lock"><LockKeyhole size={11} /></span>}
                </button>;
              })}
            </div>
          </section>
        )}

        {activeView === "practice" && (
          <section className="practice-view view-enter">
            <div className="practice-header"><button className="back-link" onClick={() => setActiveView("journey")}><ChevronRight size={17} className="back-icon" /> Trở về lộ trình</button><div className="practice-stats"><span><Target size={15} /> {accuracy}% chính xác</span><span><Zap size={15} /> {session.xp} XP phiên này</span><span><Infinity size={15} /> Phản xạ trộn</span></div></div>
            <div className="practice-stage">
              <div className="stage-progress"><span>Phiên rèn luyện</span><div><i style={{ width: `${Math.min(100, session.answered * 10)}%` }} /></div><strong>{Math.min(10, session.answered)} / 10</strong></div>
              <p className="eyebrow">{question.direction === "number_to_image" ? "SỐ → HÌNH" : "HÌNH → SỐ"} · {scope === 10 ? `NHÓM ${String(activeGroup * 10).padStart(2, "0")}–${String(activeGroup * 10 + 9).padStart(2, "0")}` : currentLevel.title}</p>
              <h2>{question.direction === "number_to_image" ? "Hình nào gợi đúng mã số này?" : "Mã số nào thuộc về hình này?"}</h2>
              <div className={`prompt-card ${feedback ? (feedback.correct ? "prompt-card--correct" : "prompt-card--wrong") : ""}`}>
                {question.direction === "number_to_image" ? <div className="number-prompt">{question.item.key}</div> : <><Marker item={question.item} customLabel={displayLabel(question.item)} /><p>{displayLabel(question.item)}</p></>}
              </div>
              <div className={`answer-grid ${question.direction === "image_to_number" ? "answer-grid--numbers" : ""}`}>
                {question.options.map((option) => {
                  const isCorrect = option.key === question.item.key;
                  const isSelected = selected === option.key;
                  return <button key={option.key} onClick={() => submitAnswer(option.key)} className={`answer-option ${isSelected ? (isCorrect ? "answer-option--correct" : "answer-option--wrong") : ""} ${feedback && isCorrect ? "answer-option--reveal" : ""}`}>
                    {question.direction === "number_to_image" ? <><Marker item={option} customLabel={displayLabel(option)} /><span>{displayLabel(option)}</span></> : <><b>{option.key}</b><span>{displayLabel(option)}</span></>}
                  </button>;
                })}
              </div>
              {feedback && <div className={`feedback-toast ${feedback.correct ? "feedback-toast--correct" : "feedback-toast--wrong"}`}>{feedback.correct ? <><Check size={18} /> Chính xác · +{feedback.xpEarned} XP</> : <><X size={18} /> Đáp án là {question.item.key} · {displayLabel(question.item)}</>}<span>{(feedback.responseMs / 1000).toFixed(1)}s</span></div>}
              {sessionFinished && <div className="session-result-overlay"><div><Award size={28} /><p className="eyebrow">PHIÊN ĐÃ HOÀN THÀNH</p><h3>{calculateAccuracy(session.correct, session.answered) >= 80 ? "Bạn vừa khắc thêm một đường dẫn mới." : "Thêm một lượt nữa để nét nhớ rõ hơn."}</h3><div className="session-result-grid"><span><b>{calculateAccuracy(session.correct, session.answered)}%</b>chính xác</span><span><b>{meanResponseMs ? `${(meanResponseMs / 1000).toFixed(1)}s` : "—"}</b>phản xạ TB</span><span><b>+{session.xp}</b>XP nhận được</span></div>{scope === 10 && <p className="unlock-copy"><Check size={15} /> Nhóm hiện tại: {(groupStats[activeGroup]?.questions ?? 0)} / 40 câu tích lũy · cần 2 phiên, ≥80% và trung vị ≤2,5 giây.</p>}<div className="session-result-actions"><button className="outline-button" onClick={() => { setSessionFinished(false); setLearnIndex(0); setActiveView("learn"); }}>Học nhóm kế <BookOpen size={16} /></button><button className="primary-button" onClick={() => startPractice(scope, direction)}>Luyện thêm lượt nữa <RotateCcw size={16} /></button></div></div></div>}
              {isPaused && <div className="pause-overlay"><div><Pause size={26} /><p className="eyebrow">PHIÊN ĐÃ TẠM DỪNG</p><h3>Trở lại khi bạn sẵn sàng.</h3><p>Thời gian nền không được tính vào phản xạ của bạn.</p><button className="primary-button" onClick={() => { setIsPaused(false); setQuestion(createPracticeQuestion(scope, direction)); }}>Tiếp tục phiên <Play size={17} /></button></div></div>}
            </div>
            <div className="practice-controls"><div><span className="control-label">Phạm vi</span>{([10, 50, 100] as ScopeSize[]).map((value) => <button key={value} disabled={value > maxScope} onClick={() => startPractice(value, direction)} className={scope === value ? "control-pill control-pill--active" : "control-pill"}>{value}</button>)}</div><div><span className="control-label">Chiều gợi nhớ</span>{(["mixed", "number_to_image", "image_to_number"] as PracticeDirection[]).map((value) => <button key={value} onClick={() => startPractice(scope, value)} className={direction === value ? "control-pill control-pill--active" : "control-pill"}>{value === "mixed" ? "Trộn" : value === "number_to_image" ? "Số → Hình" : "Hình → Số"}</button>)}</div></div>
          </section>
        )}

        {activeView === "achievements" && (
          <section className="achievements-view view-enter"><div className="achievement-summary"><div><p className="eyebrow">HỒ SƠ NHỚ SỐ</p><h2>Những lần bạn chọn<br /><em>không quên.</em></h2><p>Tiến độ là của riêng bạn. Không bảng xếp hạng, chỉ có dấu mốc để quay lại.</p><button className="primary-button" onClick={() => startPractice(10, "mixed")}>Rèn tiếp hôm nay <ArrowRight size={17} /></button></div><div className="big-score"><ProgressRing value={accuracy} /><div><span>Độ chính xác gần đây</span><strong>{session.correct} / {session.answered} câu</strong></div></div></div><div className="metric-grid"><article><Flame /><span>Chuỗi hiện tại</span><strong>{currentStreak || "—"} ngày</strong><small>Hoàn thành một phiên để giữ lửa.</small></article><article><Zap /><span>Tổng động lượng</span><strong>{totalXp} XP</strong><small>Tích lũy qua các phiên đã đồng bộ.</small></article><article><Target /><span>Phản xạ gần đây</span><strong>{meanResponseMs ? `${(meanResponseMs / 1000).toFixed(1)} giây` : "—"}</strong><small>Được ghi nhận sau khi hoàn thành phiên.</small></article></div><div className="section-heading"><div><p className="eyebrow">TỦ THÀNH TÍCH</p><h3>Những chi tiết đáng giữ lại.</h3></div></div><div className="badge-grid"><article className="badge-card badge-card--earned"><Medal /><div><span>THÀNH THẠO 10</span><h4>Người thợ khởi đầu</h4><p>Đã hoàn thành phiên đầu tiên với nhóm 00–09.</p></div><Check /></article><article className="badge-card badge-card--earned"><Award /><div><span>PHẢN XẠ</span><h4>Tia chớp đầu tiên</h4><p>Trả lời đúng dưới 2,5 giây.</p></div><Check /></article><article className="badge-card"><LockKeyhole /><div><span>CHỜ MỞ KHÓA</span><h4>Bản đồ 50</h4><p>Hoàn thành năm nhóm đầu để tiếp tục.</p></div></article></div></section>
        )}
      </main>

      <aside className="insight-rail"><div className="rail-title"><p className="eyebrow">NHỊP ĐỘ HÔM NAY</p><span>Thứ Tư, 27 tháng 8</span></div><div className="focus-card"><div className="focus-card__head"><BookOpen size={17} /><span>MỤC TIÊU NHẸ NHÀNG</span></div><div className="focus-orbit"><span>8</span><small>phút</small></div><p>Đủ để củng cố nhóm đầu tiên, không cần vội.</p><div className="time-steps"><span className="active" /><span className="active" /><span className="active" /><span /><span /></div></div><div className="rail-section"><div className="rail-section__head"><h3>Tiến độ nhóm 00–09</h3><span>62%</span></div><div className="detail-progress"><i style={{ width: "62%" }} /></div><div className="mastery-list"><span><i /> Nhận diện hình <b>Khá vững</b></span><span><i /> Gọi đúng mã <b>Đang rèn</b></span><span><i /> Phản xạ dưới 2.5s <b>3 / 10</b></span></div></div><div className="quote-card"><span>“</span><p>Ký ức bền hơn khi nó có một hình dạng để trở về.</p><small>Ghi chú cho phiên hôm nay</small></div></aside>

      {selectedMapItem && <div className="modal-backdrop" role="presentation"><section className="mnemonic-modal" role="dialog" aria-modal="true" aria-labelledby="customize-title"><button className="modal-close" onClick={() => setSelectedMapItem(null)} aria-label="Đóng"><X size={18} /></button><p className="eyebrow">LIÊN TƯỞNG CÁ NHÂN · {selectedMapItem.key}</p><h2 id="customize-title">Đặt một dấu ấn<br />chỉ dành cho bạn.</h2><div className="editor-preview">{customImages[selectedMapItem.key] ? <img src={customImages[selectedMapItem.key]} alt="Xem trước liên tưởng cá nhân" /> : <Marker item={selectedMapItem} customLabel={displayLabel(selectedMapItem)} />}</div><label className="input-label">Tên liên tưởng<input value={editingLabel} maxLength={64} onChange={(event) => setEditingLabel(event.target.value)} /></label><label className="upload-zone"><ImagePlus size={20} /><span>Thêm ảnh riêng tư</span><small>JPG, PNG hoặc WEBP · dưới 5 MB</small><input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleCustomImage} /></label><div className="modal-actions"><button className="reset-button" onClick={() => { const itemKey = selectedMapItem.key; setCustomLabels((previous) => { const copy = { ...previous }; delete copy[itemKey]; return copy; }); setCustomImages((previous) => { const copy = { ...previous }; delete copy[itemKey]; return copy; }); setCustomFiles((previous) => { const copy = { ...previous }; delete copy[itemKey]; return copy; }); if (authUser) { setSyncStatus("saving"); void deletePersonalOverride(itemKey).then(() => setSyncStatus("synced")).catch(() => setSyncStatus("error")); } setEditingLabel(selectedMapItem.label); }}><RotateCcw size={15} /> Hoàn nguyên</button><button className="primary-button" onClick={saveCustomLabel}>Lưu liên tưởng <Check size={17} /></button></div>{authNotice && <div className="auth-notice">{authNotice}</div>}</section></div>}
      {authDialogOpen && <div className="modal-backdrop" role="presentation"><section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title"><button className="modal-close" onClick={() => setAuthDialogOpen(false)} aria-label="Đóng"><X size={18} /></button><div className="auth-seal"><Sparkles size={21} /></div><p className="eyebrow">HỒ SƠ CÁ NHÂN</p><h2 id="auth-title">Giữ ký ức của bạn<br />trên mọi thiết bị.</h2><p>Đăng nhập bằng email để lưu tiến độ, thành tích và liên tưởng riêng tư vào kho dữ liệu của bạn.</p><form onSubmit={requestMagicLink}><label className="input-label">Email học tập<input type="email" placeholder="ban@example.com" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} /></label><button className="primary-button" type="submit">Gửi liên kết đăng nhập <ArrowRight size={17} /></button></form>{authNotice && <div className="auth-notice">{authNotice}</div>}</section></div>}
    </div>
  );
}
