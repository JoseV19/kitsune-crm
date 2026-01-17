'use client';

import { SignUp } from '@clerk/nextjs';
import { shadcn } from '@clerk/themes'

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
            theme: shadcn
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
