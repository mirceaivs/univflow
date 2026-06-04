import React from "react";
import {
  CheckCircle2,
  XCircle,
  Sparkles,
  Trophy,
  RotateCcw,
  MessageSquare,
  Loader2,
} from "lucide-react";
import { Card, Badge, Button, Progress } from "../ui.jsx";

const optionsLabels = ["A", "B", "C", "D", "E", "F"];

export const QuizArea = ({ navigateToGenerateTest, backToChat, quiz }) => {
  const {
    currentQuestion,
    totalQuestions,
    progressPercentage,
    currentIndex,
    selectedOption,
    isQuizSubmitted,
    isFinished,
    score,
    scorePercentage,
    handleVerify,
    handleNextQuestion,
    handleRestart,
    setSelectedOption,
    attempts,
    loading,
    isFallback,
    topic,
  } = quiz || {};

  if (loading || (!currentQuestion && !isFinished)) {
    return (
      <div className="flex-1 p-8 bg-slate-50/50 dark:bg-slate-950/50 flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary-500 mb-4" />
        <span className="text-slate-500 font-medium">Se încarcă testul...</span>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50 dark:bg-slate-950/50 custom-scrollbar">
        <div className="mx-auto max-w-2xl flex flex-col items-center pb-12">
          <Card className="w-full p-12 md:p-16 text-center border-slate-200 dark:border-slate-800 shadow-2xl animate-in fade-in zoom-in-95 duration-500 ease-out overflow-visible mb-12">
            <div className="w-24 h-24 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner animate-in zoom-in duration-700 delay-150 fill-mode-both">
              <Trophy className="w-12 h-12" />
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-4">
              Test Finalizat!
            </h2>
            <p className="text-xl text-slate-500 dark:text-slate-400 mb-10">
              Ai răspuns corect la{" "}
              <strong className="text-primary-600 dark:text-primary-400">
                {score}
              </strong>{" "}
              din {totalQuestions} întrebări.
            </p>

            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-4 mb-4 overflow-hidden">
              <div
                className="bg-primary-500 h-full rounded-full transition-all duration-1000"
                style={{ width: `${scorePercentage}%` }}
              ></div>
            </div>
            <p className="text-sm font-bold text-slate-400 mb-12">
              {scorePercentage}% Acuratețe
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                variant="outline"
                className="gap-2 text-lg h-14 px-8"
                onClick={handleRestart}
              >
                <RotateCcw className="w-5 h-5" /> Refă Testul
              </Button>
              <Button
                size="lg"
                className="gap-2 text-lg h-14 px-8 shadow-lg shadow-primary-500/20"
                onClick={navigateToGenerateTest}
              >
                <Sparkles className="w-5 h-5" /> Test Nou
              </Button>
            </div>
          </Card>

          {attempts && attempts.length > 0 && (
            <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300 fill-mode-both">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                📝 Revizuire Răspunsuri & Recomandări
              </h3>
              {attempts.map((attempt, index) => (
                <Card
                  key={index}
                  className="p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                >
                  <div className="flex gap-4">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 ${
                        attempt.isCorrect
                          ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                      }`}
                    >
                      {attempt.isCorrect ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <XCircle className="w-5 h-5" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900 dark:text-white mb-4 text-lg">
                        {index + 1}. {attempt.questionText}
                      </p>

                      {attempt.recommendation && (
                        <div className="mb-6 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-200">
                          <div className="flex items-center gap-2 mb-2 font-bold uppercase tracking-tighter text-[10px]">
                            <Sparkles className="w-3 h-3" /> Recomandare AI
                          </div>
                          {attempt.recommendation}
                        </div>
                      )}

                      <div className="space-y-2">
                        {attempt.options?.map((opt, oIdx) => (
                          <div
                            key={opt.id}
                            className={`p-3 rounded-lg border text-sm flex items-center justify-between ${
                              opt.isCorrect
                                ? "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300"
                                : opt.isSelected
                                ? "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300"
                                : "bg-slate-50 border-slate-100 text-slate-500 dark:bg-slate-800/50 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <span className="font-bold w-4">
                                {optionsLabels[oIdx]}.
                              </span>
                              <span>{opt.text}</span>
                            </span>
                            {opt.isCorrect && (
                              <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
                            )}
                            {!opt.isCorrect && opt.isSelected && (
                              <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50 dark:bg-slate-950/50 custom-scrollbar overflow-x-hidden">
      <div className="max-w-3xl mx-auto py-6">
        <div className="mb-6 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Întrebarea {currentIndex + 1} din {totalQuestions}
          </span>
          <span className="text-xs font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider transition-all duration-300">
            {Math.round(progressPercentage)}% Completat
          </span>
        </div>

        <Progress value={progressPercentage} className="mb-12 h-2" />

        <div
          key={currentIndex}
          className="animate-in fade-in slide-in-from-right-12 duration-500 ease-out fill-mode-both"
        >
          {isFallback && currentIndex === 0 && (
            <div className="mb-8 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 flex items-start gap-3 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
              <Sparkles className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <p className="font-bold text-sm">Test generat din concepte generale</p>
                <p className="text-xs mt-1 text-amber-700/95 dark:text-amber-400/90 leading-relaxed">
                  Subiectul solicitat <strong>"{topic}"</strong> nu a fost găsit în materialele cursului. Testul a fost generat pe baza conceptelor generale disponibile.
                </p>
              </div>
            </div>
          )}

          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 mb-10 leading-snug">
            {currentQuestion.question}
          </h2>

          <div className="space-y-4 mb-8">
            {currentQuestion.options.map((opt) => {
              const isSelected = selectedOption === opt.id;
              const isCorrect = opt.id === currentQuestion.correctAnswer;

              let cardClass =
                "p-5 border-2 transition-all duration-200 cursor-pointer flex gap-4 items-center rounded-xl ";
              let icon = (
                <div className="w-8 h-8 rounded-full border-2 border-slate-300 dark:border-slate-700 flex items-center justify-center text-sm font-bold text-slate-500 dark:text-slate-400 shrink-0 transition-colors">
                  {opt.id}
                </div>
              );

              if (!isQuizSubmitted) {
                cardClass += isSelected
                  ? "border-primary-600 dark:border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-sm scale-[1.01]"
                  : "border-slate-200 dark:border-slate-800 hover:border-primary-300 dark:hover:border-primary-700 bg-white dark:bg-slate-900 hover:shadow-sm";
                if (isSelected) {
                  icon = (
                    <div className="w-8 h-8 rounded-full bg-primary-600 dark:bg-primary-500 flex items-center justify-center text-sm font-bold text-white shrink-0 shadow-sm">
                      {opt.id}
                    </div>
                  );
                }
              } else {
                if (isCorrect) {
                  cardClass +=
                    "border-green-500 dark:border-green-500 bg-green-50 dark:bg-green-900/20";
                  icon = (
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white shrink-0 shadow-sm">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  );
                } else if (isSelected && !isCorrect) {
                  cardClass +=
                    "border-red-500 dark:border-red-500 bg-red-50 dark:bg-red-900/20";
                  icon = (
                    <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white shrink-0 shadow-sm">
                      <XCircle className="w-5 h-5" />
                    </div>
                  );
                } else {
                  cardClass +=
                    "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 opacity-60";
                }
              }

              return (
                <Card
                  key={opt.id}
                  className={cardClass}
                  onClick={() => !isQuizSubmitted && setSelectedOption(opt.id)}
                >
                  {icon}
                  <div className="flex-1 flex justify-between items-center">
                    <p
                      className={`text-base md:text-lg transition-colors ${
                        isQuizSubmitted && isCorrect
                          ? "text-green-900 dark:text-green-100 font-medium"
                          : isQuizSubmitted && isSelected
                          ? "text-red-900 dark:text-red-100"
                          : "text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {opt.text}
                    </p>
                    {isQuizSubmitted && isCorrect && (
                      <Badge
                        variant="success"
                        className="uppercase tracking-wider text-[10px] px-2 py-1 ml-4 shrink-0 animate-in zoom-in duration-300"
                      >
                        Răspuns Corect
                      </Badge>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          {!isQuizSubmitted ? (
            <Button
              size="lg"
              className="w-full h-14 text-lg shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-lg active:translate-y-0 active:scale-[0.98]"
              disabled={!selectedOption}
              onClick={handleVerify}
            >
              Verifică Răspunsul
            </Button>
          ) : (
            <div className="mt-8 p-6 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h4 className="font-bold uppercase tracking-wider text-sm text-blue-800 dark:text-blue-300">
                  Feedback AI & Explicație
                </h4>
              </div>
              <p className="text-base leading-relaxed text-blue-900 dark:text-blue-100">
                {selectedOption === currentQuestion.correctAnswer
                  ? currentQuestion.feedback.correct
                  : currentQuestion.feedback.incorrect}
              </p>
              <Button
                className="mt-6 w-full h-12 bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md active:translate-y-0 active:scale-[0.98]"
                onClick={handleNextQuestion}
              >
                {currentIndex < totalQuestions - 1
                  ? "Următoarea Întrebare →"
                  : "Finalizează Testul"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizArea;
