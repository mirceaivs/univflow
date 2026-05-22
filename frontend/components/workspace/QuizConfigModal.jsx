import React, { useState } from "react";
import { Button, Dialog } from "../ui.jsx";

export const QuizConfigModal = ({ isOpen, onClose, onStart }) => {
  const [subject, setSubject] = useState("");
  const [difficulty, setDifficulty] = useState("Mediu");
  const [questionCount, setQuestionCount] = useState(10);

  const handleStart = () => {
    onStart({ subject, difficulty, questionCount });
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Configurare Test">
      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
            Subiect
          </label>
          <textarea
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none transition-colors"
            placeholder="Introduceți subiectul sau conceptul principal..."
            rows={3}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Lasă liber pentru evaluare generală din întregul curs.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
            Dificultate
          </label>
          <div className="grid grid-cols-3 gap-2">
            {["Ușor", "Mediu", "Avansat"].map((level) => (
              <button
                key={level}
                onClick={() => setDifficulty(level)}
                className={`py-2 px-4 rounded-md border text-sm font-medium transition-colors ${
                  difficulty === level
                    ? "bg-primary-50 border-primary-500 text-primary-700 dark:bg-primary-900/30 dark:border-primary-500 dark:text-primary-400"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400"
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
              Număr întrebări
            </label>
            <span className="text-sm font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 px-3 py-1 rounded-md border border-primary-100 dark:border-primary-800 transition-colors">
              {questionCount}
            </span>
          </div>
          <input
            type="range"
            min="5"
            max="25"
            step="5"
            value={questionCount}
            onChange={(e) => setQuestionCount(parseInt(e.target.value))}
            className="w-full accent-primary-600 dark:accent-primary-500 cursor-pointer"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 pb-1 border-t border-slate-100 dark:border-slate-800">
          <Button variant="ghost" onClick={onClose}>
            Anulează
          </Button>
          <Button onClick={handleStart}>Pornește Testul</Button>
        </div>
      </div>
    </Dialog>
  );
};
