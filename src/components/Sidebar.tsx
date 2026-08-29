import React from 'react';
import { Icon } from './Icon';
import { cap } from '../lib/srs';

interface SidebarProps {
  currentView: string;
  dueCount: number;
  theme: string;
  onNav: (view: string) => void;
  onSearchPreset: (preset: string) => void;
  onCycleTheme: () => void;
  onExportZIP: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  dueCount,
  theme,
  onNav,
  onSearchPreset,
  onCycleTheme,
  onExportZIP
}) => {
  return (
    <aside className="sidebar">
      <div className="brand" onClick={() => onNav('today')} style={{ cursor: 'pointer' }}>
        <div className="brandlogo">
          <Icon name="clip" size={18} />
        </div>
        <div>
          <b>ReviseLoop</b>
          <span className="brandtag">your study desk</span>
        </div>
      </div>

      <div className="nav">
        <div className="navlabel">Study</div>
        <button
          className={`navbtn ${currentView === 'today' ? 'active' : ''}`}
          onClick={() => onNav('today')}
        >
          <Icon name="clock" />
          Today
          {dueCount > 0 && <span className="navbadge">{dueCount}</span>}
        </button>
        <button
          className={`navbtn ${currentView === 'library' ? 'active' : ''}`}
          onClick={() => onNav('library')}
        >
          <Icon name="book" />
          Library
        </button>
        <button
          className={`navbtn ${currentView === 'materials' ? 'active' : ''}`}
          onClick={() => onNav('materials')}
        >
          <Icon name="clip" />
          Materials
        </button>
        <button
          className={`navbtn ${currentView === 'stats' ? 'active' : ''}`}
          onClick={() => onNav('stats')}
        >
          <Icon name="chart" />
          Stats
        </button>
        <button
          className={`navbtn ${currentView === 'settings' ? 'active' : ''}`}
          onClick={() => onNav('settings')}
        >
          <Icon name="gear" />
          Settings
        </button>

        <div className="navlabel">Quick filters</div>
        <button
          className="navbtn"
          onClick={() => {
            onNav('search');
            onSearchPreset('overdue');
          }}
        >
          <Icon name="alert" />
          Overdue
        </button>
        <button
          className="navbtn"
          onClick={() => {
            onNav('search');
            onSearchPreset('high');
          }}
        >
          <Icon name="flag" />
          High priority
        </button>
        <button
          className="navbtn"
          onClick={() => {
            onNav('search');
            onSearchPreset('suspended');
          }}
        >
          <Icon name="pause" />
          Suspended
        </button>
      </div>

      <div className="sidefoot">
        <button className="navbtn" onClick={onCycleTheme}>
          <Icon name="moon" />
          <span>Theme: {cap(theme)}</span>
        </button>
        <button className="navbtn" onClick={onExportZIP}>
          <Icon name="download" />
          Backup (ZIP)
        </button>
      </div>
    </aside>
  );
};
