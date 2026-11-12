'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { RoomPhoto } from '@/lib/roomPhotos';

/**
 * Galerie de la fiche salle : une grande photo et des vignettes, chaque photo
 * s'ouvrant en plein écran (flèches clavier / Échap pris en charge).
 */
export default function RoomGallery({ photos }: { photos: RoomPhoto[] }) {
  const [open, setOpen] = useState<number | null>(null);

  const close = useCallback(() => setOpen(null), []);
  const move = useCallback(
    (step: number) =>
      setOpen(i => (i === null ? i : (i + step + photos.length) % photos.length)),
    [photos.length]
  );

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') move(1);
      if (e.key === 'ArrowLeft') move(-1);
    };
    window.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, close, move]);

  if (photos.length === 0) return null;

  const [first, ...rest] = photos;

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => setOpen(0)}
          className={`relative overflow-hidden rounded-xl group ${
            rest.length >= 2
              ? 'sm:col-span-2 sm:row-span-2'
              : rest.length === 1
                ? 'sm:col-span-2'
                : 'sm:col-span-4'
          } aspect-[4/3]`}
          aria-label={`Agrandir : ${first.alt}`}
        >
          <Image
            src={first.src}
            alt={first.alt}
            fill
            sizes="(max-width: 640px) 100vw, 50vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            priority
          />
        </button>
        {rest.slice(0, 4).map((photo, i) => (
          <button
            key={photo.src}
            type="button"
            onClick={() => setOpen(i + 1)}
            className={`relative overflow-hidden rounded-xl group aspect-[4/3] hidden sm:block ${
              rest.length === 1 ? 'sm:col-span-2' : ''
            }`}
            aria-label={`Agrandir : ${photo.alt}`}
          >
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              sizes="25vw"
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
            {i === 3 && photos.length > 5 && (
              <span className="absolute inset-0 bg-black/50 text-white text-lg font-semibold flex items-center justify-center">
                +{photos.length - 5}
              </span>
            )}
          </button>
        ))}
      </div>
      {photos.length > 1 && (
        <button
          type="button"
          onClick={() => setOpen(0)}
          className="sm:hidden mt-2 text-sm font-medium text-primary-700 dark:text-accent-300"
        >
          Voir les {photos.length} photos
        </button>
      )}

      {open !== null && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Photos de la salle"
          onClick={close}
        >
          <button
            type="button"
            onClick={close}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
            aria-label="Fermer"
          >
            <X className="w-6 h-6" />
          </button>
          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); move(-1); }}
                className="absolute left-2 sm:left-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
                aria-label="Photo précédente"
              >
                <ChevronLeft className="w-7 h-7" />
              </button>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); move(1); }}
                className="absolute right-2 sm:right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
                aria-label="Photo suivante"
              >
                <ChevronRight className="w-7 h-7" />
              </button>
            </>
          )}
          <div
            className="relative w-full max-w-5xl aspect-[4/3] max-h-[85vh]"
            onClick={e => e.stopPropagation()}
          >
            <Image
              src={photos[open].src}
              alt={photos[open].alt}
              fill
              sizes="100vw"
              className="object-contain"
            />
          </div>
          <p className="absolute bottom-4 left-0 right-0 text-center text-white/80 text-sm">
            {photos[open].alt} · {open + 1} / {photos.length}
          </p>
        </div>
      )}
    </>
  );
}
