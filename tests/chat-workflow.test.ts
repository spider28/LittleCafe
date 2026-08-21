import { describe, expect, it } from "vitest";
import { resolveRelativeDate, runChatWorkflow } from "@/lib/chat-workflow";

describe("chat workflow", () => {
  it("collects party details across turns", async () => {
    const first = await runChatWorkflow({
      message: "I want to have a party around 20 persons, Saturday or Sunday afternoon, $500 budget, beverages for kids, snacks.",
      snapshot: {}
    });

    expect(first.route).toBe("party");
    expect(first.state.party?.partySize).toBe(20);
    expect(first.state.party?.budget).toBe(500);
    expect(first.reply).toContain("contact name");

    const second = await runChatWorkflow({
      message: "contact name: Mike Wang. Contact phone: 352-870-7573",
      snapshot: first.state
    });

    expect(second.state.party?.contactName).toBe("Mike Wang");
    expect(second.state.party?.contactPhone).toBe("352-870-7573");
    expect(second.reply).toContain("please confirm");
  });

  it("handles confirmation after required party details are present", async () => {
    const result = await runChatWorkflow({
      message: "I confirm.",
      snapshot: {
        party: {
          active: true,
          partySize: 20,
          dayPreference: "Saturday or Sunday",
          timePreference: "afternoon",
          budget: 500,
          beveragesForKids: true,
          snacks: true,
          contactName: "Mike Wang",
          contactPhone: "352-870-7573"
        }
      }
    });

    expect(result.state.party?.confirmed).toBe(true);
    expect(result.reply).toContain("confirmed");
  });

  it("clears party state with compact startover wording", async () => {
    const result = await runChatWorkflow({
      message: "I want to startover, forget my previous information.",
      snapshot: {
        party: {
          active: true,
          confirmed: true,
          partySize: 20,
          dayPreference: "Saturday or Sunday",
          timePreference: "afternoon",
          budget: 500,
          beveragesForKids: true,
          snacks: true,
          contactName: "Mike Wang",
          contactPhone: "352-870-7573"
        }
      }
    });

    expect(result.state.party).toBeUndefined();
    expect(result.reply).toContain("cleared");
  });

  it("reopens confirmed party details when the guest count changes", async () => {
    const result = await runChatWorkflow({
      message: "I want to change the guest number from 20 to 15",
      snapshot: {
        party: {
          active: true,
          confirmed: true,
          partySize: 20,
          dayPreference: "Saturday or Sunday",
          timePreference: "afternoon",
          budget: 500,
          beveragesForKids: true,
          snacks: true,
          contactName: "Mike Wang",
          contactPhone: "352-870-7573"
        }
      }
    });

    expect(result.state.party?.partySize).toBe(15);
    expect(result.state.party?.confirmed).toBe(false);
    expect(result.reply).toContain("15 guests");
    expect(result.reply).toContain("please confirm");
  });

  it("lets confirmed party threads answer unrelated FAQ questions", async () => {
    const result = await runChatWorkflow({
      message: "Tell me the services you have in this store.",
      snapshot: {
        party: {
          active: true,
          confirmed: true,
          partySize: 20,
          dayPreference: "Saturday or Sunday",
          timePreference: "afternoon",
          budget: 500,
          beveragesForKids: true,
          snacks: true,
          contactName: "Mike Wang",
          contactPhone: "352-870-7573"
        }
      }
    });

    expect(result.route).toBe("faq");
    expect(result.reply).toBeUndefined();
  });
});

describe("party detail parsing", () => {
  it("keeps a clock time whole instead of splitting it", async () => {
    // "3:00pm" used to store "00pm": the old pattern had no optional minutes, so \b anchored
    // against the colon and matched only the tail.
    const result = await runChatWorkflow({
      message: "book an appointment for me at tomorrow 3:00pm",
      snapshot: {}
    });

    expect(result.state.party?.timePreference).toBe("3:00pm");
    expect(result.state.party?.timePreference).not.toContain("00pm ");
  });

  it("still reads bare times and named parts of the day", async () => {
    const named = await runChatWorkflow({ message: "a party on Saturday afternoon", snapshot: {} });
    expect(named.state.party?.timePreference).toBe("afternoon");

    const bare = await runChatWorkflow({ message: "book a party at 4 pm", snapshot: {} });
    expect(bare.state.party?.timePreference).toBe("4 pm");
  });

  it("resolves relative dates that used to be dropped", () => {
    const now = new Date(2026, 7, 20); // Thursday 2026-08-20, local time

    expect(resolveRelativeDate("book an appointment tomorrow 3:00pm", now)).toBe("2026-08-21");
    expect(resolveRelativeDate("can we do today?", now)).toBe("2026-08-20");
    expect(resolveRelativeDate("the day after tomorrow works", now)).toBe("2026-08-22");
    expect(resolveRelativeDate("how about next Monday", now)).toBe("2026-08-24");
    // A bare weekday stays a preference for staff to confirm, not a booked date.
    expect(resolveRelativeDate("Saturday or Sunday", now)).toBeNull();
  });

  it("advances a full week when next <weekday> names today", () => {
    const thursday = new Date(2026, 7, 20);
    expect(resolveRelativeDate("next Thursday", thursday)).toBe("2026-08-27");
  });
});

describe("party lane routing", () => {
  const planInProgress = {
    party: { active: true, partySize: 20, budget: 500, dayPreference: "Saturday or Sunday" }
  };

  it("lets an unrelated question escape an unconfirmed plan", async () => {
    // This previously returned a party summary, because an active plan absorbed every message.
    const result = await runChatWorkflow({
      message: "What are your hours this weekend?",
      snapshot: { party: { active: true, partySize: 20, budget: 500 } }
    });

    expect(result.route).toBe("faq");
    expect(result.reply).toBeUndefined();
  });

  it("keeps messages that carry a party detail in the party lane", async () => {
    for (const message of ["make it 25 guests", "Sunday works better", "contact name: Mike Wang", "yes that looks good"]) {
      const result = await runChatWorkflow({ message, snapshot: planInProgress });
      expect(result.route, message).toBe("party");
    }
  });

  it("starts a fresh plan when the guest asks for another booking", async () => {
    const result = await runChatWorkflow({
      message: "I want to book another party for 8 people",
      snapshot: planInProgress
    });

    expect(result.route).toBe("party");
    expect(result.state.party?.partySize).toBe(8);
    // The previous plan's details must not leak into the new one.
    expect(result.state.party?.budget).toBeUndefined();
    expect(result.state.party?.dayPreference).toBeUndefined();
  });
});
