"use client";

import { useState } from "react";
// @ts-ignore
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  // @ts-ignore
} from "@/components/ui/card";
// @ts-ignore
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, RotateCcw } from "lucide-react";

interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

const questions: Question[] = [
  {
    id: 1,
    question: "In what year did the American Revolution begin?",
    options: ["1773", "1775", "1776", "1777"],
    correctAnswer: 1,
    explanation:
      "The American Revolution began in 1775 with the Battles of Lexington and Concord on April 19, 1775. While the Declaration of Independence was signed in 1776, the actual fighting started a year earlier.",
  },
  {
    id: 2,
    question: "Who was the first President of the United States?",
    options: [
      "Thomas Jefferson",
      "John Adams",
      "George Washington",
      "Benjamin Franklin",
    ],
    correctAnswer: 2,
    explanation:
      "George Washington was unanimously elected as the first President of the United States in 1789. He served two terms and established many precedents for future presidents.",
  },
  {
    id: 3,
    question: "Which purchase doubled the size of the United States in 1803?",
    options: [
      "Alaska Purchase",
      "Louisiana Purchase",
      "Gadsden Purchase",
      "Texas Annexation",
    ],
    correctAnswer: 1,
    explanation:
      "The Louisiana Purchase in 1803 doubled the size of the United States. President Thomas Jefferson bought this vast territory from France for $15 million, adding about 827,000 square miles to the nation.",
  },
  {
    id: 4,
    question: "The Civil War lasted from 1861 to what year?",
    options: ["1863", "1864", "1865", "1866"],
    correctAnswer: 2,
    explanation:
      "The American Civil War ended in 1865 when Confederate General Robert E. Lee surrendered to Union General Ulysses S. Grant at Appomattox Court House on April 9, 1865.",
  },
  {
    id: 5,
    question: "Which amendment gave women the right to vote?",
    options: [
      "17th Amendment",
      "18th Amendment",
      "19th Amendment",
      "20th Amendment",
    ],
    correctAnswer: 2,
    explanation:
      "The 19th Amendment, ratified on August 18, 1920, granted women the right to vote. This was the culmination of decades of activism by suffragettes like Susan B. Anthony and Elizabeth Cady Stanton.",
  },
  {
    id: 6,
    question: "Who was President during the Great Depression?",
    options: [
      "Herbert Hoover",
      "Franklin D. Roosevelt",
      "Harry Truman",
      "Dwight Eisenhower",
    ],
    correctAnswer: 1,
    explanation:
      "Franklin D. Roosevelt was President during most of the Great Depression (1933-1945). He implemented the New Deal programs to help recover from the economic crisis that began under Herbert Hoover's presidency.",
  },
  {
    id: 7,
    question: "Which event brought the United States into World War II?",
    options: [
      "Invasion of Poland",
      "Battle of Britain",
      "Pearl Harbor Attack",
      "D-Day Invasion",
    ],
    correctAnswer: 2,
    explanation:
      "The attack on Pearl Harbor on December 7, 1941, brought the United States into World War II. The surprise attack by Japan killed over 2,400 Americans and prompted Congress to declare war the next day.",
  },
  {
    id: 8,
    question: "Who delivered the famous 'I Have a Dream' speech?",
    options: [
      "Malcolm X",
      "Martin Luther King Jr.",
      "Rosa Parks",
      "John Lewis",
    ],
    correctAnswer: 1,
    explanation:
      "Martin Luther King Jr. delivered the iconic 'I Have a Dream' speech on August 28, 1963, during the March on Washington for Jobs and Freedom. This speech became a defining moment of the Civil Rights Movement.",
  },
];

export default function AmericanHistoryQuiz() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [answeredQuestions, setAnsweredQuestions] = useState<boolean[]>(
    new Array(questions.length).fill(false),
  );

  const handleAnswerSelect = (answerIndex: number) => {
    if (showExplanation) return;
    setSelectedAnswer(answerIndex);
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null) return;

    setShowExplanation(true);

    // Update answered questions
    const newAnsweredQuestions = [...answeredQuestions];
    newAnsweredQuestions[currentQuestion] = true;
    setAnsweredQuestions(newAnsweredQuestions);

    // Update score if correct
    if (selectedAnswer === questions[currentQuestion].correctAnswer) {
      setScore(score + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } else {
      setQuizCompleted(true);
    }
  };

  const resetQuiz = () => {
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setScore(0);
    setQuizCompleted(false);
    setAnsweredQuestions(new Array(questions.length).fill(false));
  };

  const getScoreColor = () => {
    const percentage = (score / questions.length) * 100;
    if (percentage >= 80) return "bg-green-500";
    if (percentage >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getScoreMessage = () => {
    const percentage = (score / questions.length) * 100;
    if (percentage >= 80) return "Excellent! You know your American history!";
    if (percentage >= 60)
      return "Good job! You have a solid understanding of American history.";
    if (percentage >= 40)
      return "Not bad! Consider reviewing some key events in American history.";
    return "Keep studying! American history has many fascinating stories to discover.";
  };

  if (quizCompleted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-red-50 p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-blue-800">
              Quiz Complete!
            </CardTitle>
            <CardDescription className="text-lg">
              Here are your results
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <div
                className={`inline-flex h-24 w-24 items-center justify-center rounded-full ${getScoreColor()} mb-4 text-2xl font-bold text-white`}
              >
                {score}/{questions.length}
              </div>
              <p className="mb-2 text-xl font-semibold">
                You scored {Math.round((score / questions.length) * 100)}%
              </p>
              <p className="text-muted-foreground">{getScoreMessage()}</p>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Question Breakdown:</h3>
              <div className="grid grid-cols-4 gap-2">
                {questions.map((_, index) => (
                  <div
                    key={index}
                    className={`rounded p-2 text-center text-sm font-medium ${
                      answeredQuestions[index]
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    Q{index + 1}
                  </div>
                ))}
              </div>
            </div>

            <Button onClick={resetQuiz} className="w-full" size="lg">
              <RotateCcw className="mr-2 h-4 w-4" />
              Take Quiz Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const question = questions[currentQuestion];
  const isCorrect = selectedAnswer === question.correctAnswer;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-red-50 p-4">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-4xl font-bold text-blue-800">
            American History Quiz
          </h1>
          <p className="text-muted-foreground">
            Test your knowledge of American history
          </p>
        </div>

        {/* Progress and Score */}
        <div className="mb-6 flex items-center justify-between">
          <Badge variant="outline" className="text-sm">
            Question {currentQuestion + 1} of {questions.length}
          </Badge>
          <Badge variant="secondary" className="text-sm">
            Score: {score}/{questions.length}
          </Badge>
        </div>

        {/* Progress Bar */}
        <div className="mb-8 h-2 w-full rounded-full bg-gray-200">
          <div
            className="h-2 rounded-full bg-blue-600 transition-all duration-300"
            style={{
              width: `${((currentQuestion + 1) / questions.length) * 100}%`,
            }}
          ></div>
        </div>

        {/* Question Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl">{question.question}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Answer Options */}
            <div className="grid gap-3">
              {question.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(index)}
                  disabled={showExplanation}
                  className={`rounded-lg border-2 p-4 text-left transition-all duration-200 ${
                    selectedAnswer === index
                      ? showExplanation
                        ? index === question.correctAnswer
                          ? "border-green-500 bg-green-50 text-green-800"
                          : "border-red-500 bg-red-50 text-red-800"
                        : "border-blue-500 bg-blue-50"
                      : showExplanation && index === question.correctAnswer
                        ? "border-green-500 bg-green-50 text-green-800"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  } ${showExplanation ? "cursor-default" : "cursor-pointer"}`}
                >
                  <div className="flex items-center justify-between">
                    <span>{option}</span>
                    {showExplanation && (
                      <div>
                        {index === question.correctAnswer && (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        )}
                        {selectedAnswer === index &&
                          index !== question.correctAnswer && (
                            <XCircle className="h-5 w-5 text-red-600" />
                          )}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Explanation */}
            {showExplanation && (
              <div
                className={`rounded-lg p-4 ${isCorrect ? "border border-green-200 bg-green-50" : "border border-red-200 bg-red-50"}`}
              >
                <div className="flex items-start gap-3">
                  {isCorrect ? (
                    <CheckCircle className="mt-0.5 h-6 w-6 flex-shrink-0 text-green-600" />
                  ) : (
                    <XCircle className="mt-0.5 h-6 w-6 flex-shrink-0 text-red-600" />
                  )}
                  <div>
                    <p
                      className={`mb-2 font-semibold ${isCorrect ? "text-green-800" : "text-red-800"}`}
                    >
                      {isCorrect ? "Correct!" : "Incorrect!"}
                    </p>
                    <p className="text-gray-700">{question.explanation}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              {!showExplanation ? (
                <Button
                  onClick={handleSubmitAnswer}
                  disabled={selectedAnswer === null}
                  className="flex-1"
                >
                  Submit Answer
                </Button>
              ) : (
                <Button onClick={handleNextQuestion} className="flex-1">
                  {currentQuestion < questions.length - 1
                    ? "Next Question"
                    : "View Results"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
