const axios = require("axios");

const PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
const GRAPH_API_VERSION = "v18.0";
const GRAPH_API_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

/**
 * Send a text message to a user
 * @param {string} recipientId - Facebook Page-Scoped ID
 * @param {object} message - Message object with text or attachment
 * @param {string} pageToken - Optional page access token
 */
exports.sendMessage = async (
  recipientId,
  message,
  pageToken = PAGE_ACCESS_TOKEN,
) => {
  try {
    const requestBody = {
      recipient: {
        id: recipientId,
      },
      message: message,
    };

    const response = await axios.post(
      `${GRAPH_API_URL}/me/messages`,
      requestBody,
      {
        params: { access_token: pageToken },
      },
    );

    console.log("✅ Message sent successfully:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "❌ Error sending message:",
      error.response?.data || error.message,
    );
    throw error;
  }
};

/**
 * Send typing indicator (on/off)
 * @param {string} recipientId - Facebook Page-Scoped ID
 * @param {boolean} isTyping - true to show typing, false to hide
 * @param {string} pageToken - Optional page access token
 */
exports.sendTypingIndicator = async (
  recipientId,
  isTyping = true,
  pageToken = PAGE_ACCESS_TOKEN,
) => {
  try {
    const senderAction = isTyping ? "typing_on" : "typing_off";

    const requestBody = {
      recipient: {
        id: recipientId,
      },
      sender_action: senderAction,
    };

    await axios.post(`${GRAPH_API_URL}/me/messages`, requestBody, {
      params: { access_token: pageToken },
    });

    console.log(`⌨️  Typing indicator ${isTyping ? "ON" : "OFF"}`);
  } catch (error) {
    console.error(
      "❌ Error sending typing indicator:",
      error.response?.data || error.message,
    );
  }
};

/**
 * Mark message as read
 * @param {string} recipientId - Facebook Page-Scoped ID
 * @param {string} pageToken - Optional page access token
 */
exports.markAsRead = async (recipientId, pageToken = PAGE_ACCESS_TOKEN) => {
  try {
    const requestBody = {
      recipient: {
        id: recipientId,
      },
      sender_action: "mark_seen",
    };

    await axios.post(`${GRAPH_API_URL}/me/messages`, requestBody, {
      params: { access_token: pageToken },
    });

    console.log("✅ Message marked as read");
  } catch (error) {
    console.error(
      "❌ Error marking message as read:",
      error.response?.data || error.message,
    );
  }
};

/**
 * Get user information from Facebook
 * @param {string} userId - Facebook Page-Scoped ID
 * @param {string} pageToken - Optional page access token
 * @returns {object} User profile data
 */
exports.getUserInfo = async (userId, pageToken = PAGE_ACCESS_TOKEN) => {
  try {
    const response = await axios.get(`${GRAPH_API_URL}/${userId}`, {
      params: {
        fields: "first_name,last_name,profile_pic",
        access_token: pageToken,
      },
    });

    const userData = response.data;
    return {
      name: `${userData.first_name} ${userData.last_name}`,
      firstName: userData.first_name,
      lastName: userData.last_name,
      profilePic: userData.profile_pic,
    };
  } catch (error) {
    console.error(
      "❌ Error getting user info:",
      error.response?.data || error.message,
    );
    return {
      name: "Unknown User",
      firstName: "Unknown",
      lastName: "User",
    };
  }
};

/**
 * Send a message with quick reply buttons
 * @param {string} recipientId - Facebook Page-Scoped ID
 * @param {string} text - Message text
 * @param {array} quickReplies - Array of quick reply objects
 * @param {string} pageToken - Optional page access token
 */
exports.sendQuickReply = async (
  recipientId,
  text,
  quickReplies,
  pageToken = PAGE_ACCESS_TOKEN,
) => {
  try {
    const message = {
      text: text,
      quick_replies: quickReplies.map((reply) => ({
        content_type: "text",
        title: reply.title,
        payload: reply.payload,
      })),
    };

    return await this.sendMessage(recipientId, message, pageToken);
  } catch (error) {
    console.error("❌ Error sending quick reply:", error);
    throw error;
  }
};

/**
 * Send a message with button template
 * @param {string} recipientId - Facebook Page-Scoped ID
 * @param {string} text - Message text
 * @param {array} buttons - Array of button objects
 * @param {string} pageToken - Optional page access token
 */
exports.sendButtonTemplate = async (
  recipientId,
  text,
  buttons,
  pageToken = PAGE_ACCESS_TOKEN,
) => {
  try {
    const message = {
      attachment: {
        type: "template",
        payload: {
          template_type: "button",
          text: text,
          buttons: buttons.map((button) => ({
            type: button.type || "postback",
            title: button.title,
            payload: button.payload,
            url: button.url,
          })),
        },
      },
    };

    return await this.sendMessage(recipientId, message, pageToken);
  } catch (error) {
    console.error("❌ Error sending button template:", error);
    throw error;
  }
};

/**
 * Send a generic template (carousel)
 * @param {string} recipientId - Facebook Page-Scoped ID
 * @param {array} elements - Array of card elements
 * @param {string} pageToken - Optional page access token
 */
exports.sendGenericTemplate = async (
  recipientId,
  elements,
  pageToken = PAGE_ACCESS_TOKEN,
) => {
  try {
    const message = {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: elements,
        },
      },
    };

    return await this.sendMessage(recipientId, message, pageToken);
  } catch (error) {
    console.error("❌ Error sending generic template:", error);
    throw error;
  }
};

/**
 * Send an image
 * @param {string} recipientId - Facebook Page-Scoped ID
 * @param {string} imageUrl - URL of the image
 * @param {string} pageToken - Optional page access token
 */
exports.sendImage = async (
  recipientId,
  imageUrl,
  pageToken = PAGE_ACCESS_TOKEN,
) => {
  try {
    const message = {
      attachment: {
        type: "image",
        payload: {
          url: imageUrl,
          is_reusable: true,
        },
      },
    };

    return await this.sendMessage(recipientId, message, pageToken);
  } catch (error) {
    console.error("❌ Error sending image:", error);
    throw error;
  }
};
