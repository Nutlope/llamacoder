"use client";

import { useState, useEffect, useRef } from "react";
// @ts-ignore
import { Button } from "@/components/ui/button";
// @ts-ignore
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// @ts-ignore
import { Badge } from "@/components/ui/badge";
import { Play, Pause, RotateCcw, Coffee, Brain } from "lucide-react";

type TimerMode = "work" | "shortBreak" | "longBreak";

const TIMER_DURATIONS = {
  work: 25 * 60, // 25 minutes
  shortBreak: 5 * 60, // 5 minutes
  longBreak: 15 * 60, // 15 minutes
};

const MODE_LABELS = {
  work: "Focus Time",
  shortBreak: "Short Break",
  longBreak: "Long Break",
};

const MODE_COLORS = {
  work: "bg-red-500",
  shortBreak: "bg-green-500",
  longBreak: "bg-blue-500",
};

export default function PomodoroTimer() {
  const [mode, setMode] = useState<TimerMode>("work");
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATIONS.work);
  const [isRunning, setIsRunning] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio(
      "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT",
    );
  }, []);

  // Timer logic
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeLeft]);

  // Handle timer completion
  useEffect(() => {
    if (timeLeft === 0 && isRunning) {
      setIsRunning(false);

      // Play notification sound
      if (audioRef.current) {
        audioRef.current.play().catch(() => {
          // Ignore audio play errors (browser restrictions)
        });
      }

      if (mode === "work") {
        setCompletedSessions((prev) => prev + 1);
        // After 4 work sessions, take a long break
        const nextMode =
          (completedSessions + 1) % 4 === 0 ? "longBreak" : "shortBreak";
        setMode(nextMode);
        setTimeLeft(TIMER_DURATIONS[nextMode]);
      } else {
        // Break finished, back to work
        setMode("work");
        setTimeLeft(TIMER_DURATIONS.work);
      }
    }
  }, [timeLeft, isRunning, mode, completedSessions]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(TIMER_DURATIONS[mode]);
  };

  const switchMode = (newMode: TimerMode) => {
    setIsRunning(false);
    setMode(newMode);
    setTimeLeft(TIMER_DURATIONS[newMode]);
  };

  const progress =
    ((TIMER_DURATIONS[mode] - timeLeft) / TIMER_DURATIONS[mode]) * 100;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4 dark:from-slate-900 dark:to-slate-800">
      <Card className="mx-auto w-full max-w-md shadow-2xl">
        <CardHeader className="pb-4 text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-2xl font-bold">
            {mode === "work" ? (
              <Brain className="h-6 w-6" />
            ) : (
              <Coffee className="h-6 w-6" />
            )}
            Pomodoro Timer
          </CardTitle>
          <Badge variant="secondary" className="mx-auto">
            Session {completedSessions + 1}
          </Badge>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Mode Selector */}
          <div className="flex justify-center gap-2">
            {(Object.keys(TIMER_DURATIONS) as TimerMode[]).map((timerMode) => (
              <Button
                key={timerMode}
                variant={mode === timerMode ? "default" : "outline"}
                size="sm"
                onClick={() => switchMode(timerMode)}
                disabled={isRunning}
                className="text-xs"
              >
                {MODE_LABELS[timerMode]}
              </Button>
            ))}
          </div>

          {/* Progress Ring */}
          <div className="relative mx-auto h-48 w-48">
            <svg
              className="h-full w-full -rotate-90 transform"
              viewBox="0 0 100 100"
            >
              {/* Background circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                className="text-muted-foreground/20"
              />
              {/* Progress circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                stroke="currentColor"
                strokeWidth="3"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 45}`}
                strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
                className={`transition-all duration-1000 ${
                  mode === "work"
                    ? "text-red-500"
                    : mode === "shortBreak"
                      ? "text-green-500"
                      : "text-blue-500"
                }`}
                strokeLinecap="round"
              />
            </svg>

            {/* Timer Display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="font-mono text-4xl font-bold">
                {formatTime(timeLeft)}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {MODE_LABELS[mode]}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex justify-center gap-3">
            <Button
              onClick={toggleTimer}
              size="lg"
              className={`${MODE_COLORS[mode]} text-white hover:opacity-90`}
            >
              {isRunning ? (
                <>
                  <Pause className="mr-2 h-5 w-5" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="mr-2 h-5 w-5" />
                  Start
                </>
              )}
            </Button>

            <Button onClick={resetTimer} variant="outline" size="lg">
              <RotateCcw className="mr-2 h-5 w-5" />
              Reset
            </Button>
          </div>

          {/* Stats */}
          <div className="text-center text-sm text-muted-foreground">
            <p>Completed Sessions: {completedSessions}</p>
            <p>
              Next:{" "}
              {completedSessions % 4 === 3
                ? "Long Break"
                : completedSessions % 2 === 0
                  ? "Short Break"
                  : "Focus Time"}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
