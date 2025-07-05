'use client';

import { useEffect } from 'react';
import { config } from '@/game/config';

export default function Game() {
  useEffect(() => {
    // Import Phaser dynamically to avoid SSR issues
    import('phaser').then((Phaser) => {
      const game = new Phaser.default.Game(config);

      // Cleanup on unmount
      return () => {
        game.destroy(true);
      };
    });
  }, []);

  return null;
} 