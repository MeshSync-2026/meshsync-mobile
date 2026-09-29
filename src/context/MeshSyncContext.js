import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import NetInfo from "@react-native-community/netinfo";
import { getStore } from "../backend/store/eventStore";
import {
  initHotState,
  hydrateHotState,
  getNodeId,
  getActiveRole,
  setActiveRole,
  isRegistered,
  getAssignedZoneId,
  registerAsResponder,
  deregisterResponder,
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
} from "../backend/eventCreator";
import { clearActiveSosIncidentId, getActiveSosIncidentId } from "../backend/store/hotState";
import { getCurrentLocation, formatCoordinateLandmark } from "../utils/location";

const MeshSyncContext = createContext(null);

export function MeshSyncProvider({ children }) {
  const [incidents, setIncidents] = useState([]);
  const [responders, setResponders] = useState([]);
  const [history, setHistory] = useState([]);
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

  const bleTransportRef = useRef(null);
  const wsTransportRef = useRef(null);

  const refreshEventCounts = useCallback(async () => {
    try {
      const store = getStore();
      const allEvents = await store.getAll();
      const activeNodeId = getNodeId();
      const mine = allEvents.filter((e) => (e.origin_node_id || e.originNodeId) === activeNodeId);
      const relayed = allEvents.filter((e) => (e.origin_node_id || e.originNodeId) !== activeNodeId);
      setMyEvents(mine);
      setRelayedCount(relayed.length);
    } catch (err) {
      console.error("[MeshSyncContext] Error fetching events:", err);
    }
  }, []);

  // Initialize transports and subscriptions on mount
  useEffect(() => {
    let isMounted = true;
    let unsubscribeStore = () => {};
    let unsubscribeNet = () => {};
    let peerInterval = null;
    let stopCloudSync = () => {};
    let ble = null;
    let ws = null;

    const setup = async () => {
      // 0. Ensure persistent hot state is hydrated before reading node identity
      try {
        await hydrateHotState();
      } catch (e) {
        console.warn("[MeshSyncContext] hydrateHotState failed:", e);
      }

      const currentNodeId = getNodeId();
      if (!isMounted) return;

      setNodeIdState(currentNodeId);
      setActiveRoleState(getActiveRole());
      setRegisteredState(isRegistered());
      setAssignedZoneIdState(getAssignedZoneId());

      // Load user profile
      try {
        const prof = await getProfile();
        if (prof && isMounted) setUserProfile(prof);
      } catch (_) {}

      const store = getStore();

      // 1. Initial state hydration
      try {
        const initialProjection = await store.getProjection();
        if (initialProjection && isMounted) {
          setIncidents(initialProjection.incidents || []);
          setResponders(initialProjection.responders || []);
          setHistory(initialProjection.history || []);
        }
      } catch (err) {
        console.error("[MeshSyncContext] Error loading initial projection:", err);
      }
      await refreshEventCounts();

      if (!isMounted) return;

      // 2. Subscribe to store projection updates
      unsubscribeStore = store.subscribe((projection) => {
        if (!isMounted) return;
        setIncidents(projection?.incidents || []);
        setResponders(projection?.responders || []);
        setHistory(projection?.history || []);
        refreshEventCounts();
      });

      // 3. Initialize BLE and WebSocket transports with explicit Node ID
      try {
        ble = new BleTransport(currentNodeId, getActiveRole());
        bleTransportRef.current = ble;

        ble.onEventsReceived(() => {
          if (!isMounted) return;
          refreshEventCounts();
          store.getProjection().then((p) => {
            if (p && isMounted) {
              setIncidents(p.incidents || []);
              setResponders(p.responders || []);
              setHistory(p.history || []);
            }
          }).catch(() => {});
        });

        ble.start();
      } catch (bleErr) {
        console.warn("[MeshSyncContext] BLE init error:", bleErr);
      }

      try {
        ws = new WsTransport();
        wsTransportRef.current = ws;

        ws.onEventsReceived(() => {
          if (!isMounted) return;
          refreshEventCounts();
          store.getProjection().then((p) => {
            if (p && isMounted) {
              setIncidents(p.incidents || []);
              setResponders(p.responders || []);
              setHistory(p.history || []);
            }
          }).catch(() => {});
        });

        ws.start();
      } catch (wsErr) {
        console.warn("[MeshSyncContext] WS init error:", wsErr);
      }

      // 4. Track live peer counts
      peerInterval = setInterval(() => {
        const blePeers = ble && ble.getPeerCount ? ble.getPeerCount() : 0;
        const wsPeers = ws && ws.getPeerCount ? ws.getPeerCount() : 0;
        if (isMounted) {
          setPeerCount(blePeers + wsPeers);
        }
      }, 3000);

      // 5. Start Cloud Sync listener
      try {
        stopCloudSync = startCloudSync();
      } catch (csErr) {
        console.warn("[MeshSyncContext] CloudSync error:", csErr);
      }

      // 6. Monitor Internet connectivity
      try {
        unsubscribeNet = NetInfo.addEventListener((state) => {
          if (isMounted) {
            setIsOnline(Boolean(state.isConnected));
          }
        });
      } catch (_) {}

      // 7. Warm up GPS location without showing permission alert immediately
      getCurrentLocation({ showAlertOnDenied: false }).then((loc) => {
        if (loc && isMounted) setUserLocation(loc);
      }).catch(() => {});
    };

    setup();

    return () => {
      isMounted = false;
      unsubscribeStore();
      unsubscribeNet();
      if (peerInterval) clearInterval(peerInterval);
      stopCloudSync();
      if (ble) ble.stop();
      if (ws) ws.stop();
    };
  }, [refreshEventCounts]);

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
  const sendSOS = useCallback(async ({ landmarkName, victimName } = {}) => {
    const loc = (await getCurrentLocation({ showAlertOnDenied: false })) || userLocation;
    if (loc) {
      setUserLocation(loc);
    }

    const store = getStore();
    const resolvedVictim = victimName || userProfile?.fullName || userProfile?.name || "";
    const landmark = landmarkName || (loc ? (resolvedVictim ? `SOS: ${resolvedVictim}` : formatCoordinateLandmark(loc.latitude, loc.longitude)) : (resolvedVictim ? `SOS: ${resolvedVictim}` : (userProfile?.homeLandmark || userProfile?.landmark || "Emergency Assistance Needed")));
    
    const event = createSosEvent({
      latitude: loc?.latitude ?? null,
      longitude: loc?.longitude ?? null,
      landmarkName: landmark,
      victimName: resolvedVictim,
    });

    await store.insert(event);
    setMyEvents((prev) => [event, ...(prev || []).filter((e) => e.id !== event.id)]);
    await broadcastEvent(event);
    await refreshEventCounts();

    try {
      const proj = await store.getProjection();
      if (proj) {
        setIncidents(proj.incidents || []);
        setResponders(proj.responders || []);
        setHistory(proj.history || []);
      }
    } catch (_) {}

    return { success: true, event };
  }, [userLocation, userProfile, broadcastEvent, refreshEventCounts]);

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
    setMyEvents((prev) => [event, ...(prev || []).filter((e) => e.id !== event.id)]);
    await broadcastEvent(event);
    await refreshEventCounts();

    try {
      const proj = await store.getProjection();
      if (proj) {
        setIncidents(proj.incidents || []);
        setResponders(proj.responders || []);
        setHistory(proj.history || []);
      }
    } catch (_) {}

    return { success: true, event };
  }, [userLocation, userProfile, broadcastEvent, refreshEventCounts]);

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
    setMyEvents((prev) => [event, ...(prev || []).filter((e) => e.id !== event.id)]);
    await broadcastEvent(event);
    await refreshEventCounts();

    try {
      const proj = await store.getProjection();
      if (proj) {
        setIncidents(proj.incidents || []);
        setResponders(proj.responders || []);
        setHistory(proj.history || []);
      }
    } catch (_) {}

    return { success: true, event };
  }, [userLocation, userProfile, broadcastEvent, refreshEventCounts]);

  /**
   * Dispatch Responder En Route to an incident
   */
  const dispatchResponder = useCallback(async ({ incidentId, squadRoleCode }) => {
    const store = getStore();
    const event = createResponderEnRouteEvent({
      incident_id: incidentId,
      squad_role_code: squadRoleCode,
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
    }

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

      registerAsResponder({
        authority_user_id: authResult.authority_user_id || username,
        assigned_zone_id: authResult.assigned_zone_id || "ZONE-DEFAULT",
        token: authResult.token || "",
      });

      setActiveRoleState(ROLE.RESPONDER);
      setRegisteredState(true);
      setAssignedZoneIdState(authResult.assigned_zone_id || "ZONE-DEFAULT");

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

    // Actions
    refreshLocation,
    sendSOS,
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
