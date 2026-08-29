import React, { useEffect, useState } from 'react';
import { AppDatabase, AccentColor, SrsPreset, Schedule } from '../types';
import { IDB, fmtMB } from '../lib/idb';
import { saveDB } from '../lib/db';
import { exportCSV, exportJSON, exportZIP, importAny } from '../lib/backup';
import { cap, srsNext, timeAgo, todayISO } from '../lib/srs';
import { Icon } from '../components/Icon';

interface SettingsViewProps {
  db: AppDatabase;
  onSetThemeMode: (theme: any) => void;
  onSetAccent: (accent: AccentColor) => void;
  onApplyPreset: (preset: SrsPreset) => void;
  onOpenTrash: () => void;
  onResetApp: () => void;
  onLoadSample: () => void;
  onToast: (msg: string, icon?: string) => void;
  onAskConfirm: (title: string, msg: string, onOk: () => void) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  db,
  onSetThemeMode,
  onSetAccent,
  onApplyPreset,
  onOpenTrash,
  onResetApp,
  onLoadSample,
  onToast,
  onAskConfirm
}) => {
  const [vaultSummary, setVaultSummary] = useState('...');
  const st = db.settings;
  const srs = st.srs;

  useEffect(() => {
    IDB.all().then((all) => {
      const bytes = all.reduce((acc, r) => acc + (r.size || 0), 0);
      setVaultSummary(`${all.length} files · ${fmtMB(bytes)} on this device`);
    });
  }, []);

  const srsPreview = () => {
    let s: Schedule = {
      due: todayISO(),
      interval: 7,
      ease: db.settings.srs.easeStart,
      reps: 3,
      lapses: 0,
      box: 3,
      lastReviewed: Date.now()
    };
    const out = [];
    for (let i = 0; i < 4; i++) {
      s = srsNext(s, 'good', db.settings.srs);
      out.push(s.interval + 'd');
    }
    return out.join(' → ');
  };

  const handleUpdate = (path: string, val: any) => {
    let finalVal = val;
    if (val === 'true') finalVal = true;
    if (val === 'false') finalVal = false;
    if (typeof val === 'string' && val !== '' && !isNaN(+val)) finalVal = +val;

    const parts = path.split('.');
    let o: any = db.settings;
    for (let i = 0; i < parts.length - 1; i++) {
      o = o[parts[i]];
    }
    o[parts[parts.length - 1]] = finalVal;
    saveDB();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      importAny(f, onAskConfirm, onToast, () => {
        saveDB();
      });
      e.target.value = '';
    }
  };

  return (
    <div>
      <div className="pagehead">
        <div>
          <h1>Settings</h1>
          <div className="sub">Local-only · private · yours</div>
        </div>
      </div>

      {/* SRS */}
      <div className="card setcard">
        <h3>Spaced repetition</h3>
        <div className="desc">
          Transparent, rule-based scheduling. Changes apply to future reviews only.
        </div>

        <div className="setrow">
          <div className="sl">
            <b>Mode</b>
            <span>Adaptive intervals or simple Leitner boxes</span>
          </div>
          <select
            style={{ width: '150px' }}
            value={srs.mode}
            onChange={(e) => handleUpdate('srs.mode', e.target.value)}
          >
            <option value="adaptive">Adaptive</option>
            <option value="leitner">Leitner boxes</option>
          </select>
        </div>

        <div className="setrow">
          <div className="sl">
            <b>Preset</b>
            <span>Quick interval profiles</span>
          </div>
          <div className="chiprow">
            {(['gentle', 'standard', 'exam'] as SrsPreset[]).map((p) => (
              <button
                key={p}
                type="button"
                className={`chip ${srs.preset === p ? 'active' : ''}`}
                onClick={() => onApplyPreset(p)}
              >
                {cap(p)}
              </button>
            ))}
          </div>
        </div>

        <div className="setrow">
          <div className="sl">
            <b>First intervals (days)</b>
            <span>Again / Hard / Good / Easy for new items</span>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {(['again', 'hard', 'good', 'easy'] as const).map((k) => (
              <input
                key={k}
                type="number"
                min="1"
                max="30"
                style={{ width: '56px' }}
                value={srs.first[k]}
                onChange={(e) => handleUpdate(`srs.first.${k}`, e.target.value)}
              />
            ))}
          </div>
        </div>

        <div className="setrow">
          <div className="sl">
            <b>Hard multiplier</b>
          </div>
          <input
            type="number"
            step="0.1"
            min="1"
            max="2"
            style={{ width: '80px' }}
            value={srs.hardMult}
            onChange={(e) => handleUpdate('srs.hardMult', e.target.value)}
          />
        </div>

        <div className="setrow">
          <div className="sl">
            <b>Easy bonus</b>
          </div>
          <input
            type="number"
            step="0.1"
            min="1"
            max="2.5"
            style={{ width: '80px' }}
            value={srs.easyBonus}
            onChange={(e) => handleUpdate('srs.easyBonus', e.target.value)}
          />
        </div>

        <div className="setrow">
          <div className="sl">
            <b>Starting ease</b>
          </div>
          <input
            type="number"
            step="0.1"
            min="1.3"
            max="3"
            style={{ width: '80px' }}
            value={srs.easeStart}
            onChange={(e) => handleUpdate('srs.easeStart', e.target.value)}
          />
        </div>

        <div className="setrow">
          <div className="sl">
            <b>Max interval (days)</b>
          </div>
          <input
            type="number"
            min="7"
            max="365"
            style={{ width: '80px' }}
            value={srs.maxInterval}
            onChange={(e) => handleUpdate('srs.maxInterval', e.target.value)}
          />
        </div>

        <div className="crumb" style={{ marginTop: '10px' }}>
          Preview (Good on a 7-day item): {srsPreview()}
        </div>
      </div>

      {/* Review Settings */}
      <div className="card setcard">
        <h3>Review</h3>
        <div className="desc">Daily rhythm and queue behaviour.</div>

        <div className="setrow">
          <div className="sl">
            <b>Daily goal</b>
            <span>Revisions per day</span>
          </div>
          <input
            type="number"
            min="1"
            max="200"
            style={{ width: '90px' }}
            value={st.dailyGoal}
            onChange={(e) => handleUpdate('dailyGoal', e.target.value)}
          />
        </div>

        <div className="setrow">
          <div className="sl">
            <b>Allow reviewing ahead</b>
          </div>
          <div
            className={`switch ${st.reviewAhead ? 'on' : ''}`}
            onClick={() => handleUpdate('reviewAhead', !st.reviewAhead)}
          />
        </div>

        <div className="setrow">
          <div className="sl">
            <b>Default queue order</b>
          </div>
          <select
            style={{ width: '170px' }}
            value={st.order}
            onChange={(e) => handleUpdate('order', e.target.value)}
          >
            <option value="priority">Priority first</option>
            <option value="due">Oldest due first</option>
          </select>
        </div>
      </div>

      {/* Reminders */}
      <div className="card setcard">
        <h3>Reminders</h3>
        <div className="desc">Saved locally — pair with your own habit or OS reminders.</div>

        <div className="setrow">
          <div className="sl">
            <b>Daily reminder</b>
          </div>
          <div
            className={`switch ${st.reminder.enabled ? 'on' : ''}`}
            onClick={() => handleUpdate('reminder.enabled', !st.reminder.enabled)}
          />
        </div>

        <div className="setrow">
          <div className="sl">
            <b>Reminder time</b>
          </div>
          <input
            type="time"
            style={{ width: '130px' }}
            value={st.reminder.time}
            onChange={(e) => handleUpdate('reminder.time', e.target.value)}
          />
        </div>
      </div>

      {/* Appearance */}
      <div className="card setcard">
        <h3>Appearance</h3>
        <div className="desc">A warm study-desk by default; lamplight at night.</div>

        <div className="setrow">
          <div className="sl">
            <b>Theme</b>
          </div>
          <div className="chiprow">
            {['light', 'dark', 'system'].map((m) => (
              <button
                key={m}
                type="button"
                className={`chip ${st.theme === m ? 'active' : ''}`}
                onClick={() => onSetThemeMode(m)}
              >
                {cap(m)}
              </button>
            ))}
          </div>
        </div>

        <div className="setrow">
          <div className="sl">
            <b>Accent color</b>
          </div>
          <div className="swatches">
            {[
              ['gold', '#efb33b'],
              ['ink', '#4a6fa5'],
              ['redpen', '#c65460'],
              ['forest', '#56795c'],
              ['plum', '#8b5f8a']
            ].map(([acc, col]) => (
              <button
                key={acc}
                type="button"
                className={`swatch ${st.accent === acc ? 'sel' : ''}`}
                style={{ background: col }}
                onClick={() => onSetAccent(acc as AccentColor)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Data & Vault */}
      <div className="card setcard">
        <h3>Data & vault</h3>
        <div className="desc">Everything stays on this device. Backup regularly.</div>

        <div className="setrow">
          <div className="sl">
            <b>Attachment vault</b>
            <span>{vaultSummary}</span>
          </div>
        </div>

        <div className="setrow">
          <div className="sl">
            <b>Export backup (ZIP: data + files)</b>
            <span>
              {db.lastBackupAt ? `Last backup ${timeAgo(db.lastBackupAt)}` : 'Never backed up'}
            </span>
          </div>
          <button
            type="button"
            className="btn small soft"
            onClick={() => exportZIP(onToast)}
          >
            <Icon name="download" size={14} /> ZIP
          </button>
        </div>

        <div className="setrow">
          <div className="sl">
            <b>Export data only (JSON)</b>
          </div>
          <button
            type="button"
            className="btn small ghost"
            onClick={() => exportJSON(onToast)}
          >
            <Icon name="download" size={14} /> JSON
          </button>
        </div>

        <div className="setrow">
          <div className="sl">
            <b>Import backup</b>
            <span>.zip or .json</span>
          </div>
          <label className="btn small ghost" style={{ cursor: 'pointer' }}>
            <Icon name="upload" size={14} /> Import
            <input
              type="file"
              accept=".zip,.json"
              style={{ display: 'none' }}
              onChange={handleImportFile}
            />
          </label>
        </div>

        <div className="setrow">
          <div className="sl">
            <b>Export review log (CSV)</b>
          </div>
          <button
            type="button"
            className="btn small ghost"
            onClick={() => exportCSV(onToast)}
          >
            <Icon name="download" size={14} /> CSV
          </button>
        </div>

        <div className="setrow">
          <div className="sl">
            <b>Load sample plan</b>
            <span>Overwrites with demo data</span>
          </div>
          <button type="button" className="btn small ghost" onClick={onLoadSample}>
            Load
          </button>
        </div>

        <div className="setrow">
          <div className="sl">
            <b>Trash</b>
            <span>
              {db.trash.length} deleted item{db.trash.length === 1 ? '' : 's'}
            </span>
          </div>
          <button type="button" className="btn small ghost" onClick={onOpenTrash}>
            Manage
          </button>
        </div>

        <div className="setrow">
          <div className="sl">
            <b style={{ color: 'var(--danger)' }}>Reset app</b>
            <span>Delete everything incl. vault</span>
          </div>
          <button type="button" className="btn small danger" onClick={onResetApp}>
            Reset
          </button>
        </div>
      </div>

      {/* Privacy */}
      <div className="card setcard">
        <h3>Privacy</h3>
        <div className="desc">
          No accounts · no cloud · no analytics · no tracking. Your notes stay yours.
        </div>
        <div className="chiprow">
          <span className="badge b-ok">
            <Icon name="check" size={11} /> Local-only
          </span>
          <span className="badge b-ok">
            <Icon name="check" size={11} /> No AI
          </span>
          <span className="badge b-ok">
            <Icon name="check" size={11} /> No flashcards
          </span>
        </div>
      </div>
    </div>
  );
};
