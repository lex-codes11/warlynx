/**
 * CharacterImageViewer Component
 * 
 * Renders character images at specified sizes (thumbnail, large, fullscreen).
 * Opens modal on click for fullscreen view.
 * Maintains aspect ratios when scaling.
 * Provides close mechanism to return to gameplay.
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */

'use client';

import { useState } from 'react';

interface CharacterImageViewerProps {
  imageUrl: string;
  characterName: string;
  size?: 'thumbnail' | 'large' | 'fullscreen';
  onClick?: () => void;
  className?: string;
}

/**
 * CharacterImageViewer Component
 * 
 * Displays character images at larger sizes (Requirement 5.1).
 * Opens fullscreen modal on click (Requirement 5.2).
 * Maintains aspect ratios (Requirement 5.4).
 */
export function CharacterImageViewer({
  imageUrl,
  characterName,
  size = 'thumbnail',
  onClick,
  className = '',
}: CharacterImageViewerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleImageClick = () => {
    if (onClick) {
      onClick();
    } else if (size !== 'fullscreen') {
      setIsModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  // Size classes (Requirement 5.1, 5.4 - maintains aspect ratio with object-cover)
  const sizeClasses = {
    thumbnail: 'w-32 h-32',
    large: 'w-64 h-64',
    fullscreen: 'max-w-full max-h-full',
  };

  const containerClasses = {
    thumbnail: 'w-32 h-32',
    large: 'w-64 h-64',
    fullscreen: 'w-full h-full',
  };

  if (size === 'fullscreen') {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <img
          src={imageUrl}
          alt={characterName}
          className={`${sizeClasses.fullscreen} object-contain`}
        />
      </div>
    );
  }

  return (
    <>
      {/* Image Display (Requirement 5.1) */}
      <div className={`${containerClasses[size]} ${className}`}>
        <button
          onClick={handleImageClick}
          className="relative w-full h-full group cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg overflow-hidden"
          aria-label={`View ${characterName}'s image in fullscreen`}
        >
          {/* Image with aspect ratio preservation (Requirement 5.4) */}
          <img
            src={imageUrl}
            alt={characterName}
            className={`${sizeClasses[size]} object-cover rounded-lg transition-transform duration-200 group-hover:scale-105`}
          />

          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 rounded-lg flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                />
              </svg>
            </div>
          </div>
        </button>

        {/* Character Name Label */}
        <p className="text-xs text-gray-600 text-center mt-2 font-medium">
          {characterName}
        </p>
      </div>

      {/* Fullscreen Modal (Requirement 5.2, 5.3) */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4"
          onClick={handleCloseModal}
        >
          <div className="relative max-w-6xl max-h-full">
            {/* Close Button (Requirement 5.3) */}
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 z-10 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Close fullscreen view"
            >
              <svg
                className="w-6 h-6 text-gray-800"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            {/* Fullscreen Image (Requirement 5.4 - maintains aspect ratio) */}
            <div
              className="bg-white rounded-lg shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={imageUrl}
                alt={characterName}
                className="max-w-full max-h-[90vh] object-contain"
              />

              {/* Character Name in Modal */}
              <div className="p-4 bg-gray-50 border-t border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 text-center">
                  {characterName}
                </h3>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * CharacterImageGallery Component
 * 
 * Displays multiple character images in a grid layout.
 * Useful for showing all characters in a game session.
 */
interface CharacterImageGalleryProps {
  characters: Array<{
    id: string;
    name: string;
    imageUrl: string;
  }>;
  size?: 'thumbnail' | 'large';
  className?: string;
}

export function CharacterImageGallery({
  characters,
  size = 'thumbnail',
  className = '',
}: CharacterImageGalleryProps) {
  if (!characters || characters.length === 0) {
    return null;
  }

  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 ${className}`}>
      {characters.map((character) => (
        <CharacterImageViewer
          key={character.id}
          imageUrl={character.imageUrl}
          characterName={character.name}
          size={size}
        />
      ))}
    </div>
  );
}
