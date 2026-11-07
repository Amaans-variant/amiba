export interface LayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  static?: boolean;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  completed: boolean;
  created_at: string;
}

export type Role = "student" | "admin";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: Role;
  study_minutes: number;
  created_at: string;
}

export interface StudyRoom {
  id: string;
  created_by: string;
  invite_code: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export interface AIChatTurn {
  role: "user" | "model";
  text: string;
}

export interface FlashCard {
  question: string;
  answer: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

export type DocTabMode = "flashcards" | "quiz" | "pyq";
