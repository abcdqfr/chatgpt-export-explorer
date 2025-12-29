import Dexie from 'dexie';
import { getAllExports } from './export-manager.js';

// Default security limit: maximum content length per message
// This can be overridden by passing limits to storeConversations
const DEFAULT_MAX_CONTENT_LENGTH = 50 * 1024 * 1024; // 50MB per message (configurable)

export class ChatDatabase extends Dexie {
  constructor(dbName = 'ChatGPTDatabase') {
    super(dbName);
    this.version(1).stores({
      conversations: '++id, title, create_time, update_time, conversation_id',
      messages: '++id, conversation_id, message_id, role, content, create_time, parent_id'
    });
  }
}

// Database cache - stores active database instances
const dbCache = new Map();

/**
 * Get or create a database instance for a specific export
 * @param {string} exportId - Export ID (null/undefined for default/legacy DB)
 * @returns {ChatDatabase} - Database instance
 */
export function getDatabase(exportId = null) {
  const dbName = exportId ? `ChatGPTDatabase_${exportId}` : 'ChatGPTDatabase';

  if (!dbCache.has(dbName)) {
    const db = new ChatDatabase(dbName);
    dbCache.set(dbName, db);
  }

  return dbCache.get(dbName);
}

/**
 * Delete a database for a specific export
 * @param {string} exportId - Export ID
 * @returns {Promise<void>}
 */
export async function deleteDatabase(exportId) {
  const dbName = `ChatGPTDatabase_${exportId}`;
  const db = dbCache.get(dbName);

  if (db) {
    await db.delete();
    dbCache.delete(dbName);
  } else {
    // Try to delete even if not in cache
    await Dexie.delete(dbName);
  }
}

/**
 * Get all database instances for all exports
 * @param {Array} exportIds - Array of export IDs
 * @returns {Array<ChatDatabase>} - Array of database instances
 */
export function getAllDatabases(exportIds) {
  return exportIds.map(exportId => getDatabase(exportId));
}

// Legacy default database for backward compatibility
const defaultDb = getDatabase(null);

export const dbOperations = {
  async clearAll(exportId = null) {
    const db = getDatabase(exportId);
    await db.conversations.clear();
    await db.messages.clear();
  },
  async storeConversations(conversations, _mergeMode = false, limits = {}, exportId = null) {
    const MAX_CONTENT_LENGTH = limits.MAX_CONTENT_LENGTH || DEFAULT_MAX_CONTENT_LENGTH;
    const conversationRecords = [];
    const messageRecords = [];
    const conversationMap = new Map();
    const messageMap = new Map();
    
    conversations.forEach(conv => {
      const convId = conv.id;
      const existingConv = conversationMap.get(convId);
      
      // Always deduplicate within batch - keep the one with the latest update_time
      if (existingConv) {
        if (conv.update_time > existingConv.update_time) {
          conversationMap.set(convId, {
            conversation_id: convId,
            title: conv.title,
            create_time: conv.create_time,
            update_time: conv.update_time
          });
        }
      } else {
        conversationMap.set(convId, {
          conversation_id: convId,
          title: conv.title,
          create_time: conv.create_time,
          update_time: conv.update_time
        });
      }
      
      if (conv.mapping) {
        Object.values(conv.mapping).forEach(node => {
          if (node.message && node.message.content && node.message.content.parts) {
            let content = node.message.content.parts.join('\n');
            
            // Validate and truncate if necessary
            if (content.length > MAX_CONTENT_LENGTH) {
              console.warn(
                `Message ${node.id} content too long (${content.length} bytes), truncating to ${MAX_CONTENT_LENGTH} bytes`
              );
              content = `${content.substring(0, MAX_CONTENT_LENGTH)}\n\n...[content truncated due to size limit]`;
            }
            
            if (content.trim()) {
              const msgKey = `${convId}:${node.id}`;
              const existingMsg = messageMap.get(msgKey);
              
              // Always deduplicate within batch - keep the one with the latest create_time
              if (existingMsg) {
                if ((node.message.create_time || 0) > (existingMsg.create_time || 0)) {
                  messageMap.set(msgKey, {
                    conversation_id: convId,
                    message_id: node.id,
                    role: node.message.author.role,
                    content,
                    create_time: node.message.create_time,
                    parent_id: node.parent
                  });
                }
              } else {
                messageMap.set(msgKey, {
                  conversation_id: convId,
                  message_id: node.id,
                  role: node.message.author.role,
                  content,
                  create_time: node.message.create_time,
                  parent_id: node.parent
                });
              }
            }
          }
        });
      }
    });
    
    conversationRecords.push(...conversationMap.values());
    messageRecords.push(...messageMap.values());
    
    // Use bulkPut for upsert behavior (updates if exists, adds if not)
    const db = getDatabase(exportId);
    await db.conversations.bulkPut(conversationRecords);
    await db.messages.bulkPut(messageRecords);
    
    return { 
      conversations: conversationRecords.length, 
      messages: messageRecords.length 
    };
  },
  async getConversations(exportId = null) {
    const db = getDatabase(exportId);
    return await db.conversations.orderBy('update_time').reverse().toArray();
  },
  async getAllConversationsFromExports(exportIds) {
    // Aggregate conversations from multiple exports
    console.log(`getAllConversationsFromExports called with exportIds:`, exportIds);
    if (!exportIds || exportIds.length === 0) {
      console.warn('No export IDs provided, returning empty array');
      return [];
    }
    const allConversations = [];
    for (const exportId of exportIds) {
      try {
        console.log(`Loading conversations from export: ${exportId}`);
        const conversations = await this.getConversations(exportId);
        console.log(`Found ${conversations.length} conversations in export ${exportId}`);
        // Add export metadata to each conversation
        const exportData = getAllExports().find(exp => exp.id === exportId);
        conversations.forEach(conv => {
          conv.exportId = exportId;
          if (exportData) {
            conv.exportFilename = exportData.filename;
          }
        });
        allConversations.push(...conversations);
      } catch (error) {
        console.error(`Error loading conversations from export ${exportId}:`, error);
      }
    }
    console.log(`Total conversations aggregated: ${allConversations.length}`);
    // Sort by update_time descending
    return allConversations.sort((a, b) => (b.update_time || 0) - (a.update_time || 0));
  },
  async getConversationMessages(conversationId, exportId = null) {
    try {
      // Fetch messages and sort by create_time
      // Note: Dexie doesn't have a direct sortBy on where queries, so we fetch and sort manually
      const db = getDatabase(exportId);
      const messages = await db.messages.where('conversation_id').equals(conversationId).toArray();

      // Sort by create_time (ascending - oldest first)
      return messages.sort((a, b) => {
        const timeA = a.create_time || 0;
        const timeB = b.create_time || 0;
        return timeA - timeB;
      });
    } catch (error) {
      console.error('Error fetching conversation messages:', error);
      throw error;
    }
  },
  async searchAllConversations(query, exportId = null) {
    if (!query.trim()) return [];
    const lowerQuery = query.toLowerCase();
    const db = getDatabase(exportId);
    const titleMatches = await db.conversations
      .filter(conv => conv.title.toLowerCase().includes(lowerQuery))
      .toArray();
    return titleMatches.sort((a, b) => (b.create_time || 0) - (a.create_time || 0));
  },
  async globalSearch(query, exportIds = []) {
    if (!query.trim()) return [];
    const lowerQuery = query.toLowerCase();
    const results = [];

    // Search across all specified exports (or default if none)
    const searchExports = exportIds.length > 0 ? exportIds : [null];

    for (const exportId of searchExports) {
      const db = getDatabase(exportId);
    const allConversations = await db.conversations.toArray();
    for (const conv of allConversations) {
      const result = {
        conversation: conv,
        titleMatch: conv.title.toLowerCase().includes(lowerQuery),
        messageMatches: []
      };
      const messages = await db.messages
        .where('conversation_id')
        .equals(conv.conversation_id)
        .filter(msg => msg.content.toLowerCase().includes(lowerQuery))
        .toArray();
      for (const message of messages) {
          const { content } = message;
        const lowerContent = content.toLowerCase();
        const index = lowerContent.indexOf(lowerQuery);
        if (index !== -1) {
          const contextStart = Math.max(0, index - 60);
          const contextEnd = Math.min(content.length, index + query.length + 60);
          let context = content.substring(contextStart, contextEnd);
            if (contextStart > 0) context = `...${context}`;
            if (contextEnd < content.length) context = `${context}...`;
          result.messageMatches.push({
            message_id: message.message_id,
            role: message.role,
              context,
            create_time: message.create_time,
            matchIndex: index
          });
        }
      }
      if (result.titleMatch || result.messageMatches.length > 0) {
          // Add export metadata
          result.conversation.exportId = exportId;
        results.push(result);
        }
      }
    }
    return results.sort((a, b) => {
      if (a.titleMatch && !b.titleMatch) return -1;
      if (!a.titleMatch && b.titleMatch) return 1;
      if (a.messageMatches.length !== b.messageMatches.length) {
        return b.messageMatches.length - a.messageMatches.length;
      }
      return (b.conversation.create_time || 0) - (a.conversation.create_time || 0);
    });
  },
  async searchInConversation(conversationId, query, exportId = null) {
    if (!query.trim()) return [];
    const lowerQuery = query.toLowerCase();
    const db = getDatabase(exportId);
    return await db.messages
      .where('conversation_id')
      .equals(conversationId)
      .filter(msg => msg.content.toLowerCase().includes(lowerQuery))
      .toArray();
  },
  async getStats(exportId = null) {
    const db = getDatabase(exportId);
    const conversationCount = await db.conversations.count();
    const messageCount = await db.messages.count();
    return { conversations: conversationCount, messages: messageCount };
  },
  async getAllStats(exportIds) {
    // Aggregate stats from multiple exports
    let totalConversations = 0;
    let totalMessages = 0;

    for (const exportId of exportIds) {
      const stats = await this.getStats(exportId);
      totalConversations += stats.conversations;
      totalMessages += stats.messages;
    }

    return { conversations: totalConversations, messages: totalMessages };
  }
};

// Export default for backward compatibility
export default defaultDb;
