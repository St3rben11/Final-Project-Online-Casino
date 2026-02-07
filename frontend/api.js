const API = "http://localhost:3000/api";

export async function api(url, method="GET", body=null) {
  const token = localStorage.getItem("token");

  const res = await fetch(API + url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token
    },
    body: body ? JSON.stringify(body) : null
  });

  return res.json();
}