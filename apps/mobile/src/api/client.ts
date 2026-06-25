import type { ZodType } from "zod";
import { supabase } from "@/auth/supabase";
import { env } from "@/lib/env";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface RequestOptions<T> {
  body?: unknown;
  schema?: ZodType<T>;
  auth?: boolean;
}

async function request<T>(
  method: string,
  path: string,
  opts: RequestOptions<T> = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.auth === false ? {} : await authHeader()),
  };
  const res = await fetch(`${env.apiUrl}${path}`, {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  const json: unknown = text ? JSON.parse(text) : undefined;

  if (!res.ok) {
    const msg =
      (json as { message?: string; error?: string } | undefined)?.message ??
      (json as { error?: string } | undefined)?.error ??
      res.statusText;
    throw new ApiError(res.status, msg, json);
  }
  return opts.schema ? opts.schema.parse(json) : (json as T);
}

export const api = {
  get<T>(path: string, schema?: ZodType<T>, auth = true) {
    return request<T>("GET", path, { schema, auth });
  },
  post<T>(path: string, body?: unknown, schema?: ZodType<T>, auth = true) {
    return request<T>("POST", path, { body, schema, auth });
  },
  patch<T>(path: string, body?: unknown, schema?: ZodType<T>, auth = true) {
    return request<T>("PATCH", path, { body, schema, auth });
  },
};
