/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BubbleShooter } from './components/BubbleShooter';

export default function App() {
  return (
    <div className="h-[100dvh] w-full bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 flex flex-col items-center justify-center font-sans overflow-hidden relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
         <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-400/30 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '6s' }} />
         <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-pink-400/30 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '8s', animationDelay: '1s' }} />
         <div className="absolute top-[20%] right-[10%] w-[30%] h-[40%] bg-blue-400/20 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
      </div>
      
      <div className="w-full h-full relative z-10 flex items-center justify-center">
        <BubbleShooter />
      </div>
    </div>
  );
}
