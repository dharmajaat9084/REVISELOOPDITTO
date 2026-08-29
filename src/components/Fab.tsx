import React from 'react';
import { Icon } from './Icon';

interface FabProps {
  currentView: string;
  hasSession: boolean;
  onClick: (e: React.MouseEvent) => void;
}

export const Fab: React.FC<FabProps> = ({ currentView, hasSession, onClick }) => {
  const allowed = [
    'today',
    'library',
    'subject',
    'chapter',
    'topic',
    'subtopic',
    'folder'
  ].includes(currentView);

  if (!allowed || hasSession) return null;

  return (
    <button className="fab" onClick={onClick} title="Add">
      <Icon name="plus" />
    </button>
  );
};
