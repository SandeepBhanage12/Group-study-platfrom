import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';

// Styled Components
const ChatContainer = styled.div`
  width: 100%;
  background-color: #ffffff;
  border-radius: 12px;
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
`;

const ChatHistory = styled.div`
  height: 400px;
  overflow-y: auto;
  border-radius: 8px;
  padding: 15px;
  background-color: #fdfdfd;
  margin-bottom: 2px;
  &::-webkit-scrollbar {
    width: 0;
    height: 0;
  }
`;

const Message = styled.div`
  margin-bottom: 3px;
  display: flex;
  justify-content: ${(props) => (props.role === 'user' ? 'flex-end' : 'flex-start')};
`;

const MessageText = styled.p`
  margin: 0;
  font-size: 1rem;
  line-height: 1.5;
  color: #444;
  word-wrap: break-word;
  max-width: 70%;
  padding: 10px;
  border-radius: 8px;
  background-color: ${(props) => (props.role === 'user' ? '#e1f5fe' : '#e8f5e9')};
`;

const InputBox = styled.input`
  width: 70%;
  padding: 12px;
  font-size: 1rem;
  margin-right: 10px;
  border: 1px solid #ddd;
  border-radius: 8px;
  outline: none;
  transition: border-color 0.3s ease-in-out;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

  &:focus {
    border-color: #007bff;
    box-shadow: 0 0 5px rgba(0, 123, 255, 0.3);
  }
`;

const SendButton = styled.button`
  width: 80px;
  padding: 12px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.3s ease-in-out, transform 0.2s ease-in-out;

  &:hover {
    background-color: #45a049;
    transform: scale(1.05);
  }

  &:active {
    background-color: #3e8e41;
    transform: scale(1);
  }
`;

const ClearButton = styled.button`
  width: 80px;
  padding: 12px;
  background-color: #f44336;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.3s ease-in-out, transform 0.2s ease-in-out;

  &:hover {
    background-color: #e53935;
    transform: scale(1.05);
  }

  &:active {
    background-color: #d32f2f;
    transform: scale(1);
  }
`;

const Gemini = () => {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const chatHistoryRef = useRef(null); // Reference to the chat history container

  // Initialize Google Generative AI
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
  console.log("api", apiKey)
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash-exp',
  });

  const generationConfig = {
    temperature: 1,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
    responseMimeType: 'text/plain',
  };

  // Load chat history from localStorage when the component mounts
  useEffect(() => {
    const savedMessages = JSON.parse(localStorage.getItem('chatHistory'));
    if (savedMessages) {
      setMessages(savedMessages);
    }
  }, []);

  // Save chat history to localStorage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('chatHistory', JSON.stringify(messages));
    }
    // Scroll to the last message when the chat history is updated
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [messages]);

  // Function to handle chat messages
  async function run() {
    if (!query.trim()) return;

    const userQuery = query;
    setQuery('');
    const newMessages = [...messages, { role: 'user', text: userQuery }];
    setMessages(newMessages);

    const chatSession = model.startChat({
      generationConfig,
      history: newMessages.map((msg) => ({
        role: msg.role,
        parts: [{ text: msg.text }],
      })),
    });

    try {
      const result = await chatSession.sendMessage(userQuery);
      const modelResponse = result.response.text().replace(/\*/g, '');

      // Update the chat history with the model's response
      setMessages((prevMessages) => [
        ...prevMessages,
        { role: 'model', text: modelResponse },
      ]);
    } catch (error) {
      console.error('Gemini API error:', error);

      let errorText =
        'Sorry, there was a problem contacting the AI service. Please try again in a moment.';

      if (error && typeof error.message === 'string') {
        if (error.message.includes('429') || error.message.toLowerCase().includes('quota')) {
          errorText =
            'The AI service quota has been exceeded for this API key. Please wait a bit and try again, or update your Gemini API plan/billing.';
        }
      }

      setMessages((prevMessages) => [
        ...prevMessages,
        { role: 'model', text: errorText },
      ]);
    }
  }

  function handleEnter(e) {
    if (e.key === 'Enter') {
      if (query.length) {
        run();
      }
    }
  }

  function clearChat() {
    setMessages([]);
    localStorage.removeItem('chatHistory');
  }

  return (
    <ChatContainer style={{ height: '100%', padding: '2rem 3px', boxSizing: 'border-box' }}>
      <div style={{ height: '100%' }}>
        <ChatHistory ref={chatHistoryRef} style={{ height: '91%' }}>
          {/* Chat History Display */}
          {messages.map((message, index) => (
            <Message key={index} role={message.role}>
              <MessageText role={message.role}>{message.text}</MessageText>
            </Message>
          ))}
        </ChatHistory>

        {/* Input and Send Button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 1rem' }}>
          <InputBox
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type your message..."
            onKeyUp={handleEnter}
          />
          <div style={{ display: 'flex', gap: '10px' }}>
            <SendButton onClick={run}>Send</SendButton>
            <ClearButton onClick={clearChat}>Clear</ClearButton>
          </div>
        </div>
      </div>
    </ChatContainer>
  );
};

export default Gemini;
