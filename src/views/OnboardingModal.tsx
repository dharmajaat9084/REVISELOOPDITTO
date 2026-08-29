import React from 'react';
import { ThemeMode } from '../types';
import { cap } from '../lib/srs';
import { Icon } from '../components/Icon';

interface OnboardingModalProps {
  currentTheme: ThemeMode;
  onSetTheme: (theme: ThemeMode) => void;
  onChoose: (mode: 'fresh' | 'sample') => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  currentTheme,
  onSetTheme,
  onChoose
}) => {
  return (
    <div className="obback">
      <div className="obcard">
        <div className="obart">
          <div className="obtape t1" />
          <div className="obtape t2" />
          <div className="obnote">revise a little, every day ✎</div>
          <div className="obstain" />
        </div>

        <div className="obbody">
          <div className="tag2">personal · local · no AI</div>
          <h1>ReviseLoop</h1>
          <p style={{ color: 'var(--muted)', fontSize: '.9rem', lineHeight: 1.55 }}>
            A quiet spaced-repetition desk for your own notes. Organise → revise → rate → repeat. Attach PDFs, photos, text & voice notes anywhere — they open right inside your review.
          </p>

          <ul className="oblist">
            <li>
              <Icon name="check" size={15} /> Build subjects → chapters → topics → subtopics
            </li>
            <li>
              <Icon name="clip" size={15} /> Attach notes, PDFs, images, voice memos (everywhere)
            </li>
            <li>
              <Icon name="check" size={15} /> Revise when due and rate Again / Hard / Good / Easy
            </li>
            <li>
              <Icon name="check" size={15} /> Everything stored privately on this device
            </li>
          </ul>

          <div className="chiprow" style={{ marginBottom: '18px' }}>
            {(['light', 'dark', 'system'] as ThemeMode[]).map((m) => (
              <button
                key={m}
                type="button"
                className={`chip ${currentTheme === m ? 'active' : ''}`}
                onClick={() => onSetTheme(m)}
              >
                {cap(m)}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn primary"
              onClick={() => onChoose('fresh')}
            >
              <Icon name="plus" size={15} /> Create first subject
            </button>
            <button
              type="button"
              className="btn soft"
              onClick={() => onChoose('sample')}
            >
              <Icon name="zap" size={15} /> Load sample plan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
