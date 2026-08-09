import { query, mutation } from "./_generated/server";

export const getMessages = query({
  handler: async (ctx, args) => {
    return await ctx.db.query("messages")
      .filter((q) => q.eq(q.field("roomId"), args.roomId))
      .collect();
  },
});

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
