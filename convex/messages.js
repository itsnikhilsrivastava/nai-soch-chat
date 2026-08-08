// convex/messages.js
import { query, mutation } from "./_generated/server";

// डेटाबेस से पुराने और नए मैसेज पढ़ने का कोड (Real-time)
export const getMessages = query({
  handler: async (ctx, args) => {
    // यहाँ हम चेक करेंगे कि मैसेज उसी रूम के हों जिसका लिंक गेस्ट ने खोला है
    return await ctx.db.query("messages")
      .filter((q) => q.eq(q.field("roomId"), args.roomId))
      .collect();
  },
});

// नया मैसेज डेटाबेस में सेव करने का कोड
export const sendMessage = mutation({
  handler: async (ctx, args) => {
    await ctx.db.insert("messages", {
      roomId: args.roomId,
      text: args.text,
      sender: args.sender,
      timestamp: Date.now(),
    });
  },
});
