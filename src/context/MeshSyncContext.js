import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import NetInfo from "@react-native-community/netinfo";
import { getStore } from "../backend/store/eventStore";
import {
  initHotState,
  getNodeId,
  getActiveRole,
  setActiveRole,
  isRegistered,
  getAssignedZoneId,
  registerAsResponder,
  deregisterResponder,
  getLastStatus,
  setLastStatus,
  getLandmark,
  setLandmark,
  setLastCloudSyncHlc,
  hasCompletedProdCleanup,
  markProdCleanupComplete,
  ROLE,
} from "../backend/store/hotState";
import { BleTransport } from "../backend/transport/bleTransport";
import { WsTransport } from "../backend/transport/wsTransport";
import { startCloudSync, syncNow as triggerCloudSync } from "../backend/cloudSync";
import { loginOfficer } from "../backend/cloudApi";
import { getProfile, getResponderSession } from "../utils/storage";
import {
  createSosEvent,
  createHazardEvent,
  createStatusEvent,
  createResponderEnRouteEvent,
  createResolveEvent,
  createCancelledEvent,
} from "../backend/eventCreator";
import { deriveSeverity } from "../backend/shared/severity";
import { formatHlc } from "../backend/shared/hlc";
import { ACTOR_ROLE, SEVERITY } from "../backend/shared/enums";
import { registerDevice } from "../backend/cloudApi";
import { startHeartbeat, stopHeartbeat } from "../backend/heartbeatService";
import { startGc, stopGc } from "../backend/gcService";
import { clearActiveSosIncidentId, getActiveSosIncidentId } from "../backend/store/hotState";
import { getCurrentLocation, formatCoordinateLandmark } from "../utils/location";

const MeshSyncContext = createContext(null);

export function MeshSyncProvider({ children }) {
  const [incidents, setIncidents] = useState([]);
  const [responders, setResponders] = useState([]);
  const [history, setHistory] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [myEvents, setMyEvents] = useState([]);
  const [relayedCount, setRelayedCount] = useState(0);
  const [peerCount, setPeerCount] = useState(0);
  const [isOnline, setIsOnline] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [activeRole, setActiveRoleState] = useState(ROLE.CIVILIAN);
  const [registered, setRegisteredState] = useState(false);
  const [assignedZoneId, setAssignedZoneIdState] = useState(null);
  const [nodeId, setNodeIdState] = useState("");
  const [userProfile, setUserProfile] = useState(null);
  const [activeSosIncidentId, setActiveSosState] = useState(null);

  const bleTransportRef = useRef(null);
  const wsTransportRef = useRef(null);

  // Initialize transports and subscriptions on mount
  useEffect(() => {
    initHotState();
    const currentNodeId = getNodeId();
    setNodeIdState(currentNodeId);
    setActiveRoleState(getActiveRole());
    setRegisteredState(isRegistered());
    setAssignedZoneIdState(getAssignedZoneId());

    const needsProdCleanup = !hasCompletedProdCleanup();
    if (needsProdCleanup) {
      clearActiveSosIncidentId();
      setActiveSosState(null);
      setLastCloudSyncHlc("1790742600000|00000|00000000");
      markProdCleanupComplete();
    }

    // Load user profile
    getProfile().then((prof) => {
      if (prof) setUserProfile(prof);
    }).catch(() => {});

    const store = getStore();

    const refreshEventCounts = async () => {
      try {
        const allEvents = await store.getAll();
        const mine = allEvents.filter((e) => (e.origin_node_id || e.originNodeId) === currentNodeId);
        const relayed =
          typeof store.getRelayedCount === "function"
            ? await store.getRelayedCount(currentNodeId)
            : 0;
        setMyEvents(mine);
        setRelayedCount(relayed);
      } catch (err) {
        console.error("[MeshSyncContext] Error fetching events:", err);
      }
    };

    const bootstrapStore = async () => {
      try {
        // One-time cleanup of stale/mock events previously downloaded into local SQLite
        if (needsProdCleanup && typeof store.clearAll === "function") {
          await store.clearAll();
        }

        const initialProjection = await store.getProjection();
        if (initialProjection) {
          setIncidents(initialProjection.incidents || []);
          setResponders(initialProjection.responders || []);
          setHistory(initialProjection.history || []);
          setAssignments(initialProjection.assignments || []);
        }
      } catch (err) {
        console.error("[MeshSyncContext] Error loading initial projection:", err);
      } finally {
        await refreshEventCounts();
      }
    };

    bootstrapStore();

    // 2. Subscribe to store projection updates
    const unsubscribeStore = store.subscribe((projection) => {
      setIncidents(projection?.incidents || []);
      setResponders(projection?.responders || []);
      setHistory(projection?.history || []);
      setAssignments(projection?.assignments || []);
      refreshEventCounts();
    });

    // 3. Initialize BLE and WebSocket transports with explicit Node ID
    const ble = new BleTransport(currentNodeId, getActiveRole());
    const ws = new WsTransport();
    bleTransportRef.current = ble;
    wsTransportRef.current = ws;

    ble.start();
    ws.start();

    // 4. Track live BLE peer counts
    const peerInterval = setInterval(() => {
      const blePeers = ble.getPeerCount ? ble.getPeerCount() : 0;
      setPeerCount(blePeers);
    }, 3000);

    // 5. Start Cloud Sync listener
    const stopCloudSync = startCloudSync();

    // 6. Monitor Internet connectivity
    const unsubscribeNet = NetInfo.addEventListener((state) => {
      setIsOnline(Boolean(state.isConnected));
    });

    // 7. Warm up GPS location without showing permission alert immediately
    getCurrentLocation({ showAlertOnDenied: false }).then((loc) => {
      if (loc) setUserLocation(loc);
    }).catch(() => {});

    return () => {
      unsubscribeStore();
      unsubscribeNet();
      clearInterval(peerInterval);
      stopCloudSync();
      ble.stop();
      ws.stop();
    };
  }, []);

  /**
   * Refresh current device GPS coordinates (shows alert if permission denied)
   */
  const refreshLocation = useCallback(async () => {
    const loc = await getCurrentLocation({ showAlertOnDenied: true });
    if (loc) {
      setUserLocation(loc);
    }
    return loc;
  }, []);

  // Background services: SOS heartbeat + tombstone GC
  useEffect(() => {
    setActiveSosState(getActiveSosIncidentId());
    startHeartbeat(broadcastEvent);
    startGc(broadcastEvent);
    return () => {
      stopHeartbeat();
      stopGc();
    };
  }, [broadcastEvent]);

  /**
   * Broadcast an event across all active transports and trigger cloud sync.
   * Each transport is isolated — one failing must never skip the others,
   * and the opportunistic cloud upload always runs.
   */
  const broadcastEvent = useCallback(async (event) => {
    if (bleTransportRef.current) {
      try {
        await bleTransportRef.current.sendEvents([event]);
      } catch (err) {
        console.error("[MeshSyncContext] BLE broadcast failed:", err);
      }
    }
    if (wsTransportRef.current) {
      try {
        await wsTransportRef.current.sendEvents([event]);
      } catch (err) {
        console.error("[MeshSyncContext] WS broadcast failed:", err);
      }
    }
    // Opportunistic upload — must run even if both transports failed
    triggerCloudSync().catch((err) =>
      console.log("[MeshSyncContext] cloud sync deferred:", err.message)
    );
  }, []);

  /**
   * Send Emergency SOS (Captures GPS coordinates if available, otherwise falls back to landmark / profile info)
   */
  const sendSOS = useCallback(async ({ landmarkName, victimName, severityLevel, severity } = {}) => {
    // SOS is an immediate life-safety action: status updates must never block or delay SOS dispatch.
    // If victim previously reported critical conditions, escalate severity; otherwise default to HIGH.
    const status = getLastStatus();
    const derived = deriveSeverity(status);
    const resolvedSeverity = severityLevel ?? severity ?? (derived > 0 ? derived : SEVERITY.HIGH);

    // GPS is best-effort: fall back to the last known location, then landmark/profile info
    const loc = (await getCurrentLocation({ showAlertOnDenied: false })) || userLocation;
    if (loc) {
      setUserLocation(loc);
    }

    const store = getStore();
    const resolvedVictim = victimName || userProfile?.fullName || userProfile?.name || "";
    const landmark =
      landmarkName ||
      getLandmark() ||
      (loc
        ? (resolvedVictim ? `SOS: ${resolvedVictim}` : formatCoordinateLandmark(loc.latitude, loc.longitude))
        : (resolvedVictim ? `SOS: ${resolvedVictim}` : (userProfile?.homeLandmark || userProfile?.landmark || "Emergency Assistance Needed")));

    const event = createSosEvent({
      latitude: loc?.latitude ?? null,
      longitude: loc?.longitude ?? null,
      landmarkName: landmark,
      victimName: resolvedVictim,
      severityLevel: resolvedSeverity,
      severity: resolvedSeverity,
      statusSafety: status.safety,
      statusWater: status.water,
      statusInjury: status.injury,
      peopleCount: status.people,
    });

    await store.insert(event);
    await broadcastEvent(event);
    setActiveSosState(event.incident_id);

    return { success: true, event };
  }, [userLocation, userProfile, broadcastEvent]);

  /**
   * Report a Hazard (Captures GPS coordinates if available, otherwise falls back to landmark / title / profile landmark)
   */
  const reportHazard = useCallback(async ({ categoryCode, title, details, severityLevel, landmarkName }) => {
    const loc = (await getCurrentLocation({ showAlertOnDenied: false })) || userLocation;
    if (loc) {
      setUserLocation(loc);
    }

    const store = getStore();
    const landmark = landmarkName || title || (loc ? formatCoordinateLandmark(loc.latitude, loc.longitude) : (userProfile?.homeLandmark || userProfile?.landmark || "Hazard Reported"));
    const event = createHazardEvent({
      category_code: categoryCode,
      title: title || "",
      details: details || "",
      severity_level: severityLevel,
      latitude: loc?.latitude ?? null,
      longitude: loc?.longitude ?? null,
      landmark_name: landmark,
    });

    await store.insert(event);
    await broadcastEvent(event);

    return { success: true, event };
  }, [userLocation, userProfile, broadcastEvent]);

  /**
   * Submit Life Safety / Need Help status update
   */
  const updateMyStatus = useCallback(async ({ safetyCode, waterCode, injuryCode, peopleCount, landmarkName }) => {
    const loc = (await getCurrentLocation({ showAlertOnDenied: false })) || userLocation;
    if (loc) {
      setUserLocation(loc);
    }
    const landmark = landmarkName || (loc?.latitude ? formatCoordinateLandmark(loc.latitude, loc.longitude) : (userProfile?.homeLandmark || userProfile?.landmark || "Status update"));

    const store = getStore();
    const event = createStatusEvent({
      safety_code: safetyCode,
      water_code: waterCode,
      injury_code: injuryCode,
      people_count: peopleCount,
      latitude: loc?.latitude ?? null,
      longitude: loc?.longitude ?? null,
      landmark_name: landmark,
    });

    await store.insert(event);
    await broadcastEvent(event);

    // Persist so the next SOS can carry severity/status
    setLastStatus({ safety: safetyCode, water: waterCode, injury: injuryCode, people: peopleCount });
    if (landmarkName) setLandmark(landmarkName);

    return { success: true, event };
  }, [userLocation, userProfile, broadcastEvent]);

  /**
   * Dispatch Responder En Route to an incident
   */
  const dispatchResponder = useCallback(async ({ incidentId }) => {
    const store = getStore();
    const event = createResponderEnRouteEvent({
      incidentId,
      role: isRegistered() ? ACTOR_ROLE.REGISTERED_RESPONDER : ACTOR_ROLE.CIVILIAN_RESPONDER,
    });

    await store.insert(event);
    await broadcastEvent(event);

    return { success: true, event };
  }, [broadcastEvent]);

  /**
   * Mark an Incident as Resolved
   */
  const resolveIncident = useCallback(async (incidentId) => {
    const store = getStore();
    const event = createResolveEvent(incidentId);

    await store.insert(event);
    await broadcastEvent(event);

    const localActiveSosId = getActiveSosIncidentId();
    if (localActiveSosId && localActiveSosId === incidentId) {
      clearActiveSosIncidentId();
      setActiveSosState(null);
    }

    return { success: true, event };
  }, [broadcastEvent]);

  /**
   * Cancel own active SOS (victim-initiated, append-only)
   */
  const cancelSOS = useCallback(async () => {
    const activeId = getActiveSosIncidentId();
    if (!activeId) return { success: false, error: "No active SOS" };

    const store = getStore();
    const event = createCancelledEvent(activeId);
    await store.insert(event);
    await broadcastEvent(event);
    setActiveSosState(null);

    return { success: true, event };
  }, [broadcastEvent]);

  /**
   * Authenticate and Register as Responder
   */
  const loginResponder = useCallback(async ({ username, password }) => {
    try {
      const normalizedId = (username || "").trim().toUpperCase();
      const normalizedPin = (password || "").trim();
      let authResult = null;

      try {
        authResult = await loginOfficer(normalizedId, normalizedPin);
      } catch (e) {
        const cachedSession = await getResponderSession();
        const offlineId = process.env.EXPO_PUBLIC_OFFLINE_RESPONDER_ID || "RSP-001";
        const offlinePin = process.env.EXPO_PUBLIC_OFFLINE_RESPONDER_PIN || "1234";

        if (
          cachedSession &&
          cachedSession.responderId === normalizedId &&
          cachedSession.pin === normalizedPin
        ) {
          authResult = {
            authority_user_id: cachedSession.authorityUserId || normalizedId,
            assigned_zone_id: cachedSession.assignedZoneId || "ZONE-DEFAULT",
            token: cachedSession.token || "",
          };
        } else if (normalizedId === offlineId.toUpperCase() && normalizedPin === offlinePin) {
          authResult = {
            authority_user_id: normalizedId,
            assigned_zone_id: "ZONE-DEFAULT",
            token: "",
          };
        } else {
          throw e;
        }
      }

      const authorityUserId = authResult.user?.id || authResult.authority_user_id || normalizedId;
      const zoneId = authResult.user?.assigned_zone_id || authResult.assigned_zone_id || "ZONE-DEFAULT";

      registerAsResponder({
        authority_user_id: authorityUserId,
        assigned_zone_id: zoneId,
        token: authResult.token || "",
      });

      setActiveRoleState(ROLE.RESPONDER);
      setRegisteredState(true);
      setAssignedZoneIdState(zoneId);

      // Register this device with Command Center so dispatch can target it
      registerDevice(getNodeId(), authorityUserId).catch((e) =>
        console.log("[MeshSyncContext] device registration deferred:", e.message)
      );

      return {
        success: true,
        authorityUserId,
        assignedZoneId: zoneId,
        token: authResult.token || "",
      };
    } catch (error) {
      console.error("[MeshSyncContext] Responder login failed:", error);
      return { success: false, error: error.message || "Invalid credentials" };
    }
  }, []);

  /**
   * Reload local user profile from AsyncStorage into context
   */
  const refreshUserProfile = useCallback(async () => {
    try {
      const prof = await getProfile();
      setUserProfile(prof || null);
      return prof;
    } catch (e) {
      return null;
    }
  }, []);

  /**
   * Log out of responder session and reset role to CIVILIAN
   */
  const logoutResponder = useCallback(() => {
    deregisterResponder();
    setActiveRoleState(ROLE.CIVILIAN);
    setRegisteredState(false);
    setAssignedZoneIdState(null);
  }, []);

  /**
   * Switch active role between CIVILIAN and RESPONDER
   */
  const switchRole = useCallback((newRole) => {
    setActiveRole(newRole);
    setActiveRoleState(getActiveRole());
  }, []);

  // Deduplicated count of active emergencies by originating device
  const activeEmergencyCount = (incidents || []).filter(
    (i) => (i.report_type_code === 1 || i.reportTypeCode === 1) && (i.status_code === 1 || i.statusCode === 1)
  ).reduce((acc, inc) => {
    const creator = inc.creator_node_id || inc.creatorNodeId || inc.id;
    acc.add(creator);
    return acc;
  }, new Set()).size;

  const value = {
    // Reactive State
    incidents,
    responders,
    history,
    assignments,
    myEvents,
    relayedCount,
    peerCount,
    isOnline,
    userLocation,
    activeRole,
    isRegistered: registered,
    assignedZoneId,
    nodeId,
    userProfile,
    activeEmergencyCount,
    activeSosIncidentId,

    // Actions
    refreshLocation,
    refreshUserProfile,
    sendSOS,
    cancelSOS,
    reportHazard,
    updateMyStatus,
    dispatchResponder,
    resolveIncident,
    loginResponder,
    logoutResponder,
    switchRole,
  };

  return (
    <MeshSyncContext.Provider value={value}>
      {children}
    </MeshSyncContext.Provider>
  );
}

export function useMeshSync() {
  const context = useContext(MeshSyncContext);
  if (!context) {
    throw new Error("useMeshSync must be used within a MeshSyncProvider");
  }
  return context;
}
