/**
 * Connection Status Component
 * 
 * Displays the current real-time connection status and provides
 * reconnection controls when needed.
 */

'use client';

import { ConnectionState } from '@/lib/realtime/supabase';

interface ConnectionStatusProps {
  connectionState: ConnectionState;
  onReconnect?: () => void;
  className?: string;
}

export function ConnectionStatus({
  connectionState,
  onReconnect,
  className = '',
}: ConnectionStatusProps) {
  const getStatusColor = () => {
    switch (connectionState) {
      case 'connected':
        return 'bg-green-500';
      case 'connecting':
        return 'bg-yellow-500';
      case 'disconnected':
        return 'bg-gray-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (connectionState) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'disconnected':
        return 'Disconnected';
      case 'error':
        return 'Connection Error';
      default:
        return 'Unknown';
    }
  };

  const showReconnect = connectionState === 'disconnected' || connectionState === 'error';

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
        <span className="text-sm text-gray-700">{getStatusText()}</span>
      </div>
      
      {showReconnect && onReconnect && (
        <button
          onClick={onReconnect}
          className="text-sm text-blue-600 hover:text-blue-800 underline"
        >
          Reconnect
        </button>
      )}
    </div>
  );
}
