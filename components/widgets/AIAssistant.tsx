"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  Layers,
  ListChecks,
  Loader2,
  Send,
  Sparkles,
} from "lucide-react";
import { WidgetChrome } from "@/components/ui/WidgetChrome";
import { GlassButton } from "@/components/ui/GlassButton";
import { useAIContextStore } from "@/store/useAIContextStore";
import { cn } from "@/lib/utils";
import type { AIChatTurn, FlashCard, QuizQuestion } from "@/types";

type ViewMode = "chat" | "flashcards" | "quiz" | "pyq";

export function AIAssistant() {
  const { mode, sourceText, sourceName, requestId } = useAIContextStore();

  const [view, setView] = useState<ViewMode>("chat");
  const [turns, setTurns] = useState<AIChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const [flashcards, setFlashcards] = useState<FlashCard[] | null>(null);
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const [quiz, setQuiz] = useState<QuizQuestion[] | null>(null);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<(number | null)[]>([]);

  const [pyqText, setPyqText] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, chatLoading]);

  // Reacts to the Document Viewer pushing a new "flash card" / "quiz" /
  // "pyq ai" request. requestId is bumped on every push, even if mode and
  // text are unchanged, so re-clicking the same tab still re-triggers.
  useEffect(() => {
    if (!mode || !sourceText || requestId === 0) return;

    const run = async () => {
      setGenError(null);
      setGenLoading(true);
      setView(mode as ViewMode);
      try {
        const res = await fetch("/api/ai/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode, sourceText, sourceName }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Generation failed.");

        if (mode === "flashcards") {
          setFlashcards(data.cards ?? []);
          setCardIndex(0);
          setFlipped(false);
        } else if (mode === "quiz") {
          setQuiz(data.questions ?? []);
          setQuizIndex(0);
          setQuizAnswers(new Array((data.questions ?? []).length).fill(null));
        } else if (mode === "pyq") {
          setPyqText(data.text ?? "");
        }
      } catch (err) {
        setGenError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setGenLoading(false);
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || chatLoading) return;
    const nextTurns: AIChatTurn[] = [...turns, { role: "user", text }];
    setTurns(nextTurns);
    setInput("");
    setChatLoading(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ turns: nextTurns, context: sourceText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "The assistant couldn't respond.");
      setTurns([...nextTurns, { role: "model", text: data.text }]);
    } catch (err) {
      setTurns([
        ...nextTurns,
        { role: "model", text: `⚠️ ${err instanceof Error ? err.message : "Something went wrong."}` },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <WidgetChrome
      icon={<Sparkles className="h-4 w-4" />}
      title="AI Assistant"
      subtitle={
        sourceName && view !== "chat"
          ? sourceName
          : sourceText
          ? `Grounded in ${sourceName}`
          : "Ask anything"
      }
      noPadding
      actions={
        view !== "chat" && (
          <button
            onClick={() => setView("chat")}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-ink-soft transition-colors hover:bg-white/10 hover:text-ink"
          >
            <ArrowLeft className="h-3 w-3" /> Chat
          </button>
        )
      }
    >
      <div className="flex h-full flex-col">
        <AnimatePresence mode="wait">
          {view === "chat" && (
            <motion.div
              key="chat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
                {turns.length === 0 && (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-ink-faint">
                    <Sparkles className="h-6 w-6 text-accent/70" />
                    <p className="max-w-[220px] text-xs">
                      Ask a question, or open a PDF on the right and use flash card / quiz / pyq ai.
                    </p>
                  </div>
                )}
                {turns.map((turn, i) => (
                  <div key={i} className={cn("flex", turn.role === "user" ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[85%] whitespace-pre-wrap rounded-xl2 px-3.5 py-2.5 text-[13px] leading-relaxed",
                        turn.role === "user"
                          ? "bg-accent text-[#171009]"
                          : "border border-glass-border bg-white/5 text-ink"
                      )}
                    >
                      {turn.text}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-1 rounded-xl2 border border-glass-border bg-white/5 px-3.5 py-2.5">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-faint [animation-delay:-0.3s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-faint [animation-delay:-0.15s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-faint" />
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-end gap-2 border-t border-glass-border p-3">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  rows={1}
                  placeholder="Ask the assistant..."
                  className="glass-input max-h-28 resize-none"
                />
                <GlassButton
                  aria-label="Send message"
                  variant="primary"
                  onClick={sendMessage}
                  disabled={chatLoading || !input.trim()}
                  className="!p-2.5"
                >
                  <Send className="h-4 w-4" />
                </GlassButton>
              </div>
            </motion.div>
          )}

          {view !== "chat" && (
            <motion.div
              key={view}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              className="min-h-0 flex-1 overflow-y-auto p-4"
            >
              {genLoading && (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-ink-faint">
                  <Loader2 className="h-5 w-5 animate-spin text-accent" />
                  <p className="text-xs">
                    {view === "flashcards" && "Building flashcards from the document..."}
                    {view === "quiz" && "Writing a quiz from the document..."}
                    {view === "pyq" && "Reading through the previous-year questions..."}
                  </p>
                </div>
              )}

              {!genLoading && genError && (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-danger">
                  <AlertCircle className="h-5 w-5" />
                  <p className="text-xs">{genError}</p>
                </div>
              )}

              {!genLoading && !genError && view === "flashcards" && flashcards && (
                <FlashcardView
                  cards={flashcards}
                  index={cardIndex}
                  flipped={flipped}
                  onFlip={() => setFlipped((f) => !f)}
                  onNav={(dir) => {
                    setFlipped(false);
                    setCardIndex((i) => Math.max(0, Math.min(flashcards.length - 1, i + dir)));
                  }}
                />
              )}

              {!genLoading && !genError && view === "quiz" && quiz && (
                <QuizView
                  questions={quiz}
                  index={quizIndex}
                  answers={quizAnswers}
                  onAnswer={(choice) =>
                    setQuizAnswers((a) => a.map((v, i) => (i === quizIndex ? choice : v)))
                  }
                  onNav={(dir) => setQuizIndex((i) => Math.max(0, Math.min(quiz.length - 1, i + dir)))}
                />
              )}

              {!genLoading && !genError && view === "pyq" && pyqText && (
                <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap text-[13px] leading-relaxed text-ink">
                  {pyqText}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </WidgetChrome>
  );
}

function FlashcardView({
  cards,
  index,
  flipped,
  onFlip,
  onNav,
}: {
  cards: FlashCard[];
  index: number;
  flipped: boolean;
  onFlip: () => void;
  onNav: (dir: 1 | -1) => void;
}) {
  if (cards.length === 0) return <EmptyGenState icon={<Layers className="h-5 w-5" />} label="No flashcards generated." />;
  const card = cards[index];

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <button
        onClick={onFlip}
        className="relative h-48 w-full max-w-sm [perspective:1200px]"
        aria-label="Flip card"
      >
        <motion.div
          className="relative h-full w-full [transform-style:preserve-3d]"
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
        >
          <div className="glass-panel absolute inset-0 flex items-center justify-center p-5 text-center text-sm text-ink [backface-visibility:hidden]">
            {card.question}
          </div>
          <div
            className="glass-panel absolute inset-0 flex items-center justify-center border-accent/40 bg-accent/10 p-5 text-center text-sm text-ink [backface-visibility:hidden]"
            style={{ transform: "rotateY(180deg)" }}
          >
            {card.answer}
          </div>
        </motion.div>
      </button>
      <p className="text-[11px] text-ink-faint">Tap the card to flip</p>
      <div className="flex items-center gap-4">
        <GlassButton size="sm" onClick={() => onNav(-1)} disabled={index === 0}>
          Prev
        </GlassButton>
        <span className="text-xs text-ink-soft">
          {index + 1} / {cards.length}
        </span>
        <GlassButton size="sm" onClick={() => onNav(1)} disabled={index === cards.length - 1}>
          Next
        </GlassButton>
      </div>
    </div>
  );
}

function QuizView({
  questions,
  index,
  answers,
  onAnswer,
  onNav,
}: {
  questions: QuizQuestion[];
  index: number;
  answers: (number | null)[];
  onAnswer: (choice: number) => void;
  onNav: (dir: 1 | -1) => void;
}) {
  if (questions.length === 0) return <EmptyGenState icon={<ListChecks className="h-5 w-5" />} label="No quiz generated." />;
  const q = questions[index];
  const chosen = answers[index];
  const score = answers.reduce((acc: number, a, i) => acc + (a === questions[i]?.correctIndex ? 1 : 0), 0);
  const answeredCount = answers.filter((a) => a !== null).length;

  return (
    <div className="space-y-4">
      <QuizQuestionCard q={q} chosen={chosen} onAnswer={onAnswer} />
      {answeredCount === questions.length && (
        <div className="glass-panel p-3 text-center text-sm text-ink">
          Final score: <span className="font-semibold text-accent">{score}</span> / {questions.length}
        </div>
      )}
      <div className="flex items-center justify-center gap-4">
        <GlassButton size="sm" onClick={() => onNav(-1)} disabled={index === 0}>
          Prev
        </GlassButton>
        <span className="text-xs text-ink-soft">
          {index + 1} / {questions.length}
        </span>
        <GlassButton size="sm" onClick={() => onNav(1)} disabled={index === questions.length - 1}>
          Next
        </GlassButton>
      </div>
    </div>
  );
}

function QuizQuestionCard({
  q,
  chosen,
  onAnswer,
}: {
  q: QuizQuestion;
  chosen: number | null;
  onAnswer: (choice: number) => void;
}) {
  return (
    <div className="glass-panel space-y-3 p-4">
      <p className="text-sm font-medium text-ink">{q.question}</p>
      <div className="space-y-1.5">
        {q.options.map((opt, i) => {
          const isCorrect = i === q.correctIndex;
          const isChosen = i === chosen;
          const revealed = chosen !== null;
          return (
            <button
              key={i}
              onClick={() => chosen === null && onAnswer(i)}
              disabled={chosen !== null}
              className={cn(
                "w-full rounded-lg border px-3 py-2 text-left text-[13px] transition-colors",
                !revealed && "border-glass-border bg-white/5 hover:border-accent/40 hover:bg-white/10",
                revealed && isCorrect && "border-accent/60 bg-accent/15 text-ink",
                revealed && isChosen && !isCorrect && "border-danger/50 bg-danger/10 text-ink",
                revealed && !isCorrect && !isChosen && "border-glass-border bg-white/[0.02] text-ink-faint"
              )}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {chosen !== null && q.explanation && <p className="text-xs text-ink-soft">{q.explanation}</p>}
    </div>
  );
}

function EmptyGenState({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-ink-faint">
      {icon}
      <p className="text-xs">{label}</p>
    </div>
  );
}
