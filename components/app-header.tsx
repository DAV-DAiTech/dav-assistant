"use client";

import Image from "next/image";
import { Clock3, Moon, Plus, Sun } from "lucide-react";

interface AppHeaderProps {
  dark: boolean;
  onHistory: () => void;
  onNew: () => void;
  onTheme: () => void;
}

export function AppHeader({ dark, onHistory, onNew, onTheme }: AppHeaderProps) {
  return (
    <header className="app-header">
      <div className="brand-lockup">
        <Image src="/assets/img/dav-logo.png" alt="Diplomatic Academy of Vietnam" width={34} height={34} priority />
        <div>
          <strong>DAV Assistant</strong>
          <span>Diplomatic Academy of Vietnam</span>
        </div>
      </div>
      <nav className="header-actions" aria-label="Application actions">
        <button className="header-icon mobile-history" type="button" onClick={onHistory} aria-label="Open chat history">
          <Clock3 size={18} />
        </button>
        <button className="header-icon" type="button" onClick={onNew} aria-label="Start a new chat">
          <Plus size={19} />
        </button>
        <button className="header-icon" type="button" onClick={onTheme} aria-label={dark ? "Use light theme" : "Use dark theme"}>
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <a className="primary-link" href="https://dav.edu.vn/en/" target="_blank" rel="noreferrer">
          Visit DAV website
        </a>
      </nav>
    </header>
  );
}
