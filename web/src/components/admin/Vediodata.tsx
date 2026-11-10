"use client";
import { API_URL } from "@/lib/config";
import { apiFetch } from "@/lib/api";
import React, { useState, useEffect } from "react";

interface Video {
  _id: string;
  title: string;
  url: string;
  description: string;
}

const Vediodata = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [title, settitle] = useState("");
  const [url, seturl] = useState("");
  const [description, setDescription] = useState("");

  // 1. Fetch Videos on Load
  const fetchVideos = async () => {
    try {
      const response = await apiFetch(`${API_URL}/admin/get-videos`);
      const data = await response.json();
      if (response.ok) setVideos(data);
    } catch (error) {
      console.error("Error fetching videos:", error);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  // 2. Handle Add or Update
  const handlesubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!url || !title) {
      alert("Please provide both URL and a title.");
      return;
    }

    const videoData = { title, url, description };

    const targetUrl = editingId
      ? `${API_URL}/admin/update-video/${editingId}`
      : `${API_URL}/admin/add-video`;

    try {
      const response = await apiFetch(targetUrl, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(videoData),
      });

      if (response.ok) {
        alert(editingId ? "✅ Video Updated" : "✅ Video Added");
        resetForm();
        fetchVideos();
      } else {
        alert("❌ Action failed");
      }
    } catch (error) {
      alert("❌ Server error");
    }
  };

  // 3. Handle Delete
  const handleDelete = async (id: string) => {
    if (window.confirm("Delete this video entry?")) {
      try {
        const response = await apiFetch(
          `${API_URL}/admin/delete-video/${id}`,
          {
            method: "DELETE",
          },
        );
        if (response.ok) {
          setVideos(videos.filter((v) => v._id !== id));
        }
      } catch (error) {
        console.error("Delete error:", error);
      }
    }
  };

  // 4. Set Form for Editing
  const handleEdit = (v: Video) => {
    setEditingId(v._id);
    settitle(v.title);
    seturl(v.url);
    setDescription(v.description);
    window.scrollTo(0, 0);
  };

  const resetForm = () => {
    setEditingId(null);
    settitle("");
    seturl("");
    setDescription("");
  };

  return (
    <div className="p-4 mx-auto">
      {/* Form Section */}
      <form
        onSubmit={handlesubmit}
        className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow mb-8"
      >
        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
          {editingId ? "Edit Video Details" : "Add Video"}
        </h3>
        <input
          type="text"
          placeholder="Enter video title..."
          value={title}
          onChange={(e) => settitle(e.target.value)}
          className="w-full px-3 py-2 mb-4 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
        />
        <input
          type="url"
          placeholder="Enter video URL (YouTube/Vimeo)..."
          value={url}
          onChange={(e) => seturl(e.target.value)}
          className="w-full px-3 py-2 mb-4 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
        />
        <textarea
          placeholder="Enter video description..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white h-20"
        />

        <div className="flex gap-2 mt-4">
          <button
            type="submit"
            className="px-4 py-2 bg-green-600 hover:bg-green-700 cursor-pointer text-white rounded-md"
          >
            {editingId ? "Update Video" : "Upload Video"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 bg-gray-500 cursor-pointer text-white rounded-md"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* List Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              <th className="p-4">Title</th>
              <th className="p-4">URL</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {videos.map((v) => (
              <tr key={v._id} className="border-b dark:border-gray-700">
                <td className="p-4 font-medium text-gray-900 dark:text-white">
                  {v.title}
                </td>
                <td className="p-4 text-blue-500 truncate max-w-xs">
                  <a href={v.url} target="_blank" rel="noreferrer">
                    {v.url}
                  </a>
                </td>
                <td className="p-4">
                  <button
                    onClick={() => handleEdit(v)}
                    className="text-blue-500 cursor-pointer hover:underline mr-4"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(v._id)}
                    className="text-red-500 cursor-pointer hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {videos.length === 0 && (
          <p className="p-6 text-center text-gray-500">No videos added yet.</p>
        )}
      </div>
    </div>
  );
};

export default Vediodata;
