import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronRight, Gamepad2, Lock, Play, Sparkles, Timer, Trophy, Zap } from "lucide-react";
import { numberCatalog } from "@/modules/number-memory/domain/catalog";
import { calculateAccuracy, createPracticeQuestion, evaluateAnswer, type PracticeDirection, type ScopeSize } from "@/modules/number-memory/domain/gameplay";
import { createDigitSequence, formatRaceTime, RACE_LENGTHS, scoreDigitSequence, type RaceLength } from "@/modules/number-memory/domain/race";

type Screen = "modules" | "mode" | "clusters" | "learn" | "practice" | "result" | "race-setup" | "race-preview" | "race-entry" | "race-result";
type Activity = "learn" | "practice";
type Cluster = { label: string; scope: ScopeSize; groupOrder: number; kind: "10" | "50" | "100" };

const clusters: Cluster[] = [
  ...Array.from({ length: 10 }, (_, groupOrder) => ({ label: `${String(groupOrder * 10).padStart(2, "0")}–${String(groupOrder * 10 + 9).padStart(2, "0")}`, scope: 10 as const, groupOrder, kind: "10" as const })),
  { label: "00–49", scope: 50, groupOrder: 0, kind: "50" },
  { label: "50–99", scope: 50, groupOrder: 1, kind: "50" },
  { label: "00–99", scope: 100, groupOrder: 0, kind: "100" },
];

const modules = [
  { id: "numbers", title: "Nhớ số", subtitle: "00 — 99", icon: "01", tone: "violet", enabled: true },
  { id: "cards", title: "Nhớ bài", subtitle: "Sắp mở", icon: "♠", tone: "coral", enabled: false },
  { id: "names", title: "Nhớ tên", subtitle: "Sắp mở", icon: "Aa", tone: "mint", enabled: false },
];

export default function Home() {
  const [screen, setScreen] = useState<Screen>(() => {
    const requested = new URLSearchParams(window.location.search).get("screen");
    return requested === "mode" || requested === "clusters" || requested === "learn" || requested === "practice" || requested === "result" || requested === "race-setup" ? requested : "modules";
  });
  const [activity, setActivity] = useState<Activity>("learn");
  const [cluster, setCluster] = useState<Cluster>(clusters[0]!);
  const [learnIndex, setLearnIndex] = useState(0);
  const [question, setQuestion] = useState(() => createPracticeQuestion(10, "mixed"));
  const [answered, setAnswered] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<ReturnType<typeof evaluateAnswer> | null>(null);
  const [raceLength, setRaceLength] = useState<RaceLength>(20);
  const [raceSequence, setRaceSequence] = useState("");
  const [raceEntry, setRaceEntry] = useState("");
  const [raceStartedAt, setRaceStartedAt] = useState<number | null>(null);
  const [raceTime, setRaceTime] = useState(0);
  const [raceScore, setRaceScore] = useState<ReturnType<typeof scoreDigitSequence> | null>(null);
  const [raceRecords, setRaceRecords] = useState<Record<number, number>>(() => {
    try { return JSON.parse(localStorage.getItem("memory-forge-race-records") || "{}"); } catch { return {}; }
  });

  const clusterItems = useMemo(() => {
    if (cluster.scope === 10) return numberCatalog.slice(cluster.groupOrder * 10, cluster.groupOrder * 10 + 10);
    if (cluster.scope === 50) return numberCatalog.slice(cluster.groupOrder * 50, cluster.groupOrder * 50 + 50);
    return numberCatalog;
  }, [cluster]);
  const learnItem = clusterItems[learnIndex]!;
  const accuracy = useMemo(() => calculateAccuracy(correct, answered), [correct, answered]);

  useEffect(() => {
    if ((screen !== "race-preview" && screen !== "race-entry") || raceStartedAt === null) return;
    const ticker = window.setInterval(() => setRaceTime(performance.now() - raceStartedAt), 100);
    return () => window.clearInterval(ticker);
  }, [screen, raceStartedAt]);

  const beginPractice = (nextCluster = cluster) => {
    setCluster(nextCluster); setQuestion(createPracticeQuestion(nextCluster.scope, "mixed", nextCluster.groupOrder)); setAnswered(0); setCorrect(0); setSelected(null); setFeedback(null); setScreen("practice");
  };
  const chooseAnswer = (key: string) => {
    if (feedback) return;
    const result = evaluateAnswer(question, key);
    const nextAnswered = answered + 1;
    const nextCorrect = correct + (result.correct ? 1 : 0);
    setSelected(key); setFeedback(result); setAnswered(nextAnswered); setCorrect(nextCorrect);
    window.setTimeout(() => {
      if (nextAnswered >= 10) setScreen("result");
      else { setQuestion(createPracticeQuestion(cluster.scope, "mixed", cluster.groupOrder)); setSelected(null); setFeedback(null); }
    }, 520);
  };
  const startRace = () => { setRaceSequence(createDigitSequence(raceLength)); setRaceEntry(""); setRaceScore(null); setRaceTime(0); setRaceStartedAt(performance.now()); setScreen("race-preview"); };
  const beginRecall = () => setScreen("race-entry");
  const finishRace = () => {
    const duration = raceStartedAt === null ? 0 : performance.now() - raceStartedAt;
    const score = scoreDigitSequence(raceSequence, raceEntry);
    setRaceTime(duration); setRaceScore(score); setRaceStartedAt(null);
    if (score.exact) setRaceRecords((previous) => {
      const best = previous[raceLength];
      const next = !best || duration < best ? { ...previous, [raceLength]: duration } : previous;
      try { localStorage.setItem("memory-forge-race-records", JSON.stringify(next)); } catch { /* The current-session result remains visible if browser storage is unavailable. */ }
      return next;
    });
    setScreen("race-result");
  };
  const back = () => setScreen(screen === "mode" ? "modules" : screen === "clusters" || screen === "race-setup" ? "mode" : "clusters");
  const chooseActivity = (nextActivity: Activity) => { setActivity(nextActivity); setScreen("clusters"); };
  const chooseCluster = (nextCluster: Cluster) => { setCluster(nextCluster); setLearnIndex(0); activity === "learn" ? setScreen("learn") : beginPractice(nextCluster); };

  return <div className="bright-app"><div className="ambient ambient--one" /><div className="ambient ambient--two" />
    <main className="mobile-canvas">
      {screen === "modules" && <section className="scene scene--modules">
        <div className="top-line"><div className="wordmark"><span className="wordmark__mark">MF</span><b>Memory Forge</b></div><span className="top-line__spark"><Sparkles size={17} /></span></div>
        <div className="headline"><span>TRÍ NHỚ MỖI NGÀY</span><h1>Chọn điều bạn<br /><em>muốn ghi nhớ.</em></h1></div>
        <div className="module-stack">{modules.map((module, index) => <button key={module.id} disabled={!module.enabled} onClick={() => module.enabled && setScreen("mode")} className={`module-card module-card--${module.tone} ${!module.enabled ? "module-card--locked" : ""}`}>
          <div className="module-card__icon">{module.enabled ? module.icon : <Lock size={18} />}</div><div className="module-card__copy"><b>{module.title}</b><small>{module.subtitle}</small></div>{module.enabled ? <span className="module-card__go"><ChevronRight size={19} /></span> : <span className="module-card__soon">Sớm</span>}<i className={`card-orb card-orb--${index + 1}`} />
        </button>)}</div>
      </section>}

      {screen === "mode" && <section className="scene scene--mode"><button className="back-button" onClick={back}><ArrowLeft size={21} /></button><div className="mode-hero"><div className="module-mini">01</div><div><span>NHỚ SỐ</span><h1>00 — 99</h1></div></div><h2>Chọn chế độ</h2><div className="mode-options"><button className="mode-card mode-card--study" onClick={() => chooseActivity("learn")}><span className="mode-card__icon"><BookOpen size={25} /></span><div><b>Học tập</b><small>Xem thẻ theo cụm</small></div><ArrowRight size={20} /></button><button className="mode-card mode-card--play" onClick={() => chooseActivity("practice")}><span className="mode-card__icon"><Zap size={25} /></span><div><b>Luyện tập</b><small>Phản xạ theo cụm</small></div><ArrowRight size={20} /></button><button className="mode-card mode-card--race" onClick={() => setScreen("race-setup")}><span className="mode-card__icon"><Trophy size={25} /></span><div><b>Thi đấu</b><small>Ghi nhớ một dãy ngẫu nhiên</small></div><ArrowRight size={20} /></button></div></section>}

      {screen === "race-setup" && <section className="scene scene--race"><div className="cluster-top"><button className="back-button" onClick={back}><ArrowLeft size={21} /></button><span>THI ĐẤU</span></div><div className="race-head"><div className="race-icon"><Trophy size={27} /></div><h1>Chọn độ dài dãy</h1><p>Ghi nhớ dãy ngẫu nhiên rồi nhập lại nhanh và chính xác.</p></div><div className="race-lengths">{RACE_LENGTHS.map((length) => <button key={length} className={raceLength === length ? "active" : ""} onClick={() => setRaceLength(length)}>{length}</button>)}</div><div className="record-line"><Timer size={16} /><span>Kỷ lục {raceLength} số</span><b>{raceRecords[raceLength] ? formatRaceTime(raceRecords[raceLength]) : "—"}</b></div><button className="primary-cta" onClick={startRace}>Tạo dãy số <ArrowRight size={17} /></button></section>}

      {screen === "race-preview" && <section className="scene scene--race"><div className="cluster-top"><button className="back-button" onClick={() => setScreen("race-setup")}><ArrowLeft size={21} /></button><span className="race-timer"><Timer size={14} /> {formatRaceTime(raceTime)}</span></div><div className="race-head race-head--compact"><h1>Ghi nhớ dãy</h1><p>{raceLength} số · thời gian đang tính</p></div><div className="digit-sequence">{raceSequence.match(/.{1,5}/g)?.map((group, index) => <span key={`${group}-${index}`}>{group}</span>)}</div><button className="primary-cta" onClick={beginRecall}>Tôi đã nhớ <Play size={17} fill="currentColor" /></button></section>}

      {screen === "race-entry" && <section className="scene scene--race"><div className="cluster-top"><button className="back-button" onClick={() => setScreen("race-setup")}><ArrowLeft size={21} /></button><span className="race-timer"><Timer size={14} /> {formatRaceTime(raceTime)}</span></div><div className="race-head race-head--compact"><h1>Nhập lại dãy</h1><p>{raceEntry.length} / {raceLength} số</p></div><textarea className="race-input" autoFocus inputMode="numeric" value={raceEntry} maxLength={raceLength} onChange={(event) => setRaceEntry(event.target.value.replace(/\D/g, ""))} placeholder="Nhập các chữ số…" /><button className="primary-cta" disabled={raceEntry.length !== raceLength} onClick={finishRace}>Chấm kết quả <Check size={18} /></button></section>}

      {screen === "race-result" && raceScore && <section className="scene scene--result race-result"><div className={`result-glow ${raceScore.exact ? "result-glow--win" : ""}`}><Trophy size={34} /></div><span>{raceScore.exact ? "KÝ LỤC ĐÃ GHI" : "LƯỢT THI HOÀN THÀNH"}</span><h1>{raceScore.correctPositions}<small> / {raceScore.total}</small></h1><p>chữ số đúng vị trí</p><div className="result-score"><b>{formatRaceTime(raceTime)}<small>thời gian</small></b><i /><b>{raceScore.exact ? "100%" : `${Math.round((raceScore.correctPositions / raceScore.total) * 100)}%`}<small>chính xác</small></b></div><button className="primary-cta" onClick={startRace}>Thi lại <Play size={17} fill="currentColor" /></button><button className="secondary-cta" onClick={() => setScreen("race-setup")}>Đổi độ dài</button></section>}

      {screen === "clusters" && <section className="scene scene--clusters"><div className="cluster-top"><button className="back-button" onClick={back}><ArrowLeft size={21} /></button><span>{activity === "learn" ? "HỌC TẬP" : "LUYỆN TẬP"}</span></div><div className="cluster-head"><h1>Chọn cụm số</h1><p>{activity === "learn" ? "Học từng cụm trước khi mở rộng." : "Luyện phản xạ với phạm vi bạn chọn."}</p></div><div className="cluster-section"><span>10 SỐ</span><div className="cluster-grid">{clusters.filter((item) => item.kind === "10").map((item) => <button key={item.label} onClick={() => chooseCluster(item)}>{item.label}</button>)}</div></div><div className="cluster-section"><span>50 SỐ</span><div className="cluster-row">{clusters.filter((item) => item.kind === "50").map((item) => <button key={item.label} onClick={() => chooseCluster(item)}>{item.label}<ChevronRight size={16} /></button>)}</div></div><button className="cluster-100" onClick={() => chooseCluster(clusters.find((item) => item.kind === "100")!)}><span>100 SỐ</span><b>00 — 99</b><ChevronRight size={20} /></button></section>}

      {screen === "learn" && <section className="scene scene--learn"><div className="learn-top"><button className="back-button" onClick={back}><ArrowLeft size={21} /></button><span>{cluster.label} · {String(learnIndex + 1).padStart(2, "0")} / {clusterItems.length}</span></div><div className="learn-progress"><i style={{ width: `${((learnIndex + 1) / clusterItems.length) * 100}%` }} /></div><article className="memory-card"><span>{learnItem.key}</span><div className="memory-card__symbol">{learnItem.symbol}</div><h1>{learnItem.label}</h1></article><div className="learn-actions"><button disabled={learnIndex === 0} onClick={() => setLearnIndex((value) => value - 1)}>Trước</button><button className="learn-next" disabled={learnIndex === clusterItems.length - 1} onClick={() => setLearnIndex((value) => value + 1)}>Tiếp <ArrowRight size={18} /></button></div><button className="practice-link" onClick={() => beginPractice(cluster)}><Play size={16} fill="currentColor" /> Luyện cụm {cluster.label}</button></section>}

      {screen === "practice" && <section className="scene scene--practice"><div className="practice-top"><button className="back-button" onClick={back}><ArrowLeft size={21} /></button><div className="step-track">{Array.from({ length: 10 }, (_, index) => <i key={index} className={index < answered ? "done" : ""} />)}</div><span>{correct}</span></div><div className="quiz-copy"><span>{cluster.label} · {question.direction === "number_to_image" ? "SỐ → HÌNH" : "HÌNH → SỐ"}</span><h1>{question.direction === "number_to_image" ? "Hình nào đúng?" : "Số nào đúng?"}</h1></div><div className="quiz-core">{question.direction === "number_to_image" ? <b>{question.item.key}</b> : <><strong>{question.item.symbol}</strong><p>{question.item.label}</p></>}</div><div className={`answers ${question.direction === "image_to_number" ? "answers--numeric" : ""}`}>{question.options.map((option) => { const isRight = option.key === question.item.key; const isSelected = selected === option.key; return <button key={option.key} onClick={() => chooseAnswer(option.key)} className={`${isSelected ? (isRight ? "answer--right" : "answer--wrong") : ""} ${feedback && isRight ? "answer--reveal" : ""}`}>{question.direction === "number_to_image" ? <><span>{option.symbol}</span><b>{option.label}</b></> : <b>{option.key}</b>}</button>; })}</div>{feedback && <div className={`answer-toast ${feedback.correct ? "answer-toast--right" : ""}`}>{feedback.correct ? <><Check size={17} /> Chính xác</> : "Thử lại ở lượt sau"}</div>}</section>}

      {screen === "result" && <section className="scene scene--result"><div className="result-glow"><Gamepad2 size={34} /></div><span>PHIÊN ĐÃ XONG</span><h1>{accuracy}%</h1><p>độ chính xác</p><div className="result-score"><b>{correct}<small>đúng</small></b><i /><b>10<small>câu</small></b></div><button className="primary-cta" onClick={() => beginPractice()}>Luyện lại <Play size={17} fill="currentColor" /></button><button className="secondary-cta" onClick={() => setScreen("modules")}>Chọn module khác</button></section>}
    </main>
  </div>;
}
