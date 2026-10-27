const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `Request failed (${response.status})`);
  }
  return response;
}

export async function transcribeAudio(file, token) {
  const body = new FormData();
  body.append("file", file);

  const response = await request("/transcribe", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body,
  });

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const payload = await response.json();
    return {
      midiUrl: payload.midi_url || payload.download_url || payload.url,
      filename: payload.filename || `${file.name.replace(/\.[^.]+$/, "")}.mid`,
      notes: payload.notes || null,
    };
  }

  const blob = await response.blob();
  return {
    midiUrl: URL.createObjectURL(blob),
    filename: `${file.name.replace(/\.[^.]+$/, "")}.mid`,
    notes: null,
  };
}

export async function login(email, password) {
  if (!API_BASE_URL) {
    return { token: "demo-token", user: { email } };
  }
  const response = await request("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return response.json();
}

export async function register(email, password) {
  if (!API_BASE_URL) {
    return { token: "demo-token", user: { email } };
  }
  const response = await request("/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return response.json();
}
