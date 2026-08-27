import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronRight, Gamepad2, Lock, Play, Sparkles, Zap } from "lucide-react";
import { numberCatalog } from "@/modules/number-memory/domain/catalog";
import { calculateAccuracy, createPracticeQuestion, evaluateAnswer, type PracticeDirection } from "@/modules/number-memory/domain/gameplay";

type Screen = "modules" | "mode" | "learn" | "practice" | "result";

const modules = [
  { id: "numbers", title: "Nhớ số", subtitle: "00 — 99", icon: "01", tone: "violet", enabled: true },
  { id: "cards", title: "Nhớ bài", subtitle: "Sắp mở", icon: "♠", tone: "coral", enabled: false },
  { id: "names", title: "Nhớ tên", subtitle: "Sắp mở", icon: "Aa", tone: "mint", enabled: false },
];

export default function Home() {
  const [screen, setScreen] = useState<Screen>(() => {
    const requested = new URLSearchParams(window.location.search).get("screen");
    return requested === "mode" || requested === "learn" || requested === "practice" || requested === "result" ? requested : "modules";
  });
  const [learnIndex, setLearnIndex] = useState(0);
  const [question, setQuestion] = useState(() => createPracticeQuestion(10, "mixed"));
  const [answered, setAnswered] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<ReturnType<typeof evaluateAnswer> | null>(null);

  const learnItem = numberCatalog[learnIndex]!;
  const accuracy = useMemo(() => calculateAccuracy(correct, answered), [correct, answered]);

  const beginPractice = () => {
    setQuestion(createPracticeQuestion(10, "mixed")); setAnswered(0); setCorrect(0); setSelected(null); setFeedback(null); setScreen("practice");
  };
  const chooseAnswer = (key: string) => {
    if (feedback) return;
    const result = evaluateAnswer(question, key);
    const nextAnswered = answered + 1;
    const nextCorrect = correct + (result.correct ? 1 : 0);
    setSelected(key); setFeedback(result); setAnswered(nextAnswered); setCorrect(nextCorrect);
    window.setTimeout(() => {
      if (nextAnswered >= 10) setScreen("result");
      else { setQuestion(createPracticeQuestion(10, "mixed")); setSelected(null); setFeedback(null); }
    }, 520);
  };
  const back = () => setScreen(screen === "mode" ? "modules" : "mode");

  return <div className="bright-app"><div className="ambient ambient--one" /><div className="ambient ambient--two" />
    <main className="mobile-canvas">
      {screen === "modules" && <section className="scene scene--modules">
        <div className="top-line"><div className="wordmark"><span className="wordmark__mark">MF</span><b>Memory Forge</b></div><span className="top-line__spark"><Sparkles size={17} /></span></div>
        <div className="headline"><span>TRÍ NHỚ MỖI NGÀY</span><h1>Chọn điều bạn<br /><em>muốn ghi nhớ.</em></h1></div>
        <div className="module-stack">{modules.map((module, index) => <button key={module.id} disabled={!module.enabled} onClick={() => module.enabled && setScreen("mode")} className={`module-card module-card--${module.tone} ${!module.enabled ? "module-card--locked" : ""}`}>
          <div className="module-card__icon">{module.enabled ? module.icon : <Lock size={18} />}</div><div className="module-card__copy"><b>{module.title}</b><small>{module.subtitle}</small></div>{module.enabled ? <span className="module-card__go"><ChevronRight size={19} /></span> : <span className="module-card__soon">Sớm</span>}<i className={`card-orb card-orb--${index + 1}`} />
        </button>)}</div>
      </section>}

      {screen === "mode" && <section className="scene scene--mode"><button className="back-button" onClick={back}><ArrowLeft size={21} /></button><div className="mode-hero"><div className="module-mini">01</div><div><span>NHỚ SỐ</span><h1>00 — 99</h1></div></div><h2>Chọn chế độ</h2><div className="mode-options"><button className="mode-card mode-card--study" onClick={() => { setLearnIndex(0); setScreen("learn"); }}><span className="mode-card__icon"><BookOpen size={25} /></span><div><b>Học tập</b><small>Làm quen từng liên tưởng</small></div><ArrowRight size={20} /></button><button className="mode-card mode-card--play" onClick={beginPractice}><span className="mode-card__icon"><Zap size={25} /></span><div><b>Luyện tập</b><small>Chọn nhanh, nhớ sâu</small></div><ArrowRight size={20} /></button></div></section>}

      {screen === "learn" && <section className="scene scene--learn"><div className="learn-top"><button className="back-button" onClick={back}><ArrowLeft size={21} /></button><span>{String(learnIndex + 1).padStart(2, "0")} / 10</span></div><div className="learn-progress"><i style={{ width: `${(learnIndex + 1) * 10}%` }} /></div><article className="memory-card"><span>{learnItem.key}</span><div className="memory-card__symbol">{learnItem.symbol}</div><h1>{learnItem.label}</h1></article><div className="learn-actions"><button disabled={learnIndex === 0} onClick={() => setLearnIndex((value) => value - 1)}>Trước</button><button className="learn-next" disabled={learnIndex === 9} onClick={() => setLearnIndex((value) => value + 1)}>Tiếp <ArrowRight size={18} /></button></div><button className="practice-link" onClick={beginPractice}><Play size={16} fill="currentColor" /> Chuyển sang luyện tập</button></section>}

      {screen === "practice" && <section className="scene scene--practice"><div className="practice-top"><button className="back-button" onClick={back}><ArrowLeft size={21} /></button><div className="step-track">{Array.from({ length: 10 }, (_, index) => <i key={index} className={index < answered ? "done" : ""} />)}</div><span>{correct}</span></div><div className="quiz-copy"><span>{question.direction === "number_to_image" ? "SỐ → HÌNH" : "HÌNH → SỐ"}</span><h1>{question.direction === "number_to_image" ? "Hình nào đúng?" : "Số nào đúng?"}</h1></div><div className="quiz-core">{question.direction === "number_to_image" ? <b>{question.item.key}</b> : <><strong>{question.item.symbol}</strong><p>{question.item.label}</p></>}</div><div className={`answers ${question.direction === "image_to_number" ? "answers--numeric" : ""}`}>{question.options.map((option) => { const isRight = option.key === question.item.key; const isSelected = selected === option.key; return <button key={option.key} onClick={() => chooseAnswer(option.key)} className={`${isSelected ? (isRight ? "answer--right" : "answer--wrong") : ""} ${feedback && isRight ? "answer--reveal" : ""}`}>{question.direction === "number_to_image" ? <><span>{option.symbol}</span><b>{option.label}</b></> : <b>{option.key}</b>}</button>; })}</div>{feedback && <div className={`answer-toast ${feedback.correct ? "answer-toast--right" : ""}`}>{feedback.correct ? <><Check size={17} /> Chính xác</> : "Thử lại ở lượt sau"}</div>}</section>}

      {screen === "result" && <section className="scene scene--result"><div className="result-glow"><Gamepad2 size={34} /></div><span>PHIÊN ĐÃ XONG</span><h1>{accuracy}%</h1><p>độ chính xác</p><div className="result-score"><b>{correct}<small>đúng</small></b><i /><b>10<small>câu</small></b></div><button className="primary-cta" onClick={beginPractice}>Luyện lại <Play size={17} fill="currentColor" /></button><button className="secondary-cta" onClick={() => setScreen("modules")}>Chọn module khác</button></section>}
    </main>
  </div>;
}
