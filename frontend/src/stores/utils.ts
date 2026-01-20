import { Result } from "unwrapped/core";

export async function fetchJSON<T>(url: string): Promise<Result<T>> {
    const response = await fetch(url);
    if (!response.ok) {
        return Result.errTag(`fetch-failed`, response.statusText);
    }
    const json = await response.json();
    return Result.ok(json as T);
}