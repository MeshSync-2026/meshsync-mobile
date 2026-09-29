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
  ROLE,
} from "../backend/store/hotState";
import { BleTransport } from "../backend/transport/bleTransport";
import { WsTransport } from "../backend/transport/wsTransport";
import { startCloudSync, syncNow as triggerCloudSync } from "../backend/cloudSync";
import { loginOfficer } from "../backend/cloudApi";
import { getProfile } from "../utils/storage";
import {
  createSosEvent,
  createHazardEvent,
  createStatusEvent,
  createResponderEnRouteEvent,
  createResolveEvent,
  createCancelledEvent,
} from "../backend/eventCreator";
import { deriveSeverity } from "../backend/shared/severity";
import { ACTOR_ROLE } from "../backend/shared/enums";
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

    // Load user profile
    getProfile().then((prof) => {
      if (prof) setUserProfile(prof);
    }).catch(() => {});

    const store = getStore();

    const refreshEventCounts = async () => {
      try {
        const allEvents = await store.getAll();
        const mine = allEvents.filter((e) => (e.origin_node_id || e.originNodeId) === currentNodeId);
        const relayed = allEvents.filter((e) => (e.origin_node_id || e.originNodeId) !== currentNodeId);
        setMyEvents(mine);
        setRelayedCount(relayed.length);
      } catch (err) {
        console.error("[MeshSyncContext] Error fetching events:", err);
      }
    };

    // 1. Initial state hydration
    store.getProjection().then((initialProjection) => {
      if (initialProjection) {
        setIncidents(initialProjection.incidents || []);
        setResponders(initialProjection.responders || []);
        setHistory(initialProjection.history || []);
        setAssignments(initialProjection.assignments || []);
      }
      refreshEventCounts();
    }).catch((err) => {
      console.error("[MeshSyncContext] Error loading initial projection:", err);
      refreshEventCounts();
    });

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

    // 4. Track live peer counts
    const peerInterval = setInterval(() => {
      const blePeers = ble.getPeerCount ? ble.getPeerCount() : 0;
      const wsPeers = ws.getPeerCount ? ws.getPeerCount() : 0;
      setPeerCount(blePeers + wsPeers);
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
   * Broadcast an event across all active transports and trigger cloud sync
   */
  const broadcastEvent = useCallback(async (event) => {
    try {
      if (bleTransportRef.current) {
        await bleTransportRef.current.sendEvents([event]);
      }
      if (wsTransportRef.current) {
        wsTransportRef.current.send([event]);
      }
      // Opportunistic upload
      triggerCloudSync().catch(() => {});
    } catch (err) {
      console.error("[MeshSyncContext] Error broadcasting event:", err);
    }
  }, []);

  /**
   * Send Emergency SOS (Captures GPS coordinates if available, otherwise falls back to landmark / profile info)
   */
  const sendSOS = useCallback(async ({ landmarkName, victimName, force = false } = {}) => {
    // Severity comes from the victim's last My Status update (§3, severity extension).
    // If they reported Safe + Enough + Uninjured, there is nothing to escalate.
    const status = getLastStatus();
    let severityLevel = deriveSeverity(status);
    if (severityLevel === 0 && !force) {
      return { success: false, error: "no_sos_needed" };
    }
    if (severityLevel === 0) severityLevel = 1; // forced SOS defaults to LOW

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
      severityLevel,
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
  const loginResponder = useCallback(async ({ username, password, fallbackCredentials }) => {
    try {
      let authResult = null;
      try {
        authResult = await loginOfficer(username, password);
      } catch (e) {
        // Offline / mock credentials check
        if (
          fallbackCredentials &&
          username.toUpperCase() === fallbackCredentials.responderId &&
          password === fallbackCredentials.pin
        ) {
          authResult = {
            authority_user_id: username.toUpperCase(),
            assigned_zone_id: "ZONE-DEFAULT",
            token: "offline-mock-jwt-token",
          };
        } else {
          throw e;
        }
      }

      const authorityUserId = authResult.user?.id || authResult.authority_user_id || username;
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

      return { success: true };
    } catch (error) {
      console.error("[MeshSyncContext] Responder login failed:", error);
      return { success: false, error: error.message || "Invalid credentials" };
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
