/* eslint-disable @typescript-eslint/no-explicit-any */
class HttpStatus {
  public readonly code: number;
  public readonly message: string;
  constructor(code: number, message: string) {
    this.message = message;
    this.code = code;
  }
  static fromResponse({status: code, statusText: message}: Response): HttpStatus {
    return new HttpStatus(code, message);
  }
}

interface HttpOptions extends RequestInit {
  memorize?: boolean;
}
const HttpMemorize = Symbol("HttpMemorize");

async function http<T>(url: URL, options?: HttpOptions): Promise<T>;
async function http<T>(string: string, options?: HttpOptions): Promise<T>;
async function http<T>(stringOrUrl: string | URL, options?: HttpOptions): Promise<T> {
  if (stringOrUrl instanceof URL) stringOrUrl = stringOrUrl.toString();
  if ((http as any)[HttpMemorize] == undefined) (http as any)[HttpMemorize] = new Map();
  const map = (http as any)[HttpMemorize] as Map<string, T>;
  const key = JSON.stringify({url: stringOrUrl, options});
  if (options?.memorize && map.has(key)) return Promise.resolve(map.get(key) as T)!;
  const response = await fetch(stringOrUrl, options);
  if (response.status > 299) throw new HttpError(await response.text(), response);
  const data = await response.json();
  if (options?.memorize) map.set(key, data);
  return data;
}

export class HttpError extends Error {
  public readonly status: HttpStatus;
  constructor(message: string, response: Response);
  constructor(message: string, status: number, statusMessage: string);
  constructor(message: string, statusCodeOrResponse: number | Response, statusMessage?: string) {
    super(message);
    this.status = statusCodeOrResponse instanceof Response ? HttpStatus.fromResponse(statusCodeOrResponse) : new HttpStatus(statusCodeOrResponse, statusMessage || "");
  }
}

export const ModalService = {
  async load(name: string): Promise<{name: string; props: object}> {
    const url = new URL("http://localhost:8080/api/modal.get");
    url.searchParams.append("name", name);
    return http(url, {memorize: true});
  },
};

export type NavigationRoute = {name: string; path: string; component: string};
export type NavigationRoutes = Array<NavigationRoute>;
export type AppRouting = {key: string; routes: Array<NavigationRoute>};
export const Navigation = {
  async load(key: string): Promise<AppRouting> {
    const url = new URL("http://localhost:8080/api/navigation.get");
    url.searchParams.append("navigation", key);
    return http(url, {memorize: true});
  },
};
