import { query, mutation } from "./_generated/server";

// मैसेज और फाइल URL मंगाने का कोड
export const getMessages = query({
  handler: async (ctx, args) => {
    const messages = await ctx.db.query("messages")
      .filter((q) => q.eq(q.field("roomId"), args.roomId))
      .collect();
      
    // अगर मैसेज में कोई फोटो/वीडियो है, तो उसका लिंक बनाना
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

// फाइल अपलोड करने के लिए सुरक्षित लिंक जनरेट करना
export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});

// नया मैसेज डेटाबेस में सेव करने का कोड (फाइल सपोर्ट के साथ)
export const sendMessage = mutation({
  handler: async (ctx, args) => {
    await ctx.db.insert("messages", {
      roomId: args.roomId,
      text: args.text,
      sender: args.sender,
      timestamp: Date.now(),
      storageId: args.storageId, // फाइल की आईडी (अगर है तो)
      fileType: args.fileType,   // 'image' या 'video'
    });
  },
});
