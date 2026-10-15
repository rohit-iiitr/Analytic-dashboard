"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useToast } from "./ToastContext";

const SavedReposContext = createContext(null);

export function SavedReposProvider({ children }) {
  const notify = useToast();
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState(null);
  const [pending, setPending] = useState({});

  const load = useCallback(async (signal) => {
    setStatus("loading");
    setError(null);
    try {
      const data = await api.getSaved(signal);
      setItems(data.items);
      setStatus("ready");
    } catch (err) {
      if (err.name === "AbortError") return;
      setError(err);
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const byGithubId = useMemo(() => new Map(items.map((item) => [item.githubId, item])), [items]);

  const setPendingFor = (key, value) =>
    setPending((current) => {
      const next = { ...current };
      if (value) next[key] = true;
      else delete next[key];
      return next;
    });

  const save = useCallback(
    async (repo) => {
      setPendingFor(repo.id, true);
      try {
        const saved = await api.saveRepo(repo.owner.login, repo.name);
        setItems((current) => [saved, ...current.filter((item) => item.githubId !== saved.githubId)]);
        notify(`Saved ${saved.fullName}`, "success");
      } catch (err) {
        notify(err.message, err.code === "ALREADY_SAVED" ? "info" : "error");
        if (err.code === "ALREADY_SAVED") load();
      } finally {
        setPendingFor(repo.id, false);
      }
    },
    [load, notify]
  );

  const remove = useCallback(
    async (savedItem) => {
      setPendingFor(savedItem.githubId, true);
      try {
        await api.removeSaved(savedItem.id);
        setItems((current) => current.filter((item) => item.id !== savedItem.id));
        notify(`Removed ${savedItem.fullName}`, "success");
      } catch (err) {
        if (err.code === "SAVED_NOT_FOUND") {
          setItems((current) => current.filter((item) => item.id !== savedItem.id));
        }
        notify(err.message, "error");
      } finally {
        setPendingFor(savedItem.githubId, false);
      }
    },
    [notify]
  );

  const value = useMemo(
    () => ({
      items,
      status,
      error,
      reload: load,
      save,
      remove,
      getSaved: (githubId) => byGithubId.get(githubId) ?? null,
      isPending: (githubId) => Boolean(pending[githubId]),
    }),
    [items, status, error, load, save, remove, byGithubId, pending]
  );

  return <SavedReposContext.Provider value={value}>{children}</SavedReposContext.Provider>;
}

export const useSavedRepos = () => {
  const context = useContext(SavedReposContext);
  if (!context) throw new Error("useSavedRepos must be used inside SavedReposProvider");
  return context;
};
