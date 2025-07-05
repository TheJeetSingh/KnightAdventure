'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the Game component to avoid SSR issues
const Game = dynamic(() => import('@/components/Game'), { ssr: false });

export default function Home() {
  return (
    <main className="w-screen h-screen p-0 m-0 overflow-hidden">
      <div id="game-container" className="w-full h-full">
        <Game />
      </div>
    </main>
  );
} 