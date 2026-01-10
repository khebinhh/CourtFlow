import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  url: string,
  method: string,
  data?: unknown | undefined,
): Promise<any> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Handle query keys with objects (parameters)
    let url = "";
    if (typeof queryKey[0] === "string") {
      url = queryKey[0];
      // If there's a second element and it's an object, convert to query params
      if (queryKey[1] && typeof queryKey[1] === "object") {
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(queryKey[1] as Record<string, any>)) {
          if (value !== undefined && value !== null) {
            params.append(key, String(value));
          }
        }
        const queryString = params.toString();
        if (queryString) {
          url += `?${queryString}`;
        }
      }
    } else {
      // Fallback to joining strings
      url = queryKey.filter(k => typeof k === "string").join("/");
    }
    
    const res = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
