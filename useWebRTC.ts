import { useEffect, useRef, useState, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';
import Peer from 'simple-peer';
import hark from 'hark';
import { User, Message, VideoQuality, Poll, WhiteboardAction, Transcript } from '@/types';
import { SelfieSegmentation } from '@mediapipe/selfie_segmentation';
import { VirtualBackgroundProcessor, BackgroundTarget } from '@/lib/backgroundProcessor';
import { AudioProcessor } from '@/lib/audioProcessor';

export const useWebRTC = (roomId: string, userName: string) => {
  const [participants, setParticipants] = useState<User[]>([]);
  const [me, setMe] = useState<User | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [backgroundTarget, setBackgroundTarget] = useState<BackgroundTarget>('none');
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [spotlightId, setSpotlightId] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState<{ 
    message: string; 
    type: 'error' | 'warning' | 'info';
    action?: { label: string; onClick: () => void };
  } | null>(null);
  const [networkStatus, setNetworkStatus] = useState<'connected' | 'reconnecting' | 'disconnected'>('connected');
  const [messages, setMessages] = useState<Message[]>([]);
  const [quality, setQuality] = useState<VideoQuality>('720p');
  const [availableDevices, setAvailableDevices] = useState<{ audio: MediaDeviceInfo[]; video: MediaDeviceInfo[] }>({ audio: [], video: [] });
  const [selectedDevices, setSelectedDevices] = useState<{ audioId: string; videoId: string }>(() => {
    const saved = localStorage.getItem('meetlite_device_prefs');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved device preferences", e);
      }
    }
    return { audioId: '', videoId: '' };
  });
  const [isJoined, setIsJoined] = useState(false);
  const [isWaitingInLobby, setIsWaitingInLobby] = useState(false);
  const [lobbyParticipants, setLobbyParticipants] = useState<{ id: string; name: string }[]>([]);
  const [hasPasscode, setHasPasscode] = useState(false);
  const [isNoiseCancellationEnabled, setIsNoiseCancellationEnabled] = useState(false);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [whiteboardData, setWhiteboardData] = useState<any[]>([]);
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [isTranscriptionEnabled, setIsTranscriptionEnabled] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const peersRef = useRef<Record<string, Peer.Instance>>({});
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);
  const processorRef = useRef<VirtualBackgroundProcessor | null>(null);
  const audioProcessorRef = useRef<AudioProcessor | null>(null);
  const speakerTimeoutsRef = useRef<Record<string, any>>({});

  const getConstraintsForQuality = (q: VideoQuality) => {
    return {
      '360p': { width: 640, height: 360 },
      '720p': { width: 1280, height: 720 },
      '1080p': { width: 1920, height: 1080 }
    }[q];
  };

  const initializeLocalMedia = async (audioId?: string, videoId?: string) => {
    try {
      const targetAudioId = audioId || selectedDevices.audioId;
      const targetVideoId = videoId || selectedDevices.videoId;

      const qConstraints = getConstraintsForQuality(quality);
      const constraints: MediaStreamConstraints = {
        video: { 
          ...qConstraints,
          deviceId: targetVideoId ? { exact: targetVideoId } : undefined
        },
        audio: targetAudioId ? { deviceId: { exact: targetAudioId } } : true
      };

      // Try with preferred/saved devices
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (prefErr) {
        console.warn("Preferred devices failed or missing, falling back to defaults...", prefErr);
        if (targetAudioId || targetVideoId) {
          setMediaError({
            message: "Your preferred camera or microphone wasn't found. Using default devices instead.",
            type: 'info'
          });
        }
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      }
      
      // Update selected devices state after successful access
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];
      if (videoTrack || audioTrack) {
        setSelectedDevices({
          audioId: audioTrack?.getSettings().deviceId || targetAudioId || '',
          videoId: videoTrack?.getSettings().deviceId || targetVideoId || ''
        });
      }

      setLocalStream(stream);
      
      // Apply noise cancellation if enabled
      if (isNoiseCancellationEnabled) {
        if (!audioProcessorRef.current) audioProcessorRef.current = new AudioProcessor();
        const processedStream = await audioProcessorRef.current.processStream(stream);
        setLocalStream(processedStream);
      }

      setupAudioDetection(stream, 'me');
      refreshDevices();
      return stream;
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setMediaError({
          message: "Media permissions denied. Please grant access to your camera and microphone in browser settings.",
          type: 'error',
          action: { label: 'Reload Page', onClick: () => window.location.reload() }
        });
        return null;
      }

      console.warn("High quality media failed, trying basic...", err);
      try {
        // Try basic video and audio
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        setLocalStream(stream);
        setupAudioDetection(stream, 'me');
        return stream;
      } catch (err2: any) {
        console.warn("Basic video+audio failed, trying audio only...", err2);
        try {
          // Try audio only
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true
          });
          setLocalStream(stream);
          setupAudioDetection(stream, 'me');
          setMediaError({ 
            message: "Camera not found. You are joined with audio only.", 
            type: 'warning' 
          });
          return stream;
        } catch (err3: any) {
          console.error("All media attempts failed:", err3);
          setMediaError({ 
            message: "Microphone access failed. Please check your system settings and browser permissions.", 
            type: 'error',
            action: { label: 'Troubleshoot', onClick: () => window.open('https://support.google.com/chrome/answer/2693767', '_blank') }
          });
          return null;
        }
      }
    }
  };

  const refreshDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setAvailableDevices({
        audio: devices.filter(d => d.kind === 'audioinput'),
        video: devices.filter(d => d.kind === 'videoinput')
      });
    } catch (err) {
      console.error("Failed to enumerate devices:", err);
    }
  };

  const switchDevice = async (kind: 'audio' | 'video', deviceId: string) => {
    if (!localStream) return;

    try {
      const isMic = kind === 'audio';
      const qConstraints = getConstraintsForQuality(quality);
      const constraints = isMic 
        ? { audio: { deviceId: { exact: deviceId } } }
        : { video: { deviceId: { exact: deviceId }, ...qConstraints } };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      const newTrack = isMic ? newStream.getAudioTracks()[0] : newStream.getVideoTracks()[0];

      if (newTrack) {
        const oldTracks = isMic ? localStream.getAudioTracks() : localStream.getVideoTracks();
        oldTracks.forEach(t => {
            t.stop();
            localStream.removeTrack(t);
        });

        localStream.addTrack(newTrack);
        
        // Create a new MediaStream instance to trigger re-renders in components using it
        const updatedStream = new MediaStream(localStream.getTracks());
        setLocalStream(updatedStream);
        
        // Replace track in all peers
        Object.values(peersRef.current).forEach(peer => {
            const senders = (peer as any)._pc.getSenders();
            const sender = senders.find((s: any) => s.track?.kind === (isMic ? 'audio' : 'video'));
            if (sender) {
                sender.replaceTrack(newTrack);
            }
        });

        setSelectedDevices(prev => ({
          ...prev,
          [isMic ? 'audioId' : 'videoId']: deviceId
        }));

        if (isMic) {
            setupAudioDetection(localStream, 'me');
        }
      }
    } catch (err) {
      console.error(`Failed to switch ${kind} device:`, err);
      setMediaError({ message: `Failed to switch ${kind} device.`, type: 'warning' });
      throw err;
    }
  };

  const setupAudioDetection = (stream: MediaStream, userId: string) => {
    const speech = hark(stream, { interval: 100, threshold: -50 });
    
    speech.on('speaking', () => {
      // Clear any pending timeout for this user when they start speaking
      if (speakerTimeoutsRef.current[userId]) {
        clearTimeout(speakerTimeoutsRef.current[userId]);
        delete speakerTimeoutsRef.current[userId];
      }
      setActiveSpeakerId(userId);
    });

    speech.on('stopped_speaking', () => {
      // Clear existing timeout before setting a new one
      if (speakerTimeoutsRef.current[userId]) {
        clearTimeout(speakerTimeoutsRef.current[userId]);
      }
      
      // Delay clearing the active speaker ID to make transitions smoother (1.5s persistence)
      speakerTimeoutsRef.current[userId] = setTimeout(() => {
        setActiveSpeakerId(id => id === userId ? null : id);
        delete speakerTimeoutsRef.current[userId];
      }, 1500);
    });
  };

  const createPeer = (userToSignal: string, callerId: string, stream: MediaStream) => {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream,
    });

    peer.on("signal", signal => {
      socketRef.current?.emit("signal", { to: userToSignal, from: callerId, signal });
    });

    peer.on("error", err => {
      console.error("Peer connection error:", err);
      setMediaError({
        message: "A connection to a participant was lost. Attempting to restore...",
        type: 'warning'
      });
      setParticipants(prev => prev.filter(p => p.id !== userToSignal));
    });

    peer.on("close", () => {
      setParticipants(prev => prev.filter(p => p.id !== userToSignal));
    });

    return peer;
  };

  const addPeer = (incomingSignal: any, callerId: string, stream: MediaStream) => {
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream,
    });

    peer.on("signal", signal => {
      socketRef.current?.emit("signal", { to: callerId, from: socketRef.current!.id!, signal });
    });

    peer.on("stream", stream => {
      setRemoteStreams(prev => ({ ...prev, [callerId]: stream }));
      setupAudioDetection(stream, callerId);
    });

    peer.on("error", err => {
      console.error("Peer connection error:", err);
      setMediaError({
        message: "Failed to establish a secure connection with a new participant.",
        type: 'warning'
      });
    });

    peer.on("close", () => {
      console.log("Peer connection closed");
    });

    peer.signal(incomingSignal);
    return peer;
  };

  const join = async (passcode?: string) => {
    if (isJoined || !roomId) return;

    const start = async () => {
      let stream = localStream;
      if (!stream) {
        stream = await initializeLocalMedia(selectedDevices.audioId, selectedDevices.videoId);
      }
      if (!stream) return;

      if (!socketRef.current) {
        socketRef.current = io({
          reconnectionAttempts: 5,
          reconnectionDelay: 1000
        });

        socketRef.current.on("connect", () => {
          setNetworkStatus('connected');
        });

        socketRef.current.on("disconnect", () => {
          setNetworkStatus('disconnected');
        });

        socketRef.current.on("connect_error", () => {
          setNetworkStatus('reconnecting');
        });

        socketRef.current.on("error", (err: any) => {
          console.error("Signaling error:", err);
          if (err.type === 'AUTH_REQUIRED') {
            setMediaError({ message: err.message, type: 'error' });
            return;
          }
          setMediaError({ 
            message: err.message || "Failed to connect to the meeting server.", 
            type: 'error'
          });
        });

        socketRef.current.on("waiting-in-lobby", () => {
          setIsWaitingInLobby(true);
        });

        socketRef.current.on("lobby-update", (waitingList) => {
          setLobbyParticipants(waitingList);
        });

        socketRef.current.on("room-joined", ({ me, participants: initialParticipants, isLocked, spotlightId, hasPasscode }) => {
          setMe(me);
          setParticipants(initialParticipants);
          setIsLocked(isLocked || false);
          setSpotlightId(spotlightId || null);
          setHasPasscode(hasPasscode || false);
          setIsJoined(true);
          setIsWaitingInLobby(false);

          // Initiate connections to existing participants
          initialParticipants.forEach((user: User) => {
            const peer = createPeer(user.id, socketRef.current!.id!, stream!);
            peersRef.current[user.id] = peer;
          });
        });

        socketRef.current.on("spotlight-updated", (userId: string | null) => {
          setSpotlightId(userId);
        });

        socketRef.current.on("user-joined", (user: User) => {
          setParticipants(prev => {
             if (prev.find(p => p.id === user.id)) return prev;
             return [...prev, user];
          });
        });

        socketRef.current.on("signal", ({ from, signal }) => {
          if (peersRef.current[from]) {
            peersRef.current[from].signal(signal);
          } else {
            const peer = addPeer(signal, from, stream!);
            peersRef.current[from] = peer;
          }
        });

        socketRef.current.on("user-updated", (user: User) => {
          if (user.id === socketRef.current?.id) {
            setMe(user);
          } else {
            setParticipants(prev => prev.map(p => p.id === user.id ? user : p));
          }
        });

        socketRef.current.on("user-left", (userId: string) => {
          if (peersRef.current[userId]) {
            (peersRef.current[userId] as any).destroy();
            delete peersRef.current[userId];
          }
          setParticipants(prev => prev.filter(p => p.id !== userId));
          setRemoteStreams(prev => {
            const next = { ...prev };
            delete next[userId];
            return next;
          });
        });

        socketRef.current.on("room-locked", (locked: boolean) => {
          setIsLocked(locked);
        });

        socketRef.current.on("force-mute-all", () => {
          if (!me?.isHost) {
            toggleMic(true);
          }
        });

        socketRef.current.on("force-mute", () => {
          toggleMic(true);
        });

        socketRef.current.on("force-stop-video", () => {
          toggleVideo(true);
        });

        socketRef.current.on("new-message", (message: Message) => {
          setMessages(prev => [...prev, message]);
        });

        socketRef.current.on("message-reacted", ({ messageId, emoji, userId }) => {
          setMessages(prev => prev.map(msg => {
            if (msg.id !== messageId) return msg;
            
            const reactions = { ...(msg.reactions || {}) };
            const userIds = [...(reactions[emoji] || [])];
            
            if (userIds.includes(userId)) {
              reactions[emoji] = userIds.filter(id => id !== userId);
              if (reactions[emoji].length === 0) delete reactions[emoji];
            } else {
              reactions[emoji] = [...userIds, userId];
            }
            
            return { ...msg, reactions };
          }));
        });

        socketRef.current.on("kicked", () => {
          window.location.href = "/";
        });

        socketRef.current.on("user-reaction", ({ userId, emoji }) => {
          setParticipants(prev => prev.map(p => p.id === userId ? { ...p, activeReaction: emoji } : p));
          if (userId === socketRef.current?.id) {
            setMe(prev => prev ? { ...prev, activeReaction: emoji } : null);
          }
          
          setTimeout(() => {
            setParticipants(prev => prev.map(p => p.id === userId ? { ...p, activeReaction: null } : p));
            if (userId === socketRef.current?.id) {
              setMe(prev => prev ? { ...prev, activeReaction: null } : null);
            }
          }, 3000);
        });

        socketRef.current.on("poll-created", (poll: Poll) => {
          setPolls(prev => [...prev, poll]);
        });

        socketRef.current.on("poll-updated", (poll: Poll) => {
          setPolls(prev => prev.map(p => p.id === poll.id ? poll : p));
        });

        socketRef.current.on("whiteboard-update", (action: WhiteboardAction) => {
          if (action.type === 'draw') {
            setWhiteboardData(prev => [...prev, action.payload]);
          } else if (action.type === 'clear') {
            setWhiteboardData([]);
          }
        });

        socketRef.current.on("new-transcript", (transcript: Transcript) => {
          setTranscripts(prev => [...prev, transcript]);
        });
      }
      
      socketRef.current.emit("join-room", { roomId, name: userName, passcode });
    };

    start();
  };

  const admitUser = (userId: string) => {
    socketRef.current?.emit("lobby-decision", { roomId, userId, action: "admit" });
  };

  const denyUser = (userId: string) => {
    socketRef.current?.emit("lobby-decision", { roomId, userId, action: "deny" });
  };

  const toggleTranscription = () => {
    setIsTranscriptionEnabled(prev => !prev);
  };

  useEffect(() => {
    if (!isTranscriptionEnabled || !isJoined || me?.isMuted) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMediaError({ message: "Speech recognition is not supported in your browser.", type: 'warning' });
      setIsTranscriptionEnabled(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const last = event.results.length - 1;
      const text = event.results[last][0].transcript;
      if (text && text.trim()) {
        socketRef.current?.emit("send-transcript", { roomId, text: text.trim() });
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === 'not-allowed') {
        setMediaError({ message: "Microphone access for transcription was denied.", type: 'error' });
        setIsTranscriptionEnabled(false);
      }
    };

    recognition.start();

    return () => {
      recognition.stop();
    };
  }, [isTranscriptionEnabled, isJoined, me?.isMuted, roomId]);

  useEffect(() => {
    if (selectedDevices.audioId || selectedDevices.videoId) {
      localStorage.setItem('meetlite_device_prefs', JSON.stringify(selectedDevices));
    }
  }, [selectedDevices]);

  useEffect(() => {
    // Just initialize local media and devices on mount, but don't join yet
    initializeLocalMedia();

    return () => {
      socketRef.current?.disconnect();
      localStream?.getTracks().forEach(track => track.stop());
      Object.values(peersRef.current).forEach(peer => (peer as any).destroy());
      // Cleanup speaker timeouts
      Object.values(speakerTimeoutsRef.current).forEach(timeout => clearTimeout(timeout as any));
    };
  }, []);

  const toggleMic = (forceValue?: boolean) => {
    if (!localStream) return;
    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
        const newValue = forceValue !== undefined ? !forceValue : !audioTrack.enabled;
        audioTrack.enabled = newValue;
        setMe(prev => prev ? ({ ...prev, isMuted: !newValue }) : null);
        socketRef.current?.emit("update-state", { roomId, state: { isMuted: !newValue } });
    }
  };

  const toggleVideo = (forceOff?: boolean) => {
    if (!localStream) return;
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
        const newValue = forceOff !== undefined ? !forceOff : !videoTrack.enabled;
        videoTrack.enabled = newValue;
        setMe(prev => prev ? ({ ...prev, isVideoOff: !newValue }) : null);
        socketRef.current?.emit("update-state", { roomId, state: { isVideoOff: !newValue } });
    }
  };

  const toggleScreenShare = async () => {
    if (!localStream || !me) return;

    if (!me.isScreenSharing) {
        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            const screenTrack = screenStream.getVideoTracks()[0];
            screenTrackRef.current = screenTrack;

            // Replace video track in all peers
            Object.values(peersRef.current).forEach(peer => {
                const videoSender = (peer as any)._pc.getSenders().find((s: any) => s.track.kind === 'video');
                if (videoSender) {
                    videoSender.replaceTrack(screenTrack);
                }
            });

            screenTrack.onended = () => {
                stopScreenShare();
            };

            setMe(prev => prev ? ({ ...prev, isScreenSharing: true }) : null);
            socketRef.current?.emit("update-state", { roomId, state: { isScreenSharing: true } });
        } catch (err) {
            console.error("Screen share failed:", err);
        }
    } else {
        stopScreenShare();
    }
  };

  const stopScreenShare = () => {
      if (!localStream) return;
      const originalVideoTrack = localStream.getVideoTracks()[0];
      
      Object.values(peersRef.current).forEach(peer => {
          const videoSender = (peer as any)._pc.getSenders().find((s: any) => s.track.kind === 'video');
          if (videoSender) {
              videoSender.replaceTrack(originalVideoTrack);
          }
      });

      if (screenTrackRef.current) {
          screenTrackRef.current.stop();
          screenTrackRef.current = null;
      }

      setMe(prev => prev ? ({ ...prev, isScreenSharing: false }) : null);
      socketRef.current?.emit("update-state", { roomId, state: { isScreenSharing: false } });
  };

  const toggleNoiseCancellation = async () => {
    const newState = !isNoiseCancellationEnabled;
    setIsNoiseCancellationEnabled(newState);

    if (!localStream) return;

    if (newState) {
      if (!audioProcessorRef.current) audioProcessorRef.current = new AudioProcessor();
      audioProcessorRef.current.setEnabled(true);
      const processedStream = await audioProcessorRef.current.processStream(localStream);
      
      const newAudioTrack = processedStream.getAudioTracks()[0];
      if (newAudioTrack) {
        // Replace track in all peers
        Object.values(peersRef.current).forEach(peer => {
          const senders = (peer as any)._pc.getSenders();
          const sender = senders.find((s: any) => s.track?.kind === 'audio');
          if (sender) {
            sender.replaceTrack(newAudioTrack);
          }
        });
        setLocalStream(new MediaStream([localStream.getVideoTracks()[0], newAudioTrack]));
      }
    } else {
      if (audioProcessorRef.current) {
        audioProcessorRef.current.setEnabled(false);
        // We need to restore the hardware track. 
        // For simplicity in this sandbox, we re-acquire device or use switchDevice logic
        await switchDevice('audio', selectedDevices.audioId);
      }
    }
  };

  const sendMessage = (text: string) => {
    if (text.trim()) {
      socketRef.current?.emit("send-message", { roomId, text });
    }
  };

  const reactToMessage = (messageId: string, emoji: string) => {
    socketRef.current?.emit("react-to-message", { roomId, messageId, emoji });
  };

  const muteAll = () => {
    if (me?.isHost) {
        socketRef.current?.emit("mute-all", { roomId });
    }
  };

  const muteUser = (userId: string) => {
    if (me?.isHost) {
        socketRef.current?.emit("mute-user", { roomId, userId });
    }
  };

  const stopVideoUser = (userId: string) => {
    if (me?.isHost) {
        socketRef.current?.emit("stop-video-user", { roomId, userId });
    }
  };

  const promoteHost = (userId: string) => {
    if (me?.isHost) {
        socketRef.current?.emit("promote-host", { roomId, userId });
    }
  };

  const kickUser = (userId: string) => {
    if (me?.isHost) {
        socketRef.current?.emit("kick-user", { roomId, userId });
    }
  };

  const toggleSpotlight = (userId: string | null) => {
    if (me?.isHost) {
        socketRef.current?.emit("spotlight-user", { roomId, userId: spotlightId === userId ? null : userId });
    }
  };

  const toggleLock = () => {
    if (me?.isHost) {
        socketRef.current?.emit("lock-room", { roomId, locked: !isLocked });
    }
  };

  const changeQuality = async (newQuality: VideoQuality) => {
    if (!localStream) return;
    const videoTrack = localStream.getVideoTracks()[0];
    if (!videoTrack) return;

    const constraints: MediaTrackConstraints = {
      '360p': { width: 640, height: 360 },
      '720p': { width: 1280, height: 720 },
      '1080p': { width: 1920, height: 1080 }
    }[newQuality];

    try {
      await videoTrack.applyConstraints(constraints);
      setQuality(newQuality);
    } catch (err) {
      console.error("Failed to change quality:", err);
    }
  };

  const setVirtualBackground = async (target: BackgroundTarget) => {
    if (!localStream) return;
    
    if (!processorRef.current) {
        processorRef.current = new VirtualBackgroundProcessor();
    }

    setBackgroundTarget(target);
    processorRef.current.setTarget(target);

    // If switching FROM 'none' to something else, we need to re-route the stream
    // If switching images, setTarget handles it.
    // If switching TO 'none', we need to restore hardware track.
    
    // Actually, it's easier to always have the processor active if NOT none
    // or just always have it active if initialized?
    
    if (target === 'none') {
        // Restore hardware track
        // We need to re-request media if we don't have the original track handle
        // or we can store original hardware track in a ref
        await switchDevice('video', selectedDevices.videoId);
        return;
    }

    try {
        const processedStream = await processorRef.current.processStream(localStream);
        const newTrack = processedStream.getVideoTracks()[0];
        
        if (newTrack) {
            const oldTracks = localStream.getVideoTracks();
            oldTracks.forEach(t => {
                // If it's a hardware track, DON'T stop it, as processor needs it
                localStream.removeTrack(t);
            });

            localStream.addTrack(newTrack);
            const updatedStream = new MediaStream(localStream.getTracks());
            setLocalStream(updatedStream);

            // Replace track in all peers
            Object.values(peersRef.current).forEach(peer => {
                const senders = (peer as any)._pc.getSenders();
                const sender = senders.find((s: any) => s.track?.kind === 'video');
                if (sender) {
                    sender.replaceTrack(newTrack);
                }
            });
        }
    } catch (err) {
        console.error("Failed to apply virtual background:", err);
    }
  };

  const sendReaction = (emoji: string) => {
    socketRef.current?.emit("send-reaction", { roomId, emoji });
  };

  const toggleHandRaise = () => {
    const newState = !me?.isHandRaised;
    setMe(prev => prev ? { ...prev, isHandRaised: newState } : null);
    socketRef.current?.emit("update-state", { roomId, state: { isHandRaised: newState } });
  };

  const createPoll = (question: string, options: string[]) => {
    socketRef.current?.emit("create-poll", { roomId, question, options });
  };

  const votePoll = (pollId: string, optionId: string) => {
    socketRef.current?.emit("vote-poll", { roomId, pollId, optionId });
  };

  const sendWhiteboardAction = (action: WhiteboardAction) => {
    socketRef.current?.emit("whiteboard-action", { roomId, action });
  };

  const leaveRoom = () => {
    processorRef.current?.stop();
    window.location.href = "/";
  };

  return {
    me,
    participants,
    localStream,
    remoteStreams,
    messages,
    activeSpeakerId,
    isLocked,
    spotlightId,
    mediaError,
    networkStatus,
    availableDevices,
    selectedDevices,
    isJoined,
    isWaitingInLobby,
    lobbyParticipants,
    hasPasscode,
    isNoiseCancellationEnabled,
    join,
    quality,
    backgroundTarget,
    polls,
    whiteboardData,
    transcripts,
    isTranscriptionEnabled,
    setVirtualBackground,
    toggleMic,
    toggleVideo,
    toggleScreenShare,
    switchDevice,
    refreshDevices,
    changeQuality,
    sendMessage,
    reactToMessage,
    muteAll,
    muteUser,
    stopVideoUser,
    promoteHost,
    kickUser,
    toggleSpotlight,
    toggleLock,
    admitUser,
    denyUser,
    toggleTranscription,
    toggleNoiseCancellation,
    sendReaction,
    toggleHandRaise,
    createPoll,
    votePoll,
    sendWhiteboardAction,
    leaveRoom
  };
};
