import { getRedis } from "../lib/redis.js"
import { createContextLogger } from "../lib/logger.js"

const voiceLogger = createContextLogger("ws:voice")

const voiceRooms = new Map<string, Set<string>>()

function getRoomParticipants(channelId: string): string[] {
  return Array.from(voiceRooms.get(channelId) ?? [])
}

export async function handleVoiceJoin(payload: { channelId: string }, userId: string) {
  const { channelId } = payload
  if (!voiceRooms.has(channelId)) {
    voiceRooms.set(channelId, new Set())
  }
  voiceRooms.get(channelId)!.add(userId)

  const participants = getRoomParticipants(channelId).filter((id) => id !== userId)

  voiceLogger.info({ userId, channelId, participantCount: participants.length + 1 }, "User joined voice channel")

  const redis = getRedis()
  const joinEvent = {
    type: "voice:user-joined",
    channelId,
    userId,
    participants: getRoomParticipants(channelId),
  }

  if (redis) {
    for (const pid of participants) {
      redis.publish(`chat:user:${pid}`, JSON.stringify(joinEvent))
    }
  }

  return {
    type: "voice:joined",
    channelId,
    participants: getRoomParticipants(channelId),
  }
}

export async function handleVoiceLeave(payload: { channelId: string }, userId: string) {
  const { channelId } = payload
  voiceRooms.get(channelId)?.delete(userId)
  if (voiceRooms.get(channelId)?.size === 0) {
    voiceRooms.delete(channelId)
  }

  voiceLogger.info({ userId, channelId }, "User left voice channel")

  const remaining = getRoomParticipants(channelId)
  const redis = getRedis()
  const leaveEvent = {
    type: "voice:user-left",
    channelId,
    userId,
    participants: remaining,
  }

  if (redis) {
    for (const pid of remaining) {
      redis.publish(`chat:user:${pid}`, JSON.stringify(leaveEvent))
    }
  }

  return {
    type: "voice:left",
    channelId,
  }
}

export async function handleVoiceOffer(
  payload: { channelId: string; targetUserId: string; sdp: unknown },
  userId: string,
) {
  const redis = getRedis()
  const event = {
    type: "voice:offer",
    channelId: payload.channelId,
    callerId: userId,
    sdp: payload.sdp,
  }

  if (redis) {
    redis.publish(`chat:user:${payload.targetUserId}`, JSON.stringify(event))
  }

  return null
}

export async function handleVoiceAnswer(
  payload: { channelId: string; targetUserId: string; sdp: unknown },
  userId: string,
) {
  const redis = getRedis()
  const event = {
    type: "voice:answer",
    channelId: payload.channelId,
    userId,
    sdp: payload.sdp,
  }

  if (redis) {
    redis.publish(`chat:user:${payload.targetUserId}`, JSON.stringify(event))
  }

  return null
}

export async function handleVoiceIceCandidate(
  payload: { channelId: string; targetUserId: string; candidate: unknown },
  userId: string,
) {
  const redis = getRedis()
  const event = {
    type: "voice:ice-candidate",
    channelId: payload.channelId,
    userId,
    candidate: payload.candidate,
  }

  if (redis) {
    redis.publish(`chat:user:${payload.targetUserId}`, JSON.stringify(event))
  }

  return null
}
