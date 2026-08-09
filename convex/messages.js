import { query, mutation } from "./_generated/server";

export const getMessages = query({
  handler: async (ctx, args) => {
    const messages = await ctx.db.query("messages")
      .filter((q) => q.eq(q.field("roomId"), args.roomId))
      .collect();
    return Promise.all(
      messages.map(async (msg) => {
        let fileUrl = null;
        if (msg.storageId) {
          fileUrl = await ctx.storage.getUrl(msg.storageId);
        }
        return { ...msg, fileUrl };
      })
    );
  },
});

export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});

export const sendMessage = mutation({
  handler: async (ctx, args) => {
    await ctx.db.insert("messages", {
      roomId: args.roomId,
      text: args.text,
      sender: args.sender,
      timestamp: Date.now(),
      storageId: args.storageId,
      fileType: args.fileType,
    });
  }
});

// सिक्योरिटी चेक: रूम मौजूद है या नहीं
export const checkRoomExists = query({
  handler: async (ctx, args) => {
    const msg = await ctx.db.query("messages")
      .filter(q => q.eq(q.field("roomId"), args.roomId))
      .first();
    return msg !== null; // अगर कम से कम एक मैसेज है, तो रूम असली है
  }
});

export const getActiveRooms = query({
  handler: async (ctx) => {
    const messages = await ctx.db.query("messages").order("desc").collect();
    const rooms = {};
    for (const msg of messages) {
      if (!rooms[msg.roomId]) {
        rooms[msg.roomId] = {
          roomId: msg.roomId,
          lastMessage: msg.text || (msg.fileType ? '📷 मीडिया फाइल' : 'नया मैसेज'),
          timestamp: msg.timestamp
        };
      }
    }
    return Object.values(rooms).sort((a, b) => b.timestamp - a.timestamp);
  }
});

export const deleteRoom = mutation({
  handler: async (ctx, args) => {
    const messages = await ctx.db.query("messages")
      .filter((q) => q.eq(q.field("roomId"), args.roomId))
      .collect();
    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }
  }
});

export const updatePresence = mutation({
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("presence")
      .filter(q => q.and(
        q.eq(q.field("roomId"), args.roomId),
        q.eq(q.field("user"), args.user)
      )).first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        updatedAt: Date.now(),
        isTyping: args.isTyping !== undefined ? args.isTyping : existing.isTyping,
        isOnline: args.isOnline !== undefined ? args.isOnline : existing.isOnline
      });
    } else {
      await ctx.db.insert("presence", {
        roomId: args.roomId,
        user: args.user,
        updatedAt: Date.now(),
        isTyping: args.isTyping || false,
        isOnline: args.isOnline !== undefined ? args.isOnline : true
      });
    }
  }
});

export const getPresence = query({
  handler: async (ctx, args) => {
    const cutoff = Date.now() - 20000; 
    return await ctx.db.query("presence")
      .filter(q => q.and(
         q.eq(q.field("roomId"), args.roomId),
         q.eq(q.field("isOnline"), true),
         q.gte(q.field("updatedAt"), cutoff)
      ))
      .collect();
  }
});
