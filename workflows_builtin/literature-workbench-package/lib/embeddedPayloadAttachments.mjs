import { requireHostApi } from "./runtime.mjs";

export const WORKBENCH_EMBEDDED_PAYLOAD_MARKER =
  "ZS_WORKBENCH_NOTE_PAYLOAD_V1:";
export const WORKBENCH_EMBEDDED_PAYLOAD_CHUNK = "zsPL";

const PAYLOAD_IMAGE_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAAsTAAALEwEAmpwYAAAJ9GlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNS42LWMxNDUgNzkuMTYzNDk5LCAyMDE4LzA4LzEzLTE2OjQwOjIyICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyIgeG1sbnM6cGhvdG9zaG9wPSJodHRwOi8vbnMuYWRvYmUuY29tL3Bob3Rvc2hvcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RFdnQ9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZUV2ZW50IyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTkgKFdpbmRvd3MpIiB4bXA6Q3JlYXRlRGF0ZT0iMjAyNi0wNS0yMFQyMjowODo0MCswODowMCIgeG1wOk1vZGlmeURhdGU9IjIwMjYtMDUtMjFUMDA6MDA6MDUrMDg6MDAiIHhtcDpNZXRhZGF0YURhdGU9IjIwMjYtMDUtMjFUMDA6MDA6MDUrMDg6MDAiIGRjOmZvcm1hdD0iaW1hZ2UvcG5nIiBwaG90b3Nob3A6Q29sb3JNb2RlPSIzIiBwaG90b3Nob3A6SUNDUHJvZmlsZT0ic1JHQiBJRUM2MTk2Ni0yLjEiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6ODlhNTNjMGYtMDBiMy1lYTQ5LWI3ZDAtODM5MDg0ZjJhYzc3IiB4bXBNTTpEb2N1bWVudElEPSJhZG9iZTpkb2NpZDpwaG90b3Nob3A6MDgwODY0ZDAtNmJmMi0zMTQ5LTk5YTctODYzMTY3YzRlNWVmIiB4bXBNTTpPcmlnaW5hbERvY3VtZW50SUQ9InhtcC5kaWQ6YzQzYzZkZDgtZGI3Yy0yYzQ4LWI4ZjctZjQyM2VlMmQ5OGUyIj4gPHhtcE1NOkhpc3Rvcnk+IDxyZGY6U2VxPiA8cmRmOmxpIHN0RXZ0OmFjdGlvbj0iY3JlYXRlZCIgc3RFdnQ6aW5zdGFuY2VJRD0ieG1wLmlpZDpjNDNjNmRkOC1kYjdjLTJjNDgtYjhmNy1mNDIzZWUyZDk4ZTIiIHN0RXZ0OndoZW49IjIwMjYtMDUtMjBUMjI6MDg6NDArMDg6MDAiIHN0RXZ0OnNvZnR3YXJlQWdlbnQ9IkFkb2JlIFBob3Rvc2hvcCBDQyAyMDE5IChXaW5kb3dzKSIvPiA8cmRmOmxpIHN0RXZ0OmFjdGlvbj0iY29udmVydGVkIiBzdEV2dDpwYXJhbWV0ZXJzPSJmcm9tIGltYWdlL3BuZyB0byBhcHBsaWNhdGlvbi92bmQuYWRvYmUucGhvdG9zaG9wIi8+IDxyZGY6bGkgc3RFdnQ6YWN0aW9uPSJzYXZlZCIgc3RFdnQ6aW5zdGFuY2VJRD0ieG1wLmlpZDoyNzFiM2YwZi0xMmU5LTFjNDAtODUwYS04MDY4Y2Y1YzM4MmMiIHN0RXZ0OndoZW49IjIwMjYtMDUtMjBUMjM6Mzg6MDcrMDg6MDAiIHN0RXZ0OnNvZnR3YXJlQWdlbnQ9IkFkb2JlIFBob3Rvc2hvcCBDQyAyMDE5IChXaW5kb3dzKSIgc3RFdnQ6Y2hhbmdlZD0iLyIvPiA8cmRmOmxpIHN0RXZ0Omluc3RhbmNlSUQ9InhtcC5paWQ6YzRkNzc5NWYtZmVlMi1iMDQzLTk1NmItYWMyYzg2NWMwOGNiIiBzdEV2dDp3aGVuPSIyMDI2LTA1LTIxVDAwOjAwOjA1KzA4OjAwIiBzdEV2dDpzb2Z0d2FyZUFnZW50PSJBZG9iZSBQaG90b3Nob3AgQ0MgMjAxOSAoV2luZG93cykiIHN0RXZ0OmNoYW5nZWQ9Ii8iLz4gPHJkZjpsaSBzdEV2dDphY3Rpb249ImNvbnZlcnRlZCIgc3RFdnQ6cGFyYW1ldGVycz0iZnJvbSBhcHBsaWNhdGlvbi92bmQuYWRvYmUucGhvdG9zaG9wIHRvIGltYWdlL3BuZyIvPiA8cmRmOmxpIHN0RXZ0OmFjdGlvbj0iZGVyaXZlZCIgc3RFdnQ6cGFyYW1ldGVycz0iY29udmVydGVkIGZyb20gYXBwbGljYXRpb24vdm5kLmFkb2JlLnBob3Rvc2hvcCB0byBpbWFnZS9wbmciLz4gPHJkZjpsaSBzdEV2dDphY3Rpb249InNhdmVkIiBzdEV2dDppbnN0YW5jZUlEPSJ4bXAuaWlkOjg5YTUzYzBmLTAwYjMtZWE0OS1iN2QwLTgzOTA4NGYyYWM3NyIgc3RFdnQ6d2hlbj0iMjAyNi0wNS0yMVQwMDowMDowNSswODowMCIgc3RFdnQ6c29mdHdhcmVBZ2VudD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTkgKFdpbmRvd3MpIiBzdEV2dDpjaGFuZ2VkPSIvIi8+IDwvcmRmOlNlcT4gPC94bXBNTTpIaXN0b3J5PiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDpjNGQ3Nzk1Zi1mZWUyLWIwNDMtOTU2Yi1hYzJjODY1YzA4Y2IiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6YzQzYzZkZDgtZGI3Yy0yYzQ4LWI4ZjctZjQyM2VlMmQ5OGUyIiBzdFJlZjpvcmlnaW5hbERvY3VtZW50SUQ9InhtcC5kaWQ6YzQzYzZkZDgtZGI3Yy0yYzQ4LWI4ZjctZjQyM2VlMmQ5OGUyIi8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+EN29wgAACL5JREFUWIWFl39wVNUVxz/3/dxkdxNDEkK0QXTUgYqISou/RRSsdVQoZSw69Ucda7GidhSnHZEidfAX4y+srRXUKopWQK3tdKrTKpXqiKUVW0EJQRETAmTzczfZ9/bde/rH280mSPDu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";
const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const PNG_IEND = "IEND";
const PAYLOAD_BADGE_IMAGE_BASE64 = [
  "iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAAsTAAALEwEAmpwYAAAJ9GlUWHRYTUw6Y29tLmFk",
  "b2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1w",
  "bWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNS42LWMxNDUgNzkuMTYzNDk5",
  "LCAyMDE4LzA4LzEzLTE2OjQwOjIyICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5",
  "OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXA9Imh0dHA6",
  "Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyIgeG1s",
  "bnM6cGhvdG9zaG9wPSJodHRwOi8vbnMuYWRvYmUuY29tL3Bob3Rvc2hvcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25z",
  "LmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RFdnQ9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9S",
  "ZXNvdXJjZUV2ZW50IyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJl",
  "ZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTkgKFdpbmRvd3MpIiB4bXA6Q3JlYXRlRGF0ZT0i",
  "MjAyNi0wNS0yMFQyMjowODo0MCswODowMCIgeG1wOk1vZGlmeURhdGU9IjIwMjYtMDUtMjFUMDA6MDA6MDUrMDg6MDAiIHht",
  "cDpNZXRhZGF0YURhdGU9IjIwMjYtMDUtMjFUMDA6MDA6MDUrMDg6MDAiIGRjOmZvcm1hdD0iaW1hZ2UvcG5nIiBwaG90b3No",
  "b3A6Q29sb3JNb2RlPSIzIiBwaG90b3Nob3A6SUNDUHJvZmlsZT0ic1JHQiBJRUM2MTk2Ni0yLjEiIHhtcE1NOkluc3RhbmNl",
  "SUQ9InhtcC5paWQ6ODlhNTNjMGYtMDBiMy1lYTQ5LWI3ZDAtODM5MDg0ZjJhYzc3IiB4bXBNTTpEb2N1bWVudElEPSJhZG9i",
  "ZTpkb2NpZDpwaG90b3Nob3A6MDgwODY0ZDAtNmJmMi0zMTQ5LTk5YTctODYzMTY3YzRlNWVmIiB4bXBNTTpPcmlnaW5hbERv",
  "Y3VtZW50SUQ9InhtcC5kaWQ6YzQzYzZkZDgtZGI3Yy0yYzQ4LWI4ZjctZjQyM2VlMmQ5OGUyIj4gPHhtcE1NOkhpc3Rvcnk+",
  "IDxyZGY6U2VxPiA8cmRmOmxpIHN0RXZ0OmFjdGlvbj0iY3JlYXRlZCIgc3RFdnQ6aW5zdGFuY2VJRD0ieG1wLmlpZDpjNDNj",
  "NmRkOC1kYjdjLTJjNDgtYjhmNy1mNDIzZWUyZDk4ZTIiIHN0RXZ0OndoZW49IjIwMjYtMDUtMjBUMjI6MDg6NDArMDg6MDAi",
  "IHN0RXZ0OnNvZnR3YXJlQWdlbnQ9IkFkb2JlIFBob3Rvc2hvcCBDQyAyMDE5IChXaW5kb3dzKSIvPiA8cmRmOmxpIHN0RXZ0",
  "OmFjdGlvbj0iY29udmVydGVkIiBzdEV2dDpwYXJhbWV0ZXJzPSJmcm9tIGltYWdlL3BuZyB0byBhcHBsaWNhdGlvbi92bmQu",
  "YWRvYmUucGhvdG9zaG9wIi8+IDxyZGY6bGkgc3RFdnQ6YWN0aW9uPSJzYXZlZCIgc3RFdnQ6aW5zdGFuY2VJRD0ieG1wLmlp",
  "ZDoyNzFiM2YwZi0xMmU5LTFjNDAtODUwYS04MDY4Y2Y1YzM4MmMiIHN0RXZ0OndoZW49IjIwMjYtMDUtMjBUMjM6Mzg6MDcr",
  "MDg6MDAiIHN0RXZ0OnNvZnR3YXJlQWdlbnQ9IkFkb2JlIFBob3Rvc2hvcCBDQyAyMDE5IChXaW5kb3dzKSIgc3RFdnQ6Y2hh",
  "bmdlZD0iLyIvPiA8cmRmOmxpIHN0RXZ0OmFjdGlvbj0ic2F2ZWQiIHN0RXZ0Omluc3RhbmNlSUQ9InhtcC5paWQ6YzRkNzc5",
  "NWYtZmVlMi1iMDQzLTk1NmItYWMyYzg2NWMwOGNiIiBzdEV2dDp3aGVuPSIyMDI2LTA1LTIxVDAwOjAwOjA1KzA4OjAwIiBz",
  "dEV2dDpzb2Z0d2FyZUFnZW50PSJBZG9iZSBQaG90b3Nob3AgQ0MgMjAxOSAoV2luZG93cykiIHN0RXZ0OmNoYW5nZWQ9Ii8i",
  "Lz4gPHJkZjpsaSBzdEV2dDphY3Rpb249ImNvbnZlcnRlZCIgc3RFdnQ6cGFyYW1ldGVycz0iZnJvbSBhcHBsaWNhdGlvbi92",
  "bmQuYWRvYmUucGhvdG9zaG9wIHRvIGltYWdlL3BuZyIvPiA8cmRmOmxpIHN0RXZ0OmFjdGlvbj0iZGVyaXZlZCIgc3RFdnQ6",
  "cGFyYW1ldGVycz0iY29udmVydGVkIGZyb20gYXBwbGljYXRpb24vdm5kLmFkb2JlLnBob3Rvc2hvcCB0byBpbWFnZS9wbmci",
  "Lz4gPHJkZjpsaSBzdEV2dDphY3Rpb249InNhdmVkIiBzdEV2dDppbnN0YW5jZUlEPSJ4bXAuaWlkOjg5YTUzYzBmLTAwYjMt",
  "ZWE0OS1iN2QwLTgzOTA4NGYyYWM3NyIgc3RFdnQ6d2hlbj0iMjAyNi0wNS0yMVQwMDowMDowNSswODowMCIgc3RFdnQ6c29m",
  "dHdhcmVBZ2VudD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTkgKFdpbmRvd3MpIiBzdEV2dDpjaGFuZ2VkPSIvIi8+IDwvcmRm",
  "OlNlcT4gPC94bXBNTTpIaXN0b3J5PiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDpjNGQ3",
  "Nzk1Zi1mZWUyLWIwNDMtOTU2Yi1hYzJjODY1YzA4Y2IiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6YzQzYzZkZDgtZGI3",
  "Yy0yYzQ4LWI4ZjctZjQyM2VlMmQ5OGUyIiBzdFJlZjpvcmlnaW5hbERvY3VtZW50SUQ9InhtcC5kaWQ6YzQzYzZkZDgtZGI3",
  "Yy0yYzQ4LWI4ZjctZjQyM2VlMmQ5OGUyIi8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8",
  "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",
].join("");

function normalizeText(value) {
  return String(value || "").trim();
}

function toUint8Array(value) {
  if (value instanceof Uint8Array) {
    return value;
  }
  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  return new Uint8Array();
}

function escapeAttribute(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function encodeUtf8Bytes(text, runtime) {
  const value = String(text || "");
  const Encoder =
    runtime?.TextEncoder ||
    (typeof globalThis?.TextEncoder === "function"
      ? globalThis.TextEncoder
      : null);
  if (Encoder) {
    return new Encoder().encode(value);
  }
  if (runtime?.Buffer && typeof runtime.Buffer.from === "function") {
    return new Uint8Array(runtime.Buffer.from(value, "utf8"));
  }
  const bytes = new Uint8Array(value.length);
  for (let index = 0; index < value.length; index += 1) {
    bytes[index] = value.charCodeAt(index) & 0xff;
  }
  return bytes;
}

function decodeUtf8Bytes(bytes, runtime) {
  const Decoder =
    runtime?.TextDecoder ||
    (typeof globalThis?.TextDecoder === "function"
      ? globalThis.TextDecoder
      : null);
  if (Decoder) {
    return new Decoder("utf-8").decode(bytes);
  }
  if (runtime?.Buffer && typeof runtime.Buffer.from === "function") {
    return runtime.Buffer.from(bytes).toString("utf8");
  }
  let text = "";
  for (const byte of bytes) {
    text += String.fromCharCode(byte);
  }
  return text;
}

function encodeBase64Utf8(text, runtime) {
  const value = String(text || "");
  if (runtime?.Buffer && typeof runtime.Buffer.from === "function") {
    return runtime.Buffer.from(value, "utf8").toString("base64");
  }
  const bytes = encodeUtf8Bytes(value, runtime);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  const btoaImpl =
    typeof runtime?.btoa === "function"
      ? runtime.btoa
      : typeof globalThis?.btoa === "function"
        ? globalThis.btoa.bind(globalThis)
        : null;
  if (!btoaImpl) {
    throw new Error("base64 encoder unavailable");
  }
  return btoaImpl(binary);
}

function decodeBase64Utf8(text, runtime) {
  const raw = normalizeText(text);
  if (!raw) {
    return "";
  }
  if (runtime?.Buffer && typeof runtime.Buffer.from === "function") {
    return runtime.Buffer.from(raw, "base64").toString("utf8");
  }
  const atobImpl =
    typeof runtime?.atob === "function"
      ? runtime.atob
      : typeof globalThis?.atob === "function"
        ? globalThis.atob.bind(globalThis)
        : null;
  if (!atobImpl) {
    throw new Error("base64 decoder unavailable");
  }
  const binary = atobImpl(raw);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return decodeUtf8Bytes(bytes, runtime);
}

function decodeBase64Bytes(text, runtime) {
  const raw = normalizeText(text);
  if (runtime?.Buffer && typeof runtime.Buffer.from === "function") {
    return new Uint8Array(runtime.Buffer.from(raw, "base64"));
  }
  const atobImpl =
    typeof runtime?.atob === "function"
      ? runtime.atob
      : typeof globalThis?.atob === "function"
        ? globalThis.atob.bind(globalThis)
        : null;
  if (!atobImpl) {
    throw new Error("base64 decoder unavailable");
  }
  const binary = atobImpl(raw);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function concatBytes(left, right) {
  const output = new Uint8Array(left.length + right.length);
  output.set(left, 0);
  output.set(right, left.length);
  return output;
}

function concatByteArrays(parts) {
  const length = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function indexOfBytes(haystack, needle) {
  if (!haystack.length || !needle.length || needle.length > haystack.length) {
    return -1;
  }
  outer: for (let index = 0; index <= haystack.length - needle.length; index += 1) {
    for (let inner = 0; inner < needle.length; inner += 1) {
      if (haystack[index + inner] !== needle[inner]) {
        continue outer;
      }
    }
    return index;
  }
  return -1;
}

function readUint32BE(bytes, offset) {
  return (
    ((bytes[offset] || 0) << 24) |
    ((bytes[offset + 1] || 0) << 16) |
    ((bytes[offset + 2] || 0) << 8) |
    (bytes[offset + 3] || 0)
  ) >>> 0;
}

function writeUint32BE(value) {
  const output = new Uint8Array(4);
  output[0] = (value >>> 24) & 0xff;
  output[1] = (value >>> 16) & 0xff;
  output[2] = (value >>> 8) & 0xff;
  output[3] = value & 0xff;
  return output;
}

let crcTable = null;

function getCrcTable() {
  if (crcTable) {
    return crcTable;
  }
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  crcTable = table;
  return table;
}

function crc32(bytes) {
  const table = getCrcTable();
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function hashPayloadText(value, runtime) {
  return crc32(encodeUtf8Bytes(value, runtime)).toString(16).padStart(8, "0");
}

function buildPngChunk(type, data, runtime) {
  const typeBytes = encodeUtf8Bytes(type, runtime);
  const crcInput = concatByteArrays([typeBytes, data]);
  return concatByteArrays([
    writeUint32BE(data.length),
    typeBytes,
    data,
    writeUint32BE(crc32(crcInput)),
  ]);
}

function isPng(bytes) {
  if (bytes.length < PNG_SIGNATURE.length) {
    return false;
  }
  for (let index = 0; index < PNG_SIGNATURE.length; index += 1) {
    if (bytes[index] !== PNG_SIGNATURE[index]) {
      return false;
    }
  }
  return true;
}

function decodeAsciiBytes(bytes) {
  let text = "";
  for (const byte of bytes) {
    text += String.fromCharCode(byte);
  }
  return text;
}

function findPngChunk(bytes, type) {
  if (!isPng(bytes)) {
    return null;
  }
  let cursor = PNG_SIGNATURE.length;
  while (cursor + 12 <= bytes.length) {
    const length = readUint32BE(bytes, cursor);
    const typeStart = cursor + 4;
    const dataStart = typeStart + 4;
    const next = dataStart + length + 4;
    if (next > bytes.length) {
      return null;
    }
    const chunkType = decodeAsciiBytes(bytes.slice(typeStart, dataStart));
    if (chunkType === type) {
      return bytes.slice(dataStart, dataStart + length);
    }
    if (chunkType === PNG_IEND) {
      return null;
    }
    cursor = next;
  }
  return null;
}

function buildPayloadEnvelope(args, runtime) {
  const payloadText = JSON.stringify(args?.payload ?? null);
  return {
    schemaVersion: 1,
    payloadStorageVersion: 2,
    kind: "zotero-skills-workbench-note-payload",
    createdAt: new Date().toISOString(),
    noteId: args?.noteId || null,
    noteKey: normalizeText(args?.noteKey),
    parentId: args?.parentId || null,
    noteKind: normalizeText(args?.noteKind),
    payloadType: normalizeText(args?.payloadType),
    payloadHash: hashPayloadText(payloadText, runtime),
    payload: args?.payload,
  };
}

async function buildPayloadImageBytes(envelope, runtime) {
  const imageBytes = decodeBase64Bytes(PAYLOAD_BADGE_IMAGE_BASE64, runtime);
  const payloadBytes = encodeUtf8Bytes(JSON.stringify(envelope), runtime);
  const chunk = buildPngChunk(WORKBENCH_EMBEDDED_PAYLOAD_CHUNK, payloadBytes, runtime);
  let cursor = PNG_SIGNATURE.length;
  while (cursor + 12 <= imageBytes.length) {
    const length = readUint32BE(imageBytes, cursor);
    const typeStart = cursor + 4;
    const dataStart = typeStart + 4;
    const next = dataStart + length + 4;
    if (next > imageBytes.length) {
      break;
    }
    const chunkType = decodeAsciiBytes(imageBytes.slice(typeStart, dataStart));
    if (chunkType === PNG_IEND) {
      return concatByteArrays([imageBytes.slice(0, cursor), chunk, imageBytes.slice(cursor)]);
    }
    cursor = next;
  }
  throw new Error("payload base PNG is missing IEND chunk");
}

function parsePayloadEnvelopeFromBytes(bytes, runtime) {
  const v2Chunk = findPngChunk(bytes, WORKBENCH_EMBEDDED_PAYLOAD_CHUNK);
  if (v2Chunk) {
    return {
      sourceStorage: "embedded-image-attachment-v2",
      payloadStorageVersion: 2,
      envelope: JSON.parse(decodeUtf8Bytes(v2Chunk, runtime)),
    };
  }
  const marker = encodeUtf8Bytes(WORKBENCH_EMBEDDED_PAYLOAD_MARKER, runtime);
  const start = indexOfBytes(bytes, marker);
  if (start < 0) {
    return null;
  }
  let cursor = start + marker.length;
  while (
    cursor < bytes.length &&
    (bytes[cursor] === 0x20 || bytes[cursor] === 0x09)
  ) {
    cursor += 1;
  }
  let end = cursor;
  while (
    end < bytes.length &&
    bytes[end] !== 0x0a &&
    bytes[end] !== 0x0d &&
    bytes[end] !== 0x00
  ) {
    end += 1;
  }
  const encodedPayload = decodeUtf8Bytes(bytes.slice(cursor, end), runtime);
  return {
    sourceStorage: "embedded-image-attachment-v1",
    payloadStorageVersion: 1,
    envelope: JSON.parse(decodeBase64Utf8(encodedPayload, runtime)),
  };
}

export function parseWorkbenchEmbeddedPayloadBytes(value, runtime) {
  const bytes = toUint8Array(value);
  const parsedEnvelope = parsePayloadEnvelopeFromBytes(bytes, runtime);
  if (!parsedEnvelope) {
    return null;
  }
  const envelope = parsedEnvelope.envelope;
  if (Number(envelope?.schemaVersion) !== 1) {
    throw new Error("unsupported workbench embedded payload schema version");
  }
  if (envelope?.kind !== "zotero-skills-workbench-note-payload") {
    throw new Error("unsupported workbench embedded payload kind");
  }
  const payloadType = normalizeText(envelope?.payloadType);
  if (!payloadType) {
    throw new Error("workbench embedded payload type is missing");
  }
  return {
    marker: WORKBENCH_EMBEDDED_PAYLOAD_MARKER,
    schemaVersion: 1,
    payloadStorageVersion:
      Number(envelope?.payloadStorageVersion) || parsedEnvelope.payloadStorageVersion,
    sourceStorage: parsedEnvelope.sourceStorage,
    payloadHash: normalizeText(envelope?.payloadHash),
    noteKind: normalizeText(envelope?.noteKind),
    payloadType,
    payload: envelope?.payload,
    envelope,
  };
}

function collectPayloadAnchors(note) {
  const html = String(note?.getNote?.() || "");
  const anchors = new Map();
  const pattern = /<img\b[^>]*\bdata-zs-payload-anchor\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))[^>]*>/gi;
  for (const match of html.matchAll(pattern)) {
    const tag = match[0];
    const payloadType = normalizeText(match[1] || match[2] || match[3]);
    const keyMatch = tag.match(
      /\bdata-attachment-key\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i,
    );
    const attachmentKey = normalizeText(keyMatch?.[1] || keyMatch?.[2] || keyMatch?.[3]);
    if (payloadType) {
      anchors.set(payloadType, attachmentKey);
    }
  }
  return anchors;
}

function projectPayloadBlock(parsed, attachment, anchors) {
  const payload = parsed?.payload;
  const payloadType = normalizeText(parsed?.payloadType);
  const format =
    normalizeText(payload?.format) ||
    (payloadType.endsWith("-markdown")
      ? "markdown"
      : payloadType.endsWith("-json")
        ? "json"
        : "text");
  const decodedText =
    format === "markdown"
      ? String(payload?.content || "")
      : format === "json"
        ? JSON.stringify(payload || {})
        : String(payload?.content || payload || "");
  return {
    source: "embedded-image-attachment",
    sourceStorage: parsed?.sourceStorage || "embedded-image-attachment-v1",
    payloadStorageVersion: Number(parsed?.payloadStorageVersion) || 1,
    payloadHash: normalizeText(parsed?.payloadHash) || undefined,
    anchorStatus: anchors?.has(payloadType)
      ? anchors.get(payloadType) === normalizeText(attachment?.key)
        ? "present"
        : "stale"
      : "missing",
    payloadType,
    noteKind: normalizeText(parsed?.noteKind),
    version: "1",
    encoding: "embedded-image-attachment",
    encodedValue: "",
    decodedText,
    estimatedSize: decodedText.length,
    payload,
    markdown: format === "markdown" ? String(payload?.content || "") : undefined,
    format,
    attachmentKey: normalizeText(attachment?.key),
    attachmentId: attachment?.id || null,
  };
}

async function readAttachmentBytes(runtime, attachment) {
  const host = requireHostApi(runtime);
  const filePath = normalizeText(await attachment?.getFilePathAsync?.());
  if (!filePath) {
    throw new Error("embedded payload attachment path is missing");
  }
  if (typeof host.file?.readBytes !== "function") {
    throw new Error("host file.readBytes is unavailable");
  }
  return host.file.readBytes(filePath);
}

function resolveChildAttachment(runtime, ref) {
  try {
    if (runtime?.helpers?.resolveItemRef) {
      return runtime.helpers.resolveItemRef(ref);
    }
  } catch {
    return null;
  }
  try {
    return globalThis?.Zotero?.Items?.get?.(Number(ref)) || null;
  } catch {
    return null;
  }
}

export async function listWorkbenchEmbeddedPayloadBlocksForNote(args) {
  const runtime = args?.runtime;
  const note = args?.noteItem || args?.note;
  const attachmentIds =
    typeof note?.getAttachments === "function" ? note.getAttachments() || [] : [];
  const anchors = collectPayloadAnchors(note);
  const blocks = [];
  for (const attachmentRef of attachmentIds) {
    const attachment = resolveChildAttachment(runtime, attachmentRef);
    if (!attachment) {
      continue;
    }
    try {
      const bytes = await readAttachmentBytes(runtime, attachment);
      const parsed = parseWorkbenchEmbeddedPayloadBytes(bytes, runtime);
      if (parsed) {
        blocks.push(projectPayloadBlock(parsed, attachment, anchors));
      }
    } catch {
      // Ignore non-payload images and unreadable optional payload candidates here.
    }
  }
  return blocks;
}

function stripPayloadAnchorForType(noteContent, payloadType) {
  const escaped = String(payloadType || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return String(noteContent || "").replace(
    new RegExp(
      `<img\\b(?=[^>]*\\bdata-zs-payload-anchor\\s*=\\s*(?:"${escaped}"|'${escaped}'|${escaped}))(?:[^>]*?)>`,
      "gi",
    ),
    "",
  );
}

function appendPayloadAnchor(noteContent, payloadType, attachmentKey) {
  const stripped = stripPayloadAnchorForType(noteContent, payloadType);
  const anchor = `<img data-attachment-key="${escapeAttribute(attachmentKey)}" data-zs-payload-anchor="${escapeAttribute(payloadType)}" alt="ZA" title="Zotero Agents artifact payload" width="32" height="32">`;
  const block = `<p data-zs-payload-anchor-container="1">${anchor}</p>`;
  if (/<\/div>\s*$/i.test(stripped)) {
    return stripped.replace(/<\/div>\s*$/i, `${block}</div>`);
  }
  return `${stripped}\n${block}`;
}

export async function resolveWorkbenchEmbeddedPayloadBlock(args) {
  const payloadType = normalizeText(args?.payloadType);
  const blocks = await listWorkbenchEmbeddedPayloadBlocksForNote(args);
  if (!payloadType) {
    return blocks[0] || null;
  }
  return blocks.find((entry) => entry.payloadType === payloadType) || null;
}

export async function attachWorkbenchPayloadToNote(args) {
  const runtime = args?.runtime;
  const host = requireHostApi(runtime);
  const note = args?.note;
  const payloadType = normalizeText(args?.payloadType);
  const noteKind = normalizeText(args?.noteKind);
  if (!note || typeof note.getNote !== "function") {
    throw new Error("workbench payload note is missing");
  }
  if (!payloadType) {
    throw new Error("workbench payload type is missing");
  }
  if (typeof host.notes?.importEmbeddedImage !== "function") {
    throw new Error("host notes.importEmbeddedImage is unavailable");
  }
  const previous = (await listWorkbenchEmbeddedPayloadBlocksForNote({
    runtime,
    noteItem: note,
  })).filter((entry) => entry.payloadType === payloadType);
  const envelope = buildPayloadEnvelope({
    noteId: note.id || null,
    noteKey: note.key,
    parentId: note.parentID || note.parentItemID || null,
    noteKind,
    payloadType,
    payload: args?.payload,
  }, runtime);
  const bytes = await buildPayloadImageBytes(envelope, runtime);
  const imported = await host.notes.importEmbeddedImage(note, {
    bytes,
    mimeType: "image/png",
    width: 32,
    height: 32,
    originalBytes: bytes.length,
    compressedBytes: bytes.length,
    fileName: `zs-workbench-payload-${payloadType}.png`,
    diagnostics: {
      workbenchPayload: true,
      marker: WORKBENCH_EMBEDDED_PAYLOAD_MARKER,
      payloadType,
    },
  });
  const attachmentKey = normalizeText(imported?.attachmentKey);
  if (attachmentKey && typeof host.notes?.update === "function") {
    await host.notes.update(note, {
      content: appendPayloadAnchor(note.getNote?.() || "", payloadType, attachmentKey),
    });
  }
  for (const old of previous) {
    if (!old.attachmentKey || old.attachmentKey === attachmentKey) {
      continue;
    }
    try {
      const attachment = host.items?.getByLibraryAndKey?.(
        note.libraryID,
        old.attachmentKey,
      );
      if (attachment && attachment.parentID === note.id) {
        await host.attachments?.remove?.(attachment);
      }
    } catch {
      // Best-effort cleanup only.
    }
  }
  return {
    status: "attached",
    payloadType,
    noteKind,
    attachmentKey,
    payloadStorageVersion: 2,
    payloadHash: envelope.payloadHash,
    anchorStatus: attachmentKey ? "present" : "missing",
    bytes: bytes.length,
  };
}
