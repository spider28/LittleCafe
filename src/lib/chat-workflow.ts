import { Annotation, END, START, StateGraph } from "@langchain/langgraph";

export type PartyPlanningState = {
  active?: boolean;
  partySize?: number;
  dayPreference?: string;
  timePreference?: string;
  budget?: number;
  beveragesForKids?: boolean;
  snacks?: boolean;
  exactDate?: string;
  contactName?: string;
  contactPhone?: string;
  confirmed?: boolean;
};

export type WorkflowStateSnapshot = {
  party?: PartyPlanningState;
};

export type ChatWorkflowResult = {
  route: "party" | "faq";
  reply?: string;
  state: WorkflowStateSnapshot;
};

const ChatWorkflowAnnotation = Annotation.Root({
  userMessage: Annotation<string>,
  snapshot: Annotation<WorkflowStateSnapshot>({
    reducer: (_current, update) => update,
    default: () => ({})
  }),
  route: Annotation<"party" | "faq">({
    reducer: (_current, update) => update,
    default: () => "faq"
  }),
  reply: Annotation<string | undefined>({
    reducer: (_current, update) => update,
    default: () => undefined
  })
});

type ChatWorkflowState = typeof ChatWorkflowAnnotation.State;

function isResetMessage(message: string) {
  return /\b(cancel|reset|start\s*over|restart|clear|forget|never mind|nevermind)\b/i.test(message);
}

function isConfirmationMessage(message: string) {
  return /\b(confirm|confirmed|yes|correct|looks good|that's right|that is right|sounds good|go ahead)\b/i.test(message);
}

function isPartyMessage(message: string, snapshot: WorkflowStateSnapshot) {
  if (snapshot.party?.active) {
    if (snapshot.party.confirmed) {
      return /\b(party|event|private event|birthday|group|reservation|reserve|book|booking|appointment|change|update|edit|guest|guests|people|persons|kids|children|budget|date|day|time|snack|snacks|beverage|beverages|drink|drinks|phone|contact)\b/i.test(
        message
      );
    }

    return true;
  }

  return /\b(party|event|private event|birthday|group|reservation|reserve|book|booking|appointment)\b/i.test(message);
}

function extractPartyDetails(message: string, existing: PartyPlanningState = {}): PartyPlanningState {
  const next: PartyPlanningState = { ...existing, active: true };
  const previous = { ...next };
  const lower = message.toLowerCase();
  const partySizeMatch = lower.match(/\b(?:around|about|for)?\s*(\d{1,2})\s*(?:people|persons|guests|kids|children|ppl)\b/);
  const partySizeChangeMatch = lower.match(/\b(?:guest|guests|people|persons|party size|group size|number)\b.*?\b(?:to|from\s+\d{1,2}\s+to)\s*(\d{1,2})\b/);
  const budgetMatch = lower.match(/\$\s*(\d{2,5})\b|\b(\d{2,5})\s*(?:dollar|dollars|usd)\b/);
  const exactDateMatch = lower.match(/\b(?:\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|\d{4}-\d{2}-\d{2})\b/);
  const contactNameMatch = message.match(/\b(?:contact\s+name|name)\s*(?:is|:)?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})/i);
  const contactPhoneMatch = message.match(/\b(?:contact\s+phone|phone|tel|telephone)\s*(?:is|:)?\s*([+()\-.\s\d]{7,24})/i);
  const loosePhoneMatch = message.match(/\b(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}\b/);

  if (partySizeChangeMatch?.[1] || partySizeMatch?.[1]) {
    next.partySize = Number(partySizeChangeMatch?.[1] ?? partySizeMatch?.[1]);
  }
  if (budgetMatch?.[1] || budgetMatch?.[2]) {
    next.budget = Number(budgetMatch[1] ?? budgetMatch[2]);
  }
  if (exactDateMatch?.[0]) {
    next.exactDate = exactDateMatch[0];
  }
  if (contactNameMatch?.[1]) {
    next.contactName = contactNameMatch[1].trim();
  }
  if (contactPhoneMatch?.[1] || loosePhoneMatch?.[0]) {
    next.contactPhone = (contactPhoneMatch?.[1] ?? loosePhoneMatch?.[0] ?? "").trim();
  }
  if (isConfirmationMessage(message) && !missingPartyFields(next).length) {
    next.confirmed = true;
  }
  if (/\b(saturday|sunday|weekend|weekday|friday|monday|tuesday|wednesday|thursday)\b/i.test(message)) {
    next.dayPreference = message.match(/\b(saturday|sunday|weekend|weekday|friday|monday|tuesday|wednesday|thursday)\b/gi)?.join(" or ");
  }
  if (/\b(morning|afternoon|evening|noon|lunch|dinner|\d{1,2}\s*(?:am|pm))\b/i.test(message)) {
    next.timePreference = message.match(/\b(morning|afternoon|evening|noon|lunch|dinner|\d{1,2}\s*(?:am|pm))\b/gi)?.join(" or ");
  }
  if (/\b(beverage|beverages|drink|drinks|juice|milk|latte|tea|coffee)\b/i.test(message) && /\b(kid|kids|child|children)\b/i.test(message)) {
    next.beveragesForKids = true;
  }
  if (/\b(snack|snacks|pastry|pastries|cookie|cookies|sandwich|sandwiches)\b/i.test(message)) {
    next.snacks = true;
  }
  if (/\b(no snacks|without snacks)\b/i.test(lower)) {
    next.snacks = false;
  }

  const changedDetails =
    next.partySize !== previous.partySize ||
    next.dayPreference !== previous.dayPreference ||
    next.timePreference !== previous.timePreference ||
    next.budget !== previous.budget ||
    next.beveragesForKids !== previous.beveragesForKids ||
    next.snacks !== previous.snacks ||
    next.exactDate !== previous.exactDate ||
    next.contactName !== previous.contactName ||
    next.contactPhone !== previous.contactPhone;

  if (changedDetails && !isConfirmationMessage(message)) {
    next.confirmed = false;
  }

  return next;
}

function missingPartyFields(party: PartyPlanningState) {
  const missing: string[] = [];
  if (!party.partySize) missing.push("party size");
  if (!party.exactDate && !party.dayPreference) missing.push("preferred date or day");
  if (!party.timePreference) missing.push("preferred time");
  if (!party.budget) missing.push("budget");
  if (party.beveragesForKids === undefined) missing.push("whether kids need beverages");
  if (party.snacks === undefined) missing.push("snack preferences");
  if (!party.contactName) missing.push("contact name");
  if (!party.contactPhone) missing.push("contact phone");
  return missing;
}

function summarizeParty(party: PartyPlanningState) {
  return [
    party.partySize ? `${party.partySize} guests` : undefined,
    party.exactDate ? `date ${party.exactDate}` : party.dayPreference ? `day preference ${party.dayPreference}` : undefined,
    party.timePreference ? `time ${party.timePreference}` : undefined,
    party.budget ? `$${party.budget} budget` : undefined,
    party.beveragesForKids ? "beverages for kids" : undefined,
    party.snacks === true ? "snacks" : party.snacks === false ? "no snacks" : undefined,
    party.contactName ? `contact ${party.contactName}` : undefined,
    party.contactPhone ? `phone ${party.contactPhone}` : undefined
  ]
    .filter(Boolean)
    .join(", ");
}

function classifyNode(state: ChatWorkflowState) {
  if (isResetMessage(state.userMessage)) {
    return {
      route: "party" as const,
      snapshot: {},
      reply: "No problem. I cleared the party planning details. What would you like to plan next?"
    };
  }

  return {
    route: isPartyMessage(state.userMessage, state.snapshot) ? ("party" as const) : ("faq" as const)
  };
}

function updatePartyNode(state: ChatWorkflowState) {
  if (state.reply) {
    return {};
  }

  return {
    snapshot: {
      ...state.snapshot,
      party: extractPartyDetails(state.userMessage, state.snapshot.party)
    }
  };
}

function partyReplyNode(state: ChatWorkflowState) {
  if (state.reply) {
    return {};
  }

  const party = state.snapshot.party ?? { active: true };
  const missing = missingPartyFields(party);
  const known = summarizeParty(party);

  if (!missing.length) {
    if (party.confirmed) {
      return {
        reply: `Thanks, the party request is confirmed on my side: ${known}. The next version can send this directly to the cafe team; for now, please contact staff by phone or the Contact page so they can finalize availability.`
      };
    }

    return {
      reply: `Great, I have the party details: ${known}. I can share this with the cafe team next; please confirm that everything looks correct.`
    };
  }

  const nextQuestions = missing.slice(0, 2);
  return {
    reply: [
      known ? `I have this so far: ${known}.` : "I can help plan that party.",
      `Could you share ${nextQuestions.join(" and ")}?`
    ].join(" ")
  };
}

function routeAfterClassify(state: ChatWorkflowState) {
  return state.route === "party" ? "updateParty" : END;
}

const chatWorkflow = new StateGraph(ChatWorkflowAnnotation)
  .addNode("classify", classifyNode)
  .addNode("updateParty", updatePartyNode)
  .addNode("partyReply", partyReplyNode)
  .addEdge(START, "classify")
  .addConditionalEdges("classify", routeAfterClassify)
  .addEdge("updateParty", "partyReply")
  .addEdge("partyReply", END)
  .compile();

export async function runChatWorkflow(input: { message: string; snapshot: WorkflowStateSnapshot }): Promise<ChatWorkflowResult> {
  const result = await chatWorkflow.invoke({
    userMessage: input.message,
    snapshot: input.snapshot
  });

  return {
    route: result.route,
    reply: result.reply,
    state: result.snapshot
  };
}
