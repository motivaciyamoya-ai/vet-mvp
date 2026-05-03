import { createContext, useContext, useState, ReactNode } from "react";

export interface ForumTopic {
  id: number;
  title: string;
  description: string;
  author: string;
  authorEmail: string;
  location: string;
  category: string;
  replies: number;
  views: number;
  likes: number;
  time: string;
  timestamp: string;
  originalLang: string;
  urgency?: "critical" | "high" | "medium";
  isHot: boolean;
  isClosed?: boolean;
  solvedBy?: {
    name: string;
    location: string;
    solvedAt: string;
  };
  badges?: Array<{ id: string; name: string; icon: string; color: string }>;
}

interface ForumContextType {
  topics: ForumTopic[];
  addTopic: (topic: Omit<ForumTopic, "id" | "replies" | "views" | "likes" | "time" | "timestamp">) => void;
  closeTopic: (topicId: number, solvedBy: { name: string; location: string }) => void;
}

const ForumContext = createContext<ForumContextType | undefined>(undefined);

export function ForumProvider({ children }: { children: ReactNode }) {
  /** Демо-темы убраны: «Горячие/закрытые» из контекста заполняются только действиями пользователя; лента «Все» — из API. */
  const [topics, setTopics] = useState<ForumTopic[]>([]);

  const addTopic = (topic: Omit<ForumTopic, "id" | "replies" | "views" | "likes" | "time" | "timestamp">) => {
    const now = new Date();
    const newTopic: ForumTopic = {
      ...topic,
      id: Date.now(),
      replies: 0,
      views: 1,
      likes: 0,
      time: "Только что",
      timestamp: now.toISOString(),
    };

    setTopics(prev => [newTopic, ...prev]);
  };

  const closeTopic = (topicId: number, solvedBy: { name: string; location: string }) => {
    setTopics(prev =>
      prev.map(topic =>
        topic.id === topicId
          ? {
              ...topic,
              isClosed: true,
              solvedBy: {
                ...solvedBy,
                solvedAt: new Date().toISOString(),
              },
            }
          : topic
      )
    );
  };

  return (
    <ForumContext.Provider value={{ topics, addTopic, closeTopic }}>
      {children}
    </ForumContext.Provider>
  );
}

export function useForum() {
  const context = useContext(ForumContext);
  if (!context) {
    throw new Error("useForum must be used within ForumProvider");
  }
  return context;
}
