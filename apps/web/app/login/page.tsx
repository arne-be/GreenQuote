import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="mx-auto w-full max-w-sm px-4 py-8">
      <h1 className="mb-6 text-2xl font-medium">Sign in</h1>
      <LoginForm />
    </main>
  );
}
