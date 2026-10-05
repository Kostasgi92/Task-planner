import { SignIn, SignUp } from '@clerk/react';

export function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-4">
      <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
    </div>
  );
}

export function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-4">
      <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
    </div>
  );
}
