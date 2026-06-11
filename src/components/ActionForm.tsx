"use client";

import { useActionState } from "react";
import type { ActionState } from "@/lib/actions";
import { SubmitButton } from "./SubmitButton";

type ActionFormProps = {
  action: (_state: ActionState, _formData: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  buttonLabel: string;
};

const initialState: ActionState = { ok: false, message: "" };

export function ActionForm({ action, children, buttonLabel }: ActionFormProps) {
  const [state, formAction] = useActionState(action, initialState);

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
