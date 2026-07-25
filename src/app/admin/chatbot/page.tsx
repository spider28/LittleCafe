import { ActionForm } from "@/components/ActionForm";
import { Field } from "@/components/Field";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";
import { createChatbotKnowledgeAction, deleteChatbotKnowledgeAction, updateChatbotSettingsAction } from "@/lib/actions";
import { getAdminChatbotData } from "@/lib/data";
import { env } from "@/lib/env";

export const metadata = { title: "Chatbot admin" };

export default async function AdminChatbotPage() {
  const data = await getAdminChatbotData();

  return (
    <div className="grid gap-6">
      <AdminSectionHeader
        title="Chatbot"
        description="Choose the model provider and manage the approved content available to chatbot retrieval."
      />

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <AdminPanel title="Settings" description="Provider changes apply to both answers and knowledge embeddings.">
          <ActionForm action={updateChatbotSettingsAction} buttonLabel="Save chatbot settings">
            <label className="flex items-center gap-3 text-sm font-medium text-ink">
              <input
                name="enabled"
                type="checkbox"
                defaultChecked={data.settings.enabled}
                className="h-4 w-4 rounded border-black/20 text-roast focus:ring-roast"
              />
              Enable chatbot
            </label>

            <fieldset className="grid gap-3">
              <legend className="text-sm font-medium text-ink">Provider</legend>
              <ProviderOption
                value="openai"
                label="OpenAI"
                checked={data.settings.provider === "openai"}
                detail={`Model: ${env.openaiModel || "not set"} · Endpoint: ${env.openaiEndPoint || "default Responses API"}`}
              />
              <ProviderOption
                value="github"
                label="GitHub Models"
                checked={data.settings.provider === "github"}
                detail={`Model: ${env.githubModel || "not set"} · Endpoint: ${env.githubEndPoint || "not set"}`}
              />
            </fieldset>
          </ActionForm>
        </AdminPanel>

        <AdminPanel title="Add knowledge" description="Manually add verified cafe information to vector retrieval.">
          <ActionForm action={createChatbotKnowledgeAction} buttonLabel="Add knowledge">
            <Field name="title" label="Title" required />
            <Field name="source" label="Source" placeholder="FAQ, menu, policy, event" />
            <Field name="content" label="Content" textarea required />
            <label className="flex items-center gap-3 text-sm font-medium text-ink">
              <input
                name="active"
                type="checkbox"
                defaultChecked
                className="h-4 w-4 rounded border-black/20 text-roast focus:ring-roast"
              />
              Active
            </label>
          </ActionForm>
        </AdminPanel>
      </div>

      <AdminPanel title="Knowledge library" description={`${data.knowledge.length} most recent approved items.`}>
        <div className="grid gap-3 md:grid-cols-2">
          {data.knowledge.map((item) => (
            <article key={item.id} className="rounded-md bg-crema p-4 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-ink">{item.title}</p>
                  <p className="mt-1 text-xs uppercase tracking-wide text-ink/55">
                    {item.source} · {item.active ? "active" : "inactive"}
                  </p>
                </div>
                <form action={deleteChatbotKnowledgeAction}>
                  <input type="hidden" name="id" value={item.id} />
                  <button className="font-semibold text-berry" type="submit">
                    Delete
                  </button>
                </form>
              </div>
              <p className="mt-3 line-clamp-4 leading-6 text-ink/70">{item.content}</p>
            </article>
          ))}
          {!data.knowledge.length ? <p className="text-sm text-ink/65">No chatbot knowledge has been added yet.</p> : null}
        </div>
      </AdminPanel>
    </div>
  );
}

function ProviderOption({ value, label, detail, checked }: { value: string; label: string; detail: string; checked: boolean }) {
  return (
    <label className="flex items-start gap-3 rounded-md border border-black/10 bg-crema p-3 text-sm">
      <input name="provider" type="radio" value={value} defaultChecked={checked} className="mt-1" />
      <span>
        <span className="block font-semibold text-ink">{label}</span>
        <span className="block break-words text-ink/65">{detail}</span>
      </span>
    </label>
  );
}
