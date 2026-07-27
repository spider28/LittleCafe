"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import type { ActionState } from "@/lib/actions";
import { SubmitButton } from "./SubmitButton";

type ActionFormProps = {
  action: (_state: ActionState, _formData: FormData) => Promise<ActionState>;
  children?: React.ReactNode;
  buttonLabel: string;
};

const initialState: ActionState = { ok: false, message: "" };

export function ActionForm({ action, children, buttonLabel }: ActionFormProps) {
  const [state, formAction] = useActionState(action, initialState);
  const router = useRouter();

  useEffect(() => {
    if (!state.ok || !state.authChanged) {
      return;
    }

    window.dispatchEvent(new Event("littlecafe:auth-changed"));

    if (state.redirectTo) {
      router.replace(state.redirectTo);
    }
    router.refresh();
  }, [router, state.authChanged, state.ok, state.redirectTo]);

  return (
    <form action={formAction} className="grid gap-4">
      {children}
      <SubmitButton>{buttonLabel}</SubmitButton>
      {state.message ? (
        <p className={state.ok ? "text-sm font-medium text-sage" : "text-sm font-medium text-berry"}>{state.message}</p>
      ) : null}
    </form>
  );
}
