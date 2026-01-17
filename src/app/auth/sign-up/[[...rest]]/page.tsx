'use client';

import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden">
      {/* Fondo Decorativo */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(45,212,191,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(45,212,191,0.05)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-kiriko-teal/5 blur-[120px] rounded-full"></div>
      </div>

      <div className="relative z-10 w-full max-w-md p-8 flex justify-center">
        <SignUp
          appearance={{
            elements: {
              formButtonPrimary: 'bg-kiriko-teal hover:bg-teal-400 text-black',
              footerActionLink: 'text-kiriko-teal hover:text-teal-400',
              card: 'bg-slate-900/50 backdrop-blur-md border border-slate-800',
              headerTitle: 'text-white',
              headerSubtitle: 'text-slate-400',
              socialButtonsBlockButton: 'text-white border-slate-700 hover:bg-slate-800',
              formFieldLabel: 'text-slate-400',
              formFieldInput: 'bg-black/50 border-slate-700 text-white',
            }
          }}
          routing="path"
          path="/auth/sign-up"
          signInUrl="/auth/sign-in"
          fallbackRedirectUrl="/onboarding"
        />
      </div>
    </div>
  );
}
