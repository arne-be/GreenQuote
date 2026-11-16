import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  return (
    <main className="mx-auto w-full max-w-sm px-4 py-8">
      <h1 className="mb-6 text-2xl font-medium">Register</h1>
      <RegisterForm />
    </main>
  );
}
