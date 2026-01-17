'use client';

import Link from 'next/link';
import { useUser } from '@clerk/nextjs';

export default function Home() {
  const { user, isLoaded } = useUser();

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden">
      {/* Fondo Decorativo */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(45,212,191,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(45,212,191,0.05)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-kiriko-teal/5 blur-[120px] rounded-full"></div>
      </div>

      <div className="relative z-10 text-center space-y-8">
        <h1 className="text-4xl font-bold text-white mb-4">Landing page (WIP)</h1>
        
        {isLoaded && (
          <div className="flex gap-4 justify-center">
            {user ? (
              <Link
                href="/dashboard"
                className="px-6 py-3 bg-kiriko-teal hover:bg-teal-400 text-black font-medium rounded-lg transition-colors"
              >
                Ir al Panel
              </Link>
            ) : (
              <>
                <Link
                  href="/auth/sign-in"
                  className="px-6 py-3 bg-kiriko-teal hover:bg-teal-400 text-black font-medium rounded-lg transition-colors"
                >
                  Iniciar Sesión
                </Link>
                <Link
                  href="/auth/sign-up"
                  className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg border border-slate-700 transition-colors"
                >
                  Registrarse
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}