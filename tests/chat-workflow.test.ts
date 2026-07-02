import { describe, expect, it } from "vitest";
import { runChatWorkflow } from "@/lib/chat-workflow";

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
