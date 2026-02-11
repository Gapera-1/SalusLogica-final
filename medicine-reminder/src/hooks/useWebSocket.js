import { useState, useEffect, useRef, useCallback } from 'react';

const useWebSocket = (url, options = {}) => {
  const [socket, setSocket] = useState(null);
  const [lastMessage, setLastMessage] = useState(null);
  const [readyState, setReadyState] = useState(null);
  const [error, setError] = useState(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = options.maxReconnectAttempts || 5;
  const reconnectInterval = options.reconnectInterval || 3000;

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(url);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        setReadyState('OPEN');
        setError(null);
        reconnectAttempts.current = 0;
        
        // Send authentication if token is available
        const token = localStorage.getItem('access_token');
        if (token) {
          ws.send(JSON.stringify({
            type: 'auth',
            token: token
          }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
          
          // Handle different message types
          if (data.type === 'alarm_triggered') {
            console.log('🔔 Alarm received:', data.payload);
          } else if (data.type === 'alarm_dismissed') {
            console.log('✅ Alarm dismissed:', data.payload);
          } else if (data.type === 'alarm_taken') {
            console.log('💊 Alarm taken:', data.payload);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
          setLastMessage({ error: 'Failed to parse message', raw: event.data });
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setReadyState('CLOSED');
        
        // Attempt to reconnect if not a normal closure
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          console.log(`Attempting to reconnect (${reconnectAttempts.current}/${maxReconnectAttempts})...`);
          setTimeout(connect, reconnectInterval);
        }
      };

      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError('WebSocket connection error');
        setReadyState('ERROR');
      };

      setSocket(ws);
      setReadyState('CONNECTING');

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setError(error.message);
    }
  }, [url, maxReconnectAttempts, reconnectInterval]);

  const disconnect = useCallback(() => {
    if (socket) {
      socket.close(1000, 'Client disconnect');
      setSocket(null);
      setReadyState('CLOSED');
    }
  }, [socket]);

  const sendMessage = useCallback((message) => {
    if (socket && readyState === 'OPEN') {
      try {
        const messageString = typeof message === 'string' ? message : JSON.stringify(message);
        socket.send(messageString);
        return true;
      } catch (error) {
        console.error('Failed to send WebSocket message:', error);
        setError('Failed to send message');
        return false;
      }
    } else {
      console.warn('WebSocket is not connected');
      return false;
    }
  }, [socket, readyState]);

  // Auto-connect when component mounts
  useEffect(() => {
    if (url) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [url, connect, disconnect]);

  return {
    socket,
    lastMessage,
    readyState,
    error,
    connect,
    disconnect,
    sendMessage,
    isConnected: readyState === 'OPEN'
  };
};

export default useWebSocket;
