"use client";
import { API_URL } from "@/lib/config";
import { apiFetch } from "@/lib/api";
import React, { useState, useEffect } from "react";

interface SliderItem {
  _id: string;
  image: string;
  description: string;
}

const Sliderimg = () => {
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [sliders, setSliders] = useState<SliderItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  // 1. Fetch all sliders on component load
  const fetchSliders = async () => {
    try {
      const response = await apiFetch(`${API_URL}/admin/get-sliders`); // Ensure this route exists in backend
      const data = await response.json();
      if (response.ok) setSliders(data);
    } catch (error) {
      console.error("Error fetching sliders:", error);
    }
  };

  useEffect(() => {
    fetchSliders();
  }, []);

  // 2. Handle Add or Update
  const handlesubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    if (file) formData.append("image", file);
    formData.append("description", description);

    const url = editingId
      ? `${API_URL}/admin/update-slider/${editingId}`
      : `${API_URL}/admin/add-slider`;

    try {
      const response = await apiFetch(url, {
        method: editingId ? "PUT" : "POST",
        body: formData,
      });

      if (response.ok) {
        alert(editingId ? "Slider updated!" : "Slider added!");
        setFile(null);
        setDescription("");
        setEditingId(null);
        fetchSliders(); // Refresh list
      }
    } catch (error) {
      alert("Action failed. Check console.");
    }
  };

  // 3. Handle Delete
  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this?")) {
      try {
        const response = await apiFetch(
          `${API_URL}/admin/delete-slider/${id}`,
          {
            method: "DELETE",
          },
        );
        if (response.ok) {
          setSliders(sliders.filter((s) => s._id !== id));
          alert("Deleted successfully");
        }
      } catch (error) {
        console.error("Delete error:", error);
      }
    }
  };

  // 4. Prepare for Edit
  const startEdit = (item: SliderItem) => {
    setEditingId(item._id);
    setDescription(item.description);
    window.scrollTo(0, 0); // Scroll to form
  };

  return (
    <div className="p-4 mx-auto">
      {/* Form Section */}
      <form
        onSubmit={handlesubmit}
        className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow mb-8"
      >
        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
          {editingId ? "Update Slider" : "Add Slide Image"}
        </h3>
        <input
          type="text"
          placeholder="Description..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-3 py-2 mb-4 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
          required
        />
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
          className="w-full px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            className="mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md"
          >
            {editingId ? "Save Changes" : "Upload Slide"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setDescription("");
              }}
              className="mt-4 px-4 py-2 cursor-pointer bg-gray-500 text-white rounded-md"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* Data Table / List Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-200 dark:bg-gray-700">
            <tr>
              <th className="p-3">Image</th>
              <th className="p-3">Description</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sliders.map((item) => (
              <tr key={item._id} className="border-b dark:border-gray-600">
                <td className="p-3">
                  <img
                    src={`${API_URL}/uploads/${item.image}`}
                    alt="slider"
                    className="w-20 h-12 object-cover rounded"
                  />
                </td>
                <td className="p-3 text-gray-900 dark:text-white">
                  {item.description}
                </td>
                <td className="p-3 text-center">
                  <button
                    onClick={() => startEdit(item)}
                    className="mr-2 text-blue-500 cursor-pointer hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item._id)}
                    className="text-red-500 cursor-pointer hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Sliderimg;
