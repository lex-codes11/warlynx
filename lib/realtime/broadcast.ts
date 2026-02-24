/**
 * Server-side utilities for broadcasting real-time events
 * 
 * This module provides functions for broadcasting game events to all connected clients.
 * It uses Supabase Realtime's broadcast feature to send events to specific game rooms.
 */

import { createClient } from '@supabase/supabase-js';
import type { RealtimeGameEvent } from './supabase';

/**
 * Create a server-side Supabase client for broadcasting
 * Uses service role key for server-side operations
 */
function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Supabase configuration missing. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.'
    );
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Broadcast a game update event
 * 
 * @param gameId - Game ID to broadcast to
 * @param data - Game data to broadcast
 */
export async function broadcastGameUpdate(gameId: string, data: any): Promise<void> {
  const client = createServerClient();
  const channel = client.channel(`game:${gameId}`);

  await channel.send({
    type: 'broadcast',
    event: 'game:updated',
    payload: data,
  });

  await channel.unsubscribe();
}

/**
 * Broadcast a player joined event
 * 
 * @param gameId - Game ID to broadcast to
 * @param player - Player data
 */
export async function broadcastPlayerJoined(gameId: string, player: any): Promise<void> {
  const client = createServerClient();
  const channel = client.channel(`game:${gameId}`);

  await channel.send({
    type: 'broadcast',
    event: 'player:joined',
    payload: player,
  });

  await channel.unsubscribe();
}

/**
 * Broadcast a player left event
 * 
 * @param gameId - Game ID to broadcast to
 * @param playerId - Player ID who left
 */
export async function broadcastPlayerLeft(gameId: string, playerId: string): Promise<void> {
  const client = createServerClient();
  const channel = client.channel(`game:${gameId}`);

  await channel.send({
    type: 'broadcast',
    event: 'player:left',
    payload: playerId,
  });

  await channel.unsubscribe();
}

/**
 * Broadcast a turn started event
 * 
 * @param gameId - Game ID to broadcast to
 * @param turn - Turn data
 */
export async function broadcastTurnStarted(gameId: string, turn: any): Promise<void> {
  const client = createServerClient();
  const channel = client.channel(`game:${gameId}`);

  await channel.send({
    type: 'broadcast',
    event: 'turn:started',
    payload: turn,
  });

  await channel.unsubscribe();
}

/**
 * Broadcast a turn resolved event
 * 
 * @param gameId - Game ID to broadcast to
 * @param response - Turn resolution response
 */
export async function broadcastTurnResolved(gameId: string, response: any): Promise<void> {
  const client = createServerClient();
  const channel = client.channel(`game:${gameId}`);

  await channel.send({
    type: 'broadcast',
    event: 'turn:resolved',
    payload: response,
  });

  await channel.unsubscribe();
}

/**
 * Broadcast a character updated event
 * 
 * @param gameId - Game ID to broadcast to
 * @param character - Character data
 */
export async function broadcastCharacterUpdate(gameId: string, character: any): Promise<void> {
  const client = createServerClient();
  const channel = client.channel(`game:${gameId}`);

  await channel.send({
    type: 'broadcast',
    event: 'character:updated',
    payload: character,
  });

  await channel.unsubscribe();
}

/**
 * Broadcast a stats updated event
 * 
 * @param gameId - Game ID to broadcast to
 * @param update - Stats update data
 */
export async function broadcastStatsUpdate(gameId: string, update: any): Promise<void> {
  const client = createServerClient();
  const channel = client.channel(`game:${gameId}`);

  await channel.send({
    type: 'broadcast',
    event: 'stats:updated',
    payload: update,
  });

  await channel.unsubscribe();
}

/**
 * Generic broadcast function for any event type
 * 
 * @param gameId - Game ID to broadcast to
 * @param event - Event type
 * @param payload - Event payload
 */
export async function broadcastEvent(
  gameId: string,
  event: RealtimeGameEvent['type'],
  payload: any
): Promise<void> {
  const client = createServerClient();
  const channel = client.channel(`game:${gameId}`);

  await channel.send({
    type: 'broadcast',
    event,
    payload,
  });

  await channel.unsubscribe();
}
