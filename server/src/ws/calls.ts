import { getRedis } from "../lib/redis.js";

const callSessions = new Map<string, { callerId: string; calleeId: string }>();

export async function handleCallOffer(
  payload: { targetUserId: string; conversationId: string; sdp: unknown },
  userId: string,
) {
  const sessionId = `${payload.conversationId}:${Date.now()}`;
  callSessions.set(sessionId, { callerId: userId, calleeId: payload.targetUserId });

  const redis = getRedis();
  const event = {
    type: "call:offer",
    sessionId,
    callerId: userId,
    conversationId: payload.conversationId,
    sdp: payload.sdp,
  };

  if (redis) {
    redis.publish(`chat:user:${payload.targetUserId}`, JSON.stringify(event));
  }

  return event;
}

export async function handleCallAnswer(payload: { sessionId: string; sdp: unknown }, userId: string) {
  const session = callSessions.get(payload.sessionId);
  if (!session || session.calleeId !== userId) return null;

  const redis = getRedis();
  const event = {
    type: "call:answer",
    sessionId: payload.sessionId,
    sdp: payload.sdp,
  };

  if (redis) {
    redis.publish(`chat:user:${session.callerId}`, JSON.stringify(event));
  }

  return event;
}

export async function handleCallIceCandidate(payload: { sessionId: string; candidate: unknown }, userId: string) {
  const session = callSessions.get(payload.sessionId);
  if (!session) return null;

  const targetId = session.callerId === userId ? session.calleeId : session.callerId;
  const redis = getRedis();
  const event = {
    type: "call:ice-candidate",
    sessionId: payload.sessionId,
    candidate: payload.candidate,
  };

  if (redis) {
    redis.publish(`chat:user:${targetId}`, JSON.stringify(event));
  }

  return event;
}

export async function handleCallEnd(payload: { sessionId: string }, userId: string) {
  const session = callSessions.get(payload.sessionId);
  if (!session) return null;

  callSessions.delete(payload.sessionId);

  return {
    type: "call:ended",
    sessionId: payload.sessionId,
    userId,
  };
}
