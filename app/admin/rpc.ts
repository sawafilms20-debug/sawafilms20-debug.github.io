"use client";

/* Browser client for /api/rk.

   Every call is a POST with a JSON body and returns `data` or throws an
   RpcError carrying the server's Arabic message — so a section never has to
   invent its own wording for a failure the server already explained. */

export class RpcError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export async function call<T = unknown>(
  router: string,
  procedure: string,
  input?: unknown
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/rk/${router}/${procedure}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input ?? {}),
    });
  } catch {
    throw new RpcError("NETWORK", "تعذّر الاتصال بالخادم. تحققي من الشبكة.", 0);
  }

  let payload: { data?: T; error?: { code: string; message: string } } = {};
  try {
    payload = await res.json();
  } catch {
    /* an empty or non-JSON body is handled by the status check below */
  }

  if (!res.ok || payload.error) {
    throw new RpcError(
      payload.error?.code || "HTTP_ERROR",
      payload.error?.message || `فشل الطلب (${res.status})`,
      res.status
    );
  }
  return payload.data as T;
}

type ProcedureFn = <T = unknown>(input?: unknown) => Promise<T>;
type RouterProxy = Record<string, ProcedureFn>;

/** `rpc.articles.list({ page: 1 })` — thin sugar over `call`. */
export const rpc: Record<string, RouterProxy> = new Proxy({} as Record<string, RouterProxy>, {
  get(_target, router: string) {
    return new Proxy({} as RouterProxy, {
      get(_t, procedure: string) {
        return (input?: unknown) => call(router, procedure, input);
      },
    });
  },
});

export type UploadedAsset = {
  id: number;
  storageKey: string;
  url: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
};

export async function uploadFile(file: File, altAr?: string): Promise<UploadedAsset> {
  const form = new FormData();
  form.append("file", file);
  if (altAr) form.append("altAr", altAr);
  const res = await fetch("/api/admin/upload", {
    method: "POST",
    credentials: "include",
    body: form,
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new RpcError("UPLOAD", payload.error || `فشل الرفع (${res.status})`, res.status);
  }
  return payload.data as UploadedAsset;
}
