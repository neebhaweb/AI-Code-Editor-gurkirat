import { create } from "zustand";
import {
  loadFiles,
  saveFiles,
  saveChange,
  loadChanges,
  clearChanges,
  saveAICache,
  loadAICache,
} from "./db";
import Peer from "peerjs";
import axios from "axios";

export const useStore = create((set, get) => ({
  files: [],
  activeFileId: null,
  peers: [],
  peerId: null,
  connections: [],
  peer: null,
  lastUpdate: 0,
  isOnline: navigator.onLine,
  suggestions: [],
  init: async () => {
    const savedFiles = await loadFiles();
    const initialFiles =
      savedFiles && savedFiles.length > 0
        ? savedFiles.map((file, index) => ({
            ...file,
            name: `file${index + 1}`, 
          }))
        : [
            {
              id: "1",
              name: "file1",
              content: "// Start coding here",
              version: 0,
            },
          ];

    const peer = new Peer();
    peer.on("open", (id) => {
      set({ peerId: id, peer });
      console.log("My Peer ID:", id);
      if (navigator.onLine) get().syncOfflineChanges();
    });

    peer.on("connection", (conn) => {
      const currentConnections = get().connections;
      set({
        connections: [...currentConnections, conn],
        peers: [...currentConnections, conn.peer],
      });

      conn.on("open", () => {
        conn.send({
          type: "init",
          files: get().files,
          lastUpdate: get().lastUpdate,
        });
      });

      conn.on("data", (data) => {
        if (data.type === "init") {
          const remoteFiles = data.files;
          const remoteUpdate = data.lastUpdate;
          if (remoteUpdate > get().lastUpdate) {
            set({
              files: remoteFiles,
              activeFileId: remoteFiles[0]?.id || null,
              lastUpdate: remoteUpdate,
            });
            saveFiles(remoteFiles);
          }
        } else if (data.type === "content") {
          const { fileId, content, version } = data;
          if (
            version > (get().files.find((f) => f.id === fileId)?.version || 0)
          ) {
            set((state) => {
              const newFiles = state.files.map((file) =>
                file.id === fileId ? { ...file, content, version } : file
              );
              saveFiles(newFiles);
              return { files: newFiles, lastUpdate: version };
            });
          }
        } else if (data.type === "delete") {
          const { fileId } = data;
          set((state) => {
            const newFiles = state.files.filter((file) => file.id !== fileId);
            const newActiveFileId =
              state.activeFileId === fileId && newFiles.length > 0
                ? newFiles[0].id
                : state.activeFileId;
            saveFiles(newFiles);
            return {
              files: newFiles,
              activeFileId: newActiveFileId,
              lastUpdate: Date.now(),
            };
          });
        }
      });

      conn.on("close", () => {
        set((state) => ({
          connections: state.connections.filter((c) => c.peer !== conn.peer),
          peers: state.peers.filter((p) => p !== conn.peer),
        }));
      });
    });

    window.addEventListener("online", () => {
      set({ isOnline: true });
      get().syncOfflineChanges();
    });
    window.addEventListener("offline", () => set({ isOnline: false }));

    set({
      files: initialFiles,
      activeFileId: initialFiles[0].id,
      lastUpdate: Date.now(),
    });
  },
  connectToPeer: (peerId) => {
    const peer = get().peer;
    if (!peer || peer.destroyed || !get().peerId) {
      console.error("PeerJS not ready yet. Please wait for Peer ID.");
      return;
    }

    const conn = peer.connect(peerId);
    conn.on("open", () => {
      set((state) => ({
        connections: [...state.connections, conn],
        peers: [...state.peers, peerId],
      }));
      conn.send({
        type: "init",
        files: get().files,
        lastUpdate: get().lastUpdate,
      });
    });

    conn.on("data", (data) => {
      if (data.type === "init") {
        const remoteFiles = data.files;
        const remoteUpdate = data.lastUpdate;
        if (remoteUpdate > get().lastUpdate) {
          set({
            files: remoteFiles,
            activeFileId: remoteFiles[0]?.id || null,
            lastUpdate: remoteUpdate,
          });
          saveFiles(remoteFiles);
        }
      } else if (data.type === "content") {
        const { fileId, content, version } = data;
        if (
          version > (get().files.find((f) => f.id === fileId)?.version || 0)
        ) {
          set((state) => {
            const newFiles = state.files.map((file) =>
              file.id === fileId ? { ...file, content, version } : file
            );
            saveFiles(newFiles);
            return { files: newFiles, lastUpdate: version };
          });
        }
      } else if (data.type === "delete") {
        const { fileId } = data;
        set((state) => {
          const newFiles = state.files.filter((file) => file.id !== fileId);
          const newActiveFileId =
            state.activeFileId === fileId && newFiles.length > 0
              ? newFiles[0].id
              : state.activeFileId;
          saveFiles(newFiles);
          return {
            files: newFiles,
            activeFileId: newActiveFileId,
            lastUpdate: Date.now(),
          };
        });
      }
    });

    conn.on("close", () => {
      set((state) => ({
        connections: state.connections.filter((c) => c.peer !== conn.peer),
        peers: state.peers.filter((p) => p !== conn.peer),
      }));
    });
  },
  addFile: () =>
    set((state) => {
      const newId = String(Date.now()); 
      const fileCount = state.files.length + 1; 
      const newFiles = [
        ...state.files,
        { id: newId, name: `file${fileCount}`, content: "", version: 0 },
      ];
      const newUpdate = Date.now();
      saveFiles(newFiles);
      if (state.isOnline) {
        state.connections.forEach((conn) =>
          conn.send({ type: "init", files: newFiles, lastUpdate: newUpdate })
        );
      }
      return { files: newFiles, activeFileId: newId, lastUpdate: newUpdate };
    }),
  setActiveFile: (id) => set({ activeFileId: id }),
  updateFileContent: (id, content) =>
    set((state) => {
      const file = state.files.find((f) => f.id === id);
      const newVersion = (file?.version || 0) + 1;
      const newFiles = state.files.map((file) =>
        file.id === id ? { ...file, content, version: newVersion } : file
      );
      const newUpdate = Date.now();

      saveFiles(newFiles);
      if (!state.isOnline) {
        saveChange({
          fileId: id,
          content,
          version: newVersion,
          timestamp: newUpdate,
        });
      } else {
        state.connections.forEach((conn) =>
          conn.send({
            type: "content",
            fileId: id,
            content,
            version: newVersion,
          })
        );
      }
      return { files: newFiles, lastUpdate: newUpdate };
    }),
  deleteFile: (fileId) =>
    set((state) => {
      const newFiles = state.files.filter((file) => file.id !== fileId);
      const newActiveFileId =
        state.activeFileId === fileId && newFiles.length > 0
          ? newFiles[0].id
          : state.activeFileId;
      const newUpdate = Date.now();

      saveFiles(newFiles);
      if (state.isOnline) {
        state.connections.forEach((conn) =>
          conn.send({ type: "delete", fileId })
        );
      }
      return {
        files: newFiles,
        activeFileId: newActiveFileId,
        lastUpdate: newUpdate,
      };
    }),
  syncOfflineChanges: async () => {
    const changes = await loadChanges();
    if (changes.length === 0) return;

    set((state) => {
      let newFiles = [...state.files];
      changes.forEach((change) => {
        const existingFile = newFiles.find((f) => f.id === change.fileId);
        if (existingFile && change.version > existingFile.version) {
          newFiles = newFiles.map((file) =>
            file.id === change.fileId
              ? { ...file, content: change.content, version: change.version }
              : file
          );
        }
      });
      const newUpdate = Date.now();
      saveFiles(newFiles);
      if (state.isOnline && state.connections.length > 0) {
        state.connections.forEach((conn) =>
          conn.send({ type: "init", files: newFiles, lastUpdate: newUpdate })
        );
      }
      clearChanges();
      return { files: newFiles, lastUpdate: newUpdate };
    });
  },
  fetchSuggestions: async (fileId, content) => {
    const cacheKey = `${fileId}-${content.slice(-50)}`;
    const cached = await loadAICache(cacheKey);
    if (cached) {
      set({ suggestions: cached });
      return;
    }

    if (!get().isOnline) {
      set({ suggestions: ["Offline - No suggestions available"] });
      return;
    }

    try {
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: "You are a code completion assistant." },
            {
              role: "user",
              content: `Suggest code completions for:\n${content}`,
            },
          ],
          max_tokens: 50,
        },
        {
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );
      const suggestions = response.data.choices.map((choice) =>
        choice.message.content.trim()
      );
      set({ suggestions });
      await saveAICache(cacheKey, suggestions);
    } catch (e) {
      console.error("Failed to fetch AI suggestions", e);
      if (e.response?.status === 429) {
        set({ suggestions: ["Rate limit exceeded - Try again later"] });
      } else {
        set({ suggestions: ["Error fetching suggestions"] });
      }
    }
  },
}));
