import useSWR from "swr";
import { Stat } from "../app/api/stats/route";

const fetcher = (...args: Parameters<typeof fetch>) =>
  fetch(...args).then((res) => res.json());

function useStats() {
  const { data, error, isLoading, mutate } = useSWR<Stat[]>(
    "/api/stats",
    fetcher,
  );
  return {
    stats: data || [],
    statsLoading: isLoading,
    statsError: error,
    mutateStats: mutate,
  };
}

export { useStats };
