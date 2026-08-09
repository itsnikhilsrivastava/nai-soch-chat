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
      isRead: false,
      limit: args.limit // नया: रूम की लिमिट सेट करने के लिए
    });
  }
});

export const markMessagesRead = mutation({
  handler: async (ctx, args) => {
    const unreadMessages = await ctx.db.query("messages")
      .filter(q => q.and(
         q.eq(q.field("roomId"), args.roomId),
         q.neq(q.field("sender"), args.user),
         q.neq(q.field("isRead"), true)
      ))
      .collect();

    for (const msg of unreadMessages) {
      await ctx.db.patch(msg._id, { isRead: true });
    }
  }
});

// अपडेटेड: अब यह रूम की लिमिट और जुड़ चुके लोगों की गिनती भी बताएगा
export const checkRoomExists = query({
  handler: async (ctx, args) => {
    const messages = await ctx.db.query("messages")
      .filter(q => q.eq(q.field("roomId"), args.roomId))
      .collect();
      
    if (messages.length === 0) return { exists: false };

    // रूम की लिमिट ढूँढना (जो एडमिन ने सेट की थी)
    const sysMsg = messages.find(m => m.sender === "System" && m.limit !== undefined);
    const limit = sysMsg ? sysMsg.limit : 0;

    // इस रूम में अब तक कितने लोग जुड़ चुके हैं, उनकी लिस्ट बनाना
    const presence = await ctx.db.query("presence")
      .filter(q => q.eq(q.field("roomId"), args.roomId))
      .collect();
      
    const uniqueUsers = Array.from(new Set(presence.map(p => p.user)));

    return { exists: true, limit: limit, joinedUsers: uniqueUsers };
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
