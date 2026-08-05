import { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Animated } from "react-native";
import {
  Phone,
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Volume2,
  VolumeX,
  PhoneIncoming,
  PhoneOutgoing,
  User,
  X,
} from "lucide-react-native";
import { wsClient } from "../lib/ws";
import { AvatarImage } from "./ui/avatar-image";

interface CallOverlayProps {
  conversationId: string;
  type: "voice" | "video";
  onEnd: () => void;
  incoming?: boolean;
  name?: string;
  avatar?: string | null;
}

const AVATAR_COLORS = ["#E5A13C", "#38B7DE", "#E542A3", "#1FA855", "#C484FF", "#F27F2F", "#3FC8B4", "#5B9BD5"];

function colorFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export function CallOverlay({ conversationId, type, onEnd, incoming, name, avatar }: CallOverlayProps) {
  const [muted, setMuted] = useState(false);
  const [videoOn, setVideoOn] = useState(type === "video");
  const [speakerOn, setSpeakerOn] = useState(true);
  const [duration, setDuration] = useState(0);
  const [connected, setConnected] = useState(!incoming);
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!incoming) {
      wsClient.send("call:offer", { conversationId, type });
    }
    const unsub1 = wsClient.on("call:answered", () => setConnected(true));
    const unsub2 = wsClient.on("call:ended", (data: any) => {
      if (data.sessionId === conversationId) onEnd();
    });
    const timer = setInterval(() => setDuration((d) => d + 1), 1000);
    return () => {
      unsub1();
      unsub2();
      clearInterval(timer);
    };
  }, [conversationId]);

  useEffect(() => {
    if (!connected) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1, duration: 1100, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 0, duration: 1100, useNativeDriver: true }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    }
    pulse.setValue(0);
  }, [connected]);

  const endCall = () => {
    wsClient.send("call:end", { sessionId: conversationId });
    onEnd();
  };

  const answerCall = () => {
    wsClient.send("call:answer", { conversationId });
    setConnected(true);
  };

  const toggleMute = () => setMuted(!muted);
  const toggleVideo = () => setVideoOn(!videoOn);
  const toggleSpeaker = () => setSpeakerOn(!speakerOn);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const displayName = name || "Call";
  const avatarBg = colorFor(displayName);

  const statusText = incoming && !connected ? "Incoming call" : connected ? formatDuration(duration) : "Ringing…";
  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.22] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] });

  return (
    <View style={[s.container, type === "video" && s.containerVideo]}>
      <View style={s.topRow}>
        <View style={s.callTypeBadge}>
          {type === "video" ? <Video size={14} color="#FFFFFF" /> : <Phone size={14} color="#FFFFFF" />}
          <Text style={s.callTypeText}>{type === "video" ? "Video Call" : "Voice Call"}</Text>
        </View>
        <TouchableOpacity style={s.closeBtn} onPress={endCall}>
          <X size={18} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>
      </View>

      <View style={s.avatarSection}>
        <View style={s.avatarWrap}>
          {!connected && (
            <>
              <Animated.View
                style={[
                  s.ring,
                  {
                    width: 168,
                    height: 168,
                    borderRadius: 84,
                    transform: [{ scale: ringScale }],
                    opacity: ringOpacity,
                    borderColor: "rgba(108,140,255,0.5)",
                  },
                ]}
              />
              <Animated.View
                style={[
                  s.ring,
                  {
                    width: 168,
                    height: 168,
                    borderRadius: 84,
                    transform: [{ scale: ringScale }],
                    opacity: ringOpacity,
                    borderColor: "rgba(34,197,94,0.4)",
                  },
                ]}
              />
            </>
          )}
          {avatar ? (
            <AvatarImage uri={avatar} style={s.avatarImage} />
          ) : (
            <View style={[s.avatar, { backgroundColor: avatarBg }]}>
              <Text style={s.avatarText}>{(displayName[0] || "?").toUpperCase()}</Text>
            </View>
          )}
        </View>
        <Text style={s.name}>{displayName}</Text>
        <View style={s.statusRow}>
          <Text style={s.status}>{statusText}</Text>
          <View style={s.statusDot} />
        </View>
      </View>

      <View style={s.controls}>
        {incoming && !connected ? (
          <>
            <View style={s.controlCol}>
              <TouchableOpacity style={[s.btn, s.endBtn]} onPress={endCall}>
                <PhoneOff size={28} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={s.btnLabel}>Decline</Text>
            </View>
            <View style={s.controlCol}>
              <TouchableOpacity style={[s.btn, s.answerBtn]} onPress={answerCall}>
                <Phone size={28} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={s.btnLabel}>Accept</Text>
            </View>
          </>
        ) : (
          <>
            <View style={s.controlCol}>
              <TouchableOpacity
                style={[s.btn, muted ? s.btnActive : s.btnSecondary]}
                onPress={toggleMute}
                activeOpacity={0.8}
              >
                {muted ? <MicOff size={26} color="#E8E8F0" /> : <Mic size={26} color="#E8E8F0" />}
              </TouchableOpacity>
              <Text style={s.btnLabel}>{muted ? "Unmute" : "Mute"}</Text>
            </View>
            {type === "video" && (
              <View style={s.controlCol}>
                <TouchableOpacity
                  style={[s.btn, !videoOn ? s.btnActive : s.btnSecondary]}
                  onPress={toggleVideo}
                  activeOpacity={0.8}
                >
                  {videoOn ? <Video size={26} color="#E8E8F0" /> : <VideoOff size={26} color="#E8E8F0" />}
                </TouchableOpacity>
                <Text style={s.btnLabel}>{videoOn ? "Video" : "Camera Off"}</Text>
              </View>
            )}
            <View style={s.controlCol}>
              <TouchableOpacity style={[s.btn, s.endBtn]} onPress={endCall} activeOpacity={0.8}>
                <PhoneOff size={28} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={s.btnLabel}>End</Text>
            </View>
            <View style={s.controlCol}>
              <TouchableOpacity
                style={[s.btn, !speakerOn ? s.btnActive : s.btnSecondary]}
                onPress={toggleSpeaker}
                activeOpacity={0.8}
              >
                {speakerOn ? <Volume2 size={26} color="#E8E8F0" /> : <VolumeX size={26} color="#E8E8F0" />}
              </TouchableOpacity>
              <Text style={s.btnLabel}>{speakerOn ? "Speaker" : "Speaker Off"}</Text>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#0B1220",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 999,
    paddingTop: 60,
    paddingBottom: 48,
  },
  containerVideo: { backgroundColor: "#05070D" },
  topRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  callTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  callTypeText: { color: "rgba(255,255,255,0.9)", fontSize: 13, fontWeight: "600" },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarSection: { alignItems: "center", marginTop: 20 },
  avatarWrap: { marginBottom: 24, alignItems: "center", justifyContent: "center" },
  ring: { position: "absolute", borderWidth: 1.5 },
  avatar: {
    width: 156,
    height: 156,
    borderRadius: 78,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.25)",
  },
  avatarImage: { width: 156, height: 156, borderRadius: 78, borderWidth: 3, borderColor: "rgba(255,255,255,0.25)" },
  avatarText: { color: "#FFFFFF", fontSize: 60, fontWeight: "700" },
  name: { color: "#FFFFFF", fontSize: 24, fontWeight: "700", letterSpacing: -0.4 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  status: { color: "rgba(255,255,255,0.6)", fontSize: 15 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#22C55E" },
  controls: { flexDirection: "row", gap: 22, alignItems: "flex-start" },
  controlCol: { alignItems: "center", gap: 8 },
  btnLabel: { color: "rgba(255,255,255,0.55)", fontSize: 12, fontWeight: "500" },
  btn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  btnSecondary: { backgroundColor: "rgba(255,255,255,0.1)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  btnActive: {
    backgroundColor: "rgba(239,68,68,0.2)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.5)",
  },
  endBtn: { backgroundColor: "#EF4444", borderWidth: 1, borderColor: "#EF4444" },
  answerBtn: { backgroundColor: "#22C55E", borderWidth: 1, borderColor: "#22C55E" },
});
