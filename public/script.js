const form = document.getElementById('chat-form');
const input = document.getElementById('user-input');
const chatBox = document.getElementById('chat-box');
const submitButton = document.getElementById('send-button') || form.querySelector('button[type="submit"]');

// Configure marked.js for formatted markdown rendering with line breaks
if (typeof marked !== 'undefined') {
  marked.setOptions({
    breaks: true,
    gfm: true,
  });
}

// Stores conversation history matching backend API expectations:
// [{ role: 'user', text: '...' }, { role: 'model', text: '...' }]
const conversation = [];

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const userMessage = input.value.trim();
  if (!userMessage) return;

  // 1. Render user message in UI and reset input field
  appendUserMessage(userMessage);
  input.value = '';

  // 2. Add message to conversation state
  conversation.push({ role: 'user', text: userMessage });

  // 3. Display animated loading dots indicator
  const botMessageElement = createLoadingBubble();

  // Temporarily disable input & submit button
  setInputEnabled(false);

  try {
    // 4. Send conversation history to backend endpoint
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ conversation }),
    });

    if (!response.ok) {
      throw new Error(`Server returned status: ${response.status}`);
    }

    const data = await response.json();

    // 5. Replace loading animation with formatted Markdown response
    if (data && data.result) {
      renderBotResponse(botMessageElement, data.result);
      conversation.push({ role: 'model', text: data.result });
    } else {
      botMessageElement.textContent = 'Sorry, no response received.';
      conversation.pop();
    }
  } catch (error) {
    console.error('Chat error:', error);
    botMessageElement.textContent = 'Failed to get response from server.';
    // Revert user message from history on error to preserve turn alternating
    conversation.pop();
  } finally {
    // Re-enable form controls and refocus input
    setInputEnabled(true);
    input.focus();
    chatBox.scrollTop = chatBox.scrollHeight;
  }
});

/**
 * Appends a user chat bubble (plain text for security).
 * @param {string} text
 * @returns {HTMLDivElement}
 */
function appendUserMessage(text) {
  const msg = document.createElement('div');
  msg.classList.add('message', 'user');
  msg.textContent = text;
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
  return msg;
}

/**
 * Creates and appends a bot bubble containing a 3-dot typing/loading animation.
 * @returns {HTMLDivElement}
 */
function createLoadingBubble() {
  const msg = document.createElement('div');
  msg.classList.add('message', 'bot');

  const indicator = document.createElement('div');
  indicator.classList.add('typing-indicator');
  indicator.innerHTML = `
    <span></span>
    <span></span>
    <span></span>
  `;

  msg.appendChild(indicator);
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
  return msg;
}

/**
 * Parses markdown and renders formatted HTML inside the bot bubble.
 * @param {HTMLDivElement} element
 * @param {string} markdownText
 */
function renderBotResponse(element, markdownText) {
  if (typeof marked !== 'undefined' && marked.parse) {
    element.innerHTML = marked.parse(markdownText);
  } else {
    element.textContent = markdownText;
  }
  chatBox.scrollTop = chatBox.scrollHeight;
}

/**
 * Controls active/disabled states for inputs.
 * @param {boolean} enabled
 */
function setInputEnabled(enabled) {
  input.disabled = !enabled;
  if (submitButton) {
    submitButton.disabled = !enabled;
  }
}
