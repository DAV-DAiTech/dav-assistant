"use client";

import { BookOpen, Building2, GraduationCap, Sparkles } from "lucide-react";

const suggestions = [
  { title: "Programs & Admissions", prompt: "What undergraduate programs and admission pathways does DAV offer?", icon: GraduationCap },
  { title: "Scholarships", prompt: "What scholarship opportunities are available for DAV students?", icon: Sparkles },
  { title: "Academic Services", prompt: "What academic support services can DAV students access?", icon: BookOpen },
  { title: "Campus Life", prompt: "Tell me about student clubs and campus life at DAV.", icon: Building2 },
];

export function WelcomePanel({ onPrompt }: { onPrompt: (prompt: string) => void }) {
  return (
    <div className="welcome-panel">
      <div className="welcome-mark" aria-hidden="true">DAV</div>
      <p className="eyebrow">Official information assistant</p>
      <h1>How can we help?</h1>
      <p className="welcome-copy">Ask about programs, admissions, scholarships, academic services, and student life at the Diplomatic Academy of Vietnam.</p>
      <div className="suggestion-grid">
        {suggestions.map(({ title, prompt, icon: Icon }) => (
          <button className="suggestion-card" type="button" key={title} onClick={() => onPrompt(prompt)}>
            <span className="suggestion-icon"><Icon size={18} /></span>
            <span><strong>{title}</strong><small>{prompt}</small></span>
          </button>
        ))}
      </div>
    </div>
  );
}
