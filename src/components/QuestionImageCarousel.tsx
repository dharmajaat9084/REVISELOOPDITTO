import React, { useEffect, useState } from 'react';
import { IDB } from '../lib/idb';
import { FileRecord } from '../types';
import { Icon } from './Icon';

interface QuestionImageCarouselProps {
  questionId: string;
  onOpenViewer?: (fileId: string) => void;
}

export const QuestionImageCarousel: React.FC<QuestionImageCarouselProps> = ({
  questionId,
  onOpenViewer
}) => {
  const [images, setImages] = useState<FileRecord[]>([]);
  const [index, setIndex] = useState(0);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    IDB.all().then((all) => {
      if (!active) return;
      const filtered = all
        .filter(
          (r) =>
            r.ownerType === 'question' &&
            r.ownerId === questionId &&
            r.role === 'question' &&
            r.kind === 'image'
        )
        .sort((a, b) => a.createdAt - b.createdAt);
      setImages(filtered);
      setIndex(0);
    });
    return () => {
      active = false;
    };
  }, [questionId]);

  useEffect(() => {
    if (!images.length || !images[index]) {
      setBlobUrl(null);
      return;
    }
    const current = images[index];
    if (current.blob) {
      const url = URL.createObjectURL(current.blob);
      setBlobUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [images, index]);

  if (!images.length || !blobUrl) return null;

  return (
    <div className="qimgbox">
      <img
        src={blobUrl}
        alt="question illustration"
        style={{ cursor: onOpenViewer ? 'pointer' : 'default' }}
        onClick={() => onOpenViewer && onOpenViewer(images[index].id)}
      />
      {images.length > 1 && (
        <div className="pdots">
          <button
            type="button"
            className="ibtn"
            onClick={() => setIndex((prev) => Math.max(0, prev - 1))}
            title="Previous image"
          >
            <Icon name="back" size={14} />
          </button>
          <span>
            {images.map((_, k) => (
              <i
                key={k}
                className={k === index ? 'on' : ''}
                onClick={() => setIndex(k)}
              />
            ))}
          </span>
          <button
            type="button"
            className="ibtn"
            onClick={() => setIndex((prev) => Math.min(images.length - 1, prev + 1))}
            title="Next image"
          >
            <Icon name="chev" size={14} />
          </button>
        </div>
      )}
    </div>
  );
};
