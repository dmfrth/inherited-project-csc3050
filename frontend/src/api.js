
const API_URL = "/api/teams";

async function handleResponse(response) {
  if (response.status === 204) {
    return null;
  }

  let result = null;
  try {
    result = await response.json();
  } catch {
    // The body was empty or not JSON; fall through to the generic message below.
  }

  if (!response.ok) {
    throw new Error(
      result?.error?.message || "The request could not be completed."
    );
  }

  return result?.data ?? null;
}

export async function getTeams() {
  const response = await fetch(API_URL, {
    method: "GET",
    headers: {
      Accept: "application/json"
    }
  });

  return handleResponse(response);
}

export async function getTeam(id) {
  const response = await fetch(`${API_URL}/${id}`, {
    method: "GET",
    headers: {
      Accept: "application/json"
    }
  });

  return handleResponse(response);
}

export async function createTeam(team) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(team)
  });

  return handleResponse(response);
}

export async function updateTeam(id, team) {
  const response = await fetch(`${API_URL}/${id}`, {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(team)
  });

  return handleResponse(response);
}

export async function deleteTeam(id) {
  const response = await fetch(`${API_URL}/${id}`, {
    method: "DELETE",
    headers: {
      Accept: "application/json"
    }
  });

  return handleResponse(response);
}
