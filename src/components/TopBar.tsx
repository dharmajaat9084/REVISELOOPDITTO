import React from 'react';
import { Icon } from './Icon';

interface TopBarProps {
  streak: number;
  theme: string;
  onSearch: () => void;
  onQuickAdd: () => void;
  onCycleTheme: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  streak,
  theme,
  onSearch,
  onQuickAdd,
  onCycleTheme
}) => {
  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <header className="topbar">
      <button className="ibtn" onClick={onSearch} title="Search">
        <Icon name="search" />
      </button>
      <button className="ibtn" onClick={onQuickAdd} title="Quick add question">
        <Icon name="plus" />
      </button>
      <div className="spacer" />
      <div className="streakpill" title="Current streak">
        <Icon name="flame" size={15} />
        <span>{streak}</span>
      </div>
      <button className="ibtn" onClick={onCycleTheme} title="Toggle theme">
        <Icon name={isDark ? 'sun' : 'moon'} />
      </button>
    </header>
  );
};
