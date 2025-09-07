"use client";
import { useEffect, useState } from "react";
import { getApiUrl } from "@/app/utils/api";

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    number: "",
    held_at: "",
    description: "",
    minutes_url: ""
  });
  const [error, setError] = useState("");

  // Fetch meetings
  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    setLoading(true);
    const res = await fetch(getApiUrl("meetings/"), { credentials: 'include' });
    const data = await res.json();
    setMeetings(data);
    setLoading(false);
  };

  // Handle form input changes
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    // You may need to add authentication headers if your API requires it
    const res = await fetch(getApiUrl("meetings/"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzQ4MjUxMTk0LCJpYXQiOjE3NDgyNTA4OTQsImp0aSI6ImRmZTY5MGIxM2FiNjRhOGFiOTdiYjBkMGI5ZjljNjJlIiwidXNlcl9pZCI6MX0.ZWJ_JWVHi8mF9zNW5jxJTpdYsBxVsmmH2E0V1IJwi_k" // <-- Replace with your actual token
      },
      body: JSON.stringify(form)
    });
    if (res.ok) {
      setForm({ number: "", held_at: "", description: "", minutes_url: "" });
      fetchMeetings();
    } else {
      const err = await res.json();
      setError(JSON.stringify(err));
    }
  };

  return (
    <div>
      <h1>Meetings</h1>
      <form onSubmit={handleSubmit} style={{ marginBottom: "2rem" }}>
        <div>
          <label>Number: </label>
          <input
            name="number"
            type="number"
            value={form.number}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label>Held At (YYYY-MM-DD): </label>
          <input
            name="held_at"
            type="date"
            value={form.held_at}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label>Description: </label>
          <input
            name="description"
            type="text"
            value={form.description}
            onChange={handleChange}
          />
        </div>
        <div>
          <label>Minutes URL: </label>
          <input
            name="minutes_url"
            type="text"
            value={form.minutes_url}
            onChange={handleChange}
          />
        </div>
        <button type="submit">Add Meeting</button>
      </form>
      {error && <div style={{ color: "red" }}>Error: {error}</div>}
      {loading ? (
        <div>Loading...</div>
      ) : (
        <ul>
          {meetings.map((meeting) => (
            <li key={meeting.id}>
              #{meeting.number} - Held at: {meeting.held_at} - {meeting.description}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
