/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Volume2, Mic, MicOff, Video, VideoOff, LogOut, PhoneCall, AlertTriangle } from 'lucide-react';
import type { Socket } from 'socket.io-client';
import { UserProfile, ActiveVoiceCall } from '../types';

interface VoiceChamberPanelProps {
  user: UserProfile;
  socket: Socket | null;
  currentChamber: ActiveVoiceCall | null;
  onJoinChamber: (chamberId: string) => void;
  onLeaveChamber: () => void;
  onToggleMic: (muted: boolean) => void;
  onToggleCamera: (cameraOn: boolean) => void;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export default function VoiceChamberPanel({
  user,
  socket,
  currentChamber,
  onJoinChamber,
  onLeaveChamber,
  onToggleMic,
  onToggleCamera
}: VoiceChamberPanelProps) {
  const [micMuted, setMicMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [hasVideoDevice, setHasVideoDevice] = useState(true);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [mediaReady, setMediaReady] = useState(false);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});

  // Mutable refs so socket event handlers always see the latest values
  // without re-subscribing constantly.
  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const peersRef = useRef<Record<string, RTCPeerConnection>>({});
  const chamberIdRef = useRef<string | null>(null);
  const micMutedRef = useRef(micMuted);
  micMutedRef.current = micMuted;

  const availableChambers = [
    { id: 'floor-1', name: 'Floor 1: Town of Beginnings', desc: 'Starter lobby voice room.' },
    { id: 'floor-50', name: 'Floor 50: Algade Plaza', desc: 'Tactical trading & planning hub.' },
    { id: 'floor-75', name: 'Floor 75: Collinia Command', desc: 'High-level raid alliance chamber.' },
  ];

  // ---------------------------------------------------------------------
  // Peer connection lifecycle
  // ---------------------------------------------------------------------
  const closePeer = useCallback((socketId: string) => {
    const pc = peersRef.current[socketId];
    if (pc) {
      pc.close();
      delete peersRef.current[socketId];
    }
    setRemoteStreams(prev => {
      if (!(socketId in prev)) return prev;
      const next = { ...prev };
      delete next[socketId];
      return next;
    });
  }, []);

  const createPeerConnection = useCallback((remoteSocketId: string, initiator: boolean) => {
    if (!socket) return null;
    const existing = peersRef.current[remoteSocketId];
    if (existing) return existing;

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peersRef.current[remoteSocketId] = pc;

    // Attach whatever local media we already have
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('webrtc-signal', {
          to: remoteSocketId,
          signal: { type: 'candidate', candidate: event.candidate },
        });
      }
    };

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (stream) {
        setRemoteStreams(prev => ({ ...prev, [remoteSocketId]: stream }));
      }
    };

    pc.onconnectionstatechange = () => {
      if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) {
        // Chamber participant-list sync (or the disconnect event) will
        // trigger a proper closePeer() call; nothing else to do here.
      }
    };

    if (initiator) {
      (async () => {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('webrtc-signal', {
            to: remoteSocketId,
            signal: { type: 'offer', sdp: pc.localDescription },
          });
        } catch (err) {
          console.error('[Voice] Failed to create offer:', err);
        }
      })();
    }

    return pc;
  }, [socket]);

  // ---------------------------------------------------------------------
  // Local media acquisition
  // ---------------------------------------------------------------------
  const acquireLocalMedia = useCallback(async () => {
    setMediaError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      // Camera starts OFF and mic starts ON, matching the UI defaults.
      // Tracks stay attached to the connection the whole time; we simply
      // flip `enabled` so we never need to renegotiate mid-call.
      stream.getVideoTracks().forEach(t => { t.enabled = false; });
      stream.getAudioTracks().forEach(t => { t.enabled = !micMutedRef.current; });
      localStreamRef.current = stream;
      setHasVideoDevice(stream.getVideoTracks().length > 0);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    } catch (err) {
      // Retry with audio only (common case: no camera, or camera permission denied)
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStream.getAudioTracks().forEach(t => { t.enabled = !micMutedRef.current; });
        localStreamRef.current = audioStream;
        setHasVideoDevice(false);
      } catch (audioErr) {
        console.error('[Voice] Microphone/camera access denied:', audioErr);
        localStreamRef.current = null;
        setHasVideoDevice(false);
        setMediaError('NerveGear could not access your microphone or camera. You can still stay linked and listen, but others will not hear or see you until permission is granted.');
      }
    }
  }, []);

  const cleanupAll = useCallback(() => {
    Object.keys(peersRef.current).forEach(id => closePeer(id));
    peersRef.current = {};
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    setRemoteStreams({});
    setMicMuted(false);
    setCameraOn(false);
    setMediaError(null);
    setHasVideoDevice(true);
  }, [closePeer]);

  // ---------------------------------------------------------------------
  // Join / leave lifecycle
  // ---------------------------------------------------------------------
  useEffect(() => {
    const chamberId = currentChamber?.roomId || null;

    if (!chamberId) {
      if (chamberIdRef.current) {
        cleanupAll();
        chamberIdRef.current = null;
        setMediaReady(false);
      }
      return;
    }

    if (chamberIdRef.current === chamberId) return; // already set up for this chamber

    chamberIdRef.current = chamberId;
    setMediaReady(false);
    acquireLocalMedia().finally(() => setMediaReady(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentChamber?.roomId]);

  // Stop everything if the component unmounts entirely (e.g. user
  // navigates to a different panel) while still connected.
  useEffect(() => {
    return () => {
      cleanupAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------------
  // Keep peer connections in sync with the chamber's participant roster
  // ---------------------------------------------------------------------
  const participantSignature = (currentChamber?.participants || [])
    .map(p => p.socketId)
    .sort()
    .join(',');

  useEffect(() => {
    if (!currentChamber || !socket || !mediaReady) return;

    const others = currentChamber.participants.filter(p => p.socketId !== socket.id);
    const currentIds = new Set(others.map(p => p.socketId));

    // Drop connections for anyone who left
    Object.keys(peersRef.current).forEach(id => {
      if (!currentIds.has(id)) closePeer(id);
    });

    // Establish connections for newcomers. To avoid both sides sending an
    // offer at once, only the socket with the lexicographically smaller id
    // initiates — the other side just waits for the incoming offer.
    others.forEach(p => {
      if (!peersRef.current[p.socketId] && socket.id) {
        const initiator = socket.id < p.socketId;
        createPeerConnection(p.socketId, initiator);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participantSignature, mediaReady, socket]);

  // ---------------------------------------------------------------------
  // Incoming WebRTC signaling
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (!socket) return;

    const handleSignal = async ({ signal, from }: { signal: any; from: string }) => {
      try {
        if (signal.type === 'offer') {
          let pc = peersRef.current[from];
          if (!pc) pc = createPeerConnection(from, false);
          if (!pc) return;
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('webrtc-signal', { to: from, signal: { type: 'answer', sdp: pc.localDescription } });
        } else if (signal.type === 'answer') {
          const pc = peersRef.current[from];
          if (pc) await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        } else if (signal.type === 'candidate' && signal.candidate) {
          const pc = peersRef.current[from];
          if (pc) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
            } catch (err) {
              console.warn('[Voice] Failed to add ICE candidate:', err);
            }
          }
        }
      } catch (err) {
        console.error('[Voice] Signal handling error:', err);
      }
    };

    socket.on('webrtc-signal-relay', handleSignal);
    return () => {
      socket.off('webrtc-signal-relay', handleSignal);
    };
  }, [socket, createPeerConnection]);

  // ---------------------------------------------------------------------
  // Controls
  // ---------------------------------------------------------------------
  const handleToggleMic = () => {
    const nextMuted = !micMuted;
    setMicMuted(nextMuted);
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !nextMuted; });
    onToggleMic(nextMuted);
  };

  const handleToggleCamera = () => {
    if (!hasVideoDevice) {
      setMediaError('No camera track is available for this session (permission denied or no device found).');
      return;
    }
    const next = !cameraOn;
    setCameraOn(next);
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = next; });
    onToggleCamera(next);
  };

  return (
    <div className="max-w-4xl mx-auto bg-black/40 border border-[#00d9ff]/20 rounded-2xl p-5 md:p-6 shadow-[0_0_40px_rgba(0,217,255,0.15)] font-sans relative overflow-hidden" id="sao-voice-panel">
      {/* Laser indicator */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#00d9ff] to-transparent shadow-[0_0_8px_#00d9ff]" />

      <AnimatePresence mode="wait">
        {currentChamber ? (
          /* ================= ACTIVE CALL CHAMBER SCREEN ================= */
          <motion.div
            key="chamber-active"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Header details */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#00d9ff]/10">
              <div>
                <span className="text-[10px] font-mono font-bold text-[#00d9ff] uppercase tracking-widest bg-[#00d9ff]/10 border border-[#00d9ff]/30 px-2 py-0.5 rounded">
                  {mediaReady ? '🟢 Tactical Channel Connected' : '🟡 Establishing Neural Link…'}
                </span>
                <h2 className="text-lg font-black text-gray-100 uppercase mt-1">
                  {currentChamber.roomName}
                </h2>
              </div>

              {/* Leave Button */}
              <button
                onClick={onLeaveChamber}
                className="px-4 py-2 bg-red-950/20 hover:bg-red-950/40 border border-red-500/20 text-red-400 hover:text-red-300 rounded-xl text-xs font-mono font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5"
              >
                <LogOut className="w-4 h-4" />
                Disconnect Session
              </button>
            </div>

            {/* Media permission notice */}
            {mediaError && (
              <div className="p-3 bg-[#ff9900]/10 border border-[#ff9900]/30 text-[#ff9900] rounded-xl text-[10px] font-mono flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{mediaError}</span>
              </div>
            )}

            {/* Live camera / audio feed grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">

              {/* Local Participant Card */}
              <div className="p-5 bg-[#00d9ff]/5 border border-[#00d9ff]/30 rounded-2xl flex flex-col items-center justify-center text-center relative h-52 overflow-hidden shadow-[0_0_15px_rgba(0,217,255,0.05)]">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`absolute inset-0 w-full h-full object-cover scale-x-[-1] ${cameraOn ? 'opacity-100' : 'opacity-0'} transition-opacity`}
                />
                {!cameraOn && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="text-4xl mb-2">{user.avatar}</div>
                  </div>
                )}
                <div className="absolute bottom-3 left-0 right-0 flex flex-col items-center">
                  <p className="font-bold text-xs text-gray-100 bg-black/40 px-2 py-0.5 rounded">{user.username} (You)</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[9px] font-mono text-gray-300 bg-black/30 px-1 rounded">Muted: {micMuted ? 'YES' : 'NO'}</span>
                    <span className="text-xs">{micMuted ? <MicOff className="w-3.5 h-3.5 text-red-400" /> : <Mic className="w-3.5 h-3.5 text-[#00ff88] animate-pulse" />}</span>
                  </div>
                </div>
              </div>

              {/* Remote Participants */}
              {currentChamber.participants.filter(p => p.uid !== user.uid).map((p) => (
                <RemoteParticipantTile key={p.socketId} participant={p} stream={remoteStreams[p.socketId]} />
              ))}

              {/* Waiting placeholder slots */}
              {currentChamber.participants.length < 3 && (
                <div className="border border-dashed border-[#00d9ff]/15 p-5 rounded-2xl flex flex-col items-center justify-center text-center text-gray-600 h-52">
                  <PhoneCall className="w-6 h-6 mb-2 animate-bounce" />
                  <p className="text-[10px] font-mono uppercase tracking-wider">Awaiting Allies</p>
                </div>
              )}
            </div>

            {/* Neural Controls HUD panel */}
            <div className="p-4 bg-black/40 border border-[#00d9ff]/10 rounded-2xl flex items-center justify-center gap-3">
              {/* Mic Control */}
              <button
                onClick={handleToggleMic}
                className={`p-3 rounded-xl border flex items-center justify-center cursor-pointer transition-all ${
                  micMuted
                    ? 'bg-red-950/20 border-red-500/40 text-red-400'
                    : 'bg-[#00d9ff]/10 border-[#00d9ff]/30 text-[#00d9ff]'
                }`}
              >
                {micMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              {/* Camera Control */}
              <button
                onClick={handleToggleCamera}
                disabled={!hasVideoDevice}
                className={`p-3 rounded-xl border flex items-center justify-center transition-all ${
                  !hasVideoDevice ? 'opacity-40 cursor-not-allowed bg-black/40 border-white/10 text-gray-500' :
                  !cameraOn
                    ? 'cursor-pointer bg-black/40 border-white/10 text-gray-500'
                    : 'cursor-pointer bg-[#00ff88]/10 border-[#00ff88]/40 text-[#00ff88] shadow-[0_0_15px_rgba(0,255,136,0.15)]'
                }`}
                title={hasVideoDevice ? undefined : 'No camera available'}
              >
                {cameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </button>
            </div>
          </motion.div>
        ) : (
          /* ================= DISCOVERY SELECTION VIEW ================= */
          <motion.div
            key="chamber-discovery"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div className="text-center max-w-md mx-auto">
              <Volume2 className="w-12 h-12 text-[#00d9ff] mx-auto mb-2 animate-pulse" />
              <h2 className="text-xl font-bold text-gray-100 uppercase tracking-wide">
                VR Tactical Voice Rooms
              </h2>
              <p className="text-xs text-gray-500 font-sans mt-1">
                Link into live voice &amp; video communication rooms to share instant strategic coordinates and raid tactics.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {availableChambers.map((chamber) => (
                <div
                  key={chamber.id}
                  className="p-4 bg-black/40 border border-[#00d9ff]/10 rounded-2xl flex flex-col justify-between h-44"
                >
                  <div>
                    <span className="text-lg">🔊</span>
                    <h4 className="font-bold text-xs text-gray-200 mt-2">{chamber.name}</h4>
                    <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">{chamber.desc}</p>
                  </div>
                  <button
                    onClick={() => onJoinChamber(chamber.id)}
                    className="w-full py-2 bg-[#00d9ff]/10 hover:bg-[#00d9ff]/20 border border-[#00d9ff]/30 text-[#00d9ff] hover:text-[#00e5ff] text-[10px] font-mono font-bold uppercase rounded-lg cursor-pointer transition-all mt-4"
                  >
                    Establish Neural link
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

// ---------------------------------------------------------------------
// A single remote participant's tile: binds their live MediaStream (audio
// always plays, video only shown while their camera is on).
// ---------------------------------------------------------------------
function RemoteParticipantTile({
  participant,
  stream,
}: {
  participant: ActiveVoiceCall['participants'][number];
  stream?: MediaStream;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const hasVideoTrack = !!stream && stream.getVideoTracks().some(t => t.enabled);
  const showVideo = participant.cameraOn && hasVideoTrack;

  return (
    <div className="p-5 bg-black/40 border border-[#00d9ff]/10 rounded-2xl flex flex-col items-center justify-center text-center relative h-52 overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className={`absolute inset-0 w-full h-full object-cover ${showVideo ? 'opacity-100' : 'opacity-0'} transition-opacity`}
      />
      {!showVideo && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-4xl mb-2">{participant.avatar}</div>
        </div>
      )}

      <div className="absolute bottom-3 left-0 right-0 flex flex-col items-center">
        <p className="font-bold text-xs text-gray-100 bg-black/40 px-2 py-0.5 rounded">{participant.username}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-[9px] font-mono text-gray-300 bg-black/30 px-1 rounded">
            {stream ? 'Signal Relay Stable' : 'Connecting…'}
          </span>
          <span className="text-xs">{participant.micMuted ? <MicOff className="w-3.5 h-3.5 text-gray-400" /> : <Mic className="w-3.5 h-3.5 text-[#00ff88] animate-pulse" />}</span>
        </div>

        {/* Audio frequency wave visualizer */}
        {!participant.micMuted && stream && (
          <div className="flex gap-0.5 items-center justify-center mt-2 h-4">
            <div className="w-1 bg-[#00ff88] h-2 rounded animate-pulse" style={{ animationDelay: '0.1s' }} />
            <div className="w-1 bg-[#00ff88] h-4 rounded animate-pulse" style={{ animationDelay: '0.2s' }} />
            <div className="w-1 bg-[#00ff88] h-1 rounded animate-pulse" style={{ animationDelay: '0.3s' }} />
            <div className="w-1 bg-[#00ff88] h-3 rounded animate-pulse" style={{ animationDelay: '0.4s' }} />
          </div>
        )}
      </div>
    </div>
  );
}
