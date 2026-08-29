import React from 'react';
import { Icon } from './Icon';

interface BottomNavProps {
  currentView: string;
  dueCount: number;
  onNav: (view: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentView, dueCount, onNav }) => {
  return (
    <nav className="bottomnav">
      <div className="inner">
        <button
          className={`bnbtn ${currentView === 'today' ? 'active' : ''}`}
          onClick={() => onNav('today')}
        >
          <Icon name="clock" />
          Today
          {dueCount > 0 && <span className="bnbadge">{dueCount}</span>}
        </button>
        <button
          className={`bnbtn ${currentView === 'library' ? 'active' : ''}`}
          onClick={() => onNav('library')}
        >
          <Icon name="book" />
          Library
        </button>
        <button
          className={`bnbtn ${currentView === 'materials' ? 'active' : ''}`}
          onClick={() => onNav('materials')}
        >
          <Icon name="clip" />
          Files
        </button>
        <button
          className={`bnbtn ${currentView === 'stats' ? 'active' : ''}`}
          onClick={() => onNav('stats')}
        >
          <Icon name="chart" />
          Stats
        </button>
        <button
          className={`bnbtn ${currentView === 'settings' ? 'active' : ''}`}
          onClick={() => onNav('settings')}
        >
          <Icon name="gear" />
          Settings
        </button>
      </div>
    </nav>
  );
};
