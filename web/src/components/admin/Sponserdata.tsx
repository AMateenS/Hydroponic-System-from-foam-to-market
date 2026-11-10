"use client";
import { API_URL } from "@/lib/config";
import { apiFetch } from "@/lib/api";
import React, { useState, useEffect } from "react";

interface Sponsor {
  _id: string;
  name: string;
  image: string;
  description: string;
}

const Sponserdata = () => {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formdata, setformdata] = useState({
    spname: "",
    spimg: null as File | null,
    spdisc: "",
  });

  // 1. Fetch Sponsors on Load
  const fetchSponsors = async () => {
    try {
      const response = await apiFetch(`${API_URL}/admin/get-sponsors`);
      const data = await response.json();
      if (response.ok) setSponsors(data);
    } catch (error) {
      console.error("Error fetching sponsors:", error);
    }
  };

  useEffect(() => {
    fetchSponsors();
  }, []);

  const handlechange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setformdata({ ...formdata, [e.target.name]: e.target.value });
  };

  // 2. Handle Add or Update
  const handlesubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formdata.spdisc || !formdata.spname) {
      alert("Please provide every attribute of sponsor.");
      return;
    }

    const formData = new FormData();
    formData.append("name", formdata.spname);
    formData.append("description", formdata.spdisc);
    if (formdata.spimg) formData.append("image", formdata.spimg);

    const url = editingId
      ? `${API_URL}/admin/update-sponsor/${editingId}`
      : `${API_URL}/admin/add-sponsor`;

    try {
      const response = await apiFetch(url, {
        method: editingId ? "PUT" : "POST",
        body: formData,
      });

      if (response.ok) {
        alert(editingId ? "✅ Sponsor Updated" : "✅ Sponsor Added");
        resetForm();
        fetchSponsors();
      }
    } catch (error) {
      alert("❌ Server Error");
    }
  };

  // 3. Handle Delete
  const handleDelete = async (id: string) => {
    if (window.confirm("Delete this sponsor?")) {
      try {
        const response = await apiFetch(
          `${API_URL}/admin/delete-sponsor/${id}`,
          {
            method: "DELETE",
          },
        );
        if (response.ok) {
          setSponsors(sponsors.filter((s) => s._id !== id));
        }
      } catch (error) {
        console.error("Delete error:", error);
      }
    }
  };

  // 4. Handle Edit
  const handleEdit = (sp: Sponsor) => {
    setEditingId(sp._id);
    setformdata({
      spname: sp.name,
      spdisc: sp.description,
      spimg: null,
    });
    window.scrollTo(0, 0);
  };

  const resetForm = () => {
    setEditingId(null);
    setformdata({ spname: "", spimg: null, spdisc: "" });
  };

  return (
    <div className="p-4 mx-auto">
      {/* Form Section */}
      <form
        onSubmit={handlesubmit}
        className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow mb-8"
      >
        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
          {editingId ? "Edit Sponsor" : "Add Sponsor Details"}
        </h3>
        <input
          name="spname"
          type="text"
          value={formdata.spname}
          onChange={handlechange}
          placeholder="Sponsor Company Name"
          className="w-full mb-3 px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
        />
        <input
          name="spimg"
          type="file"
          onChange={(e) =>
            setformdata({
              ...formdata,
              spimg: e.target.files ? e.target.files[0] : null,
            })
          }
          className="w-full mb-3 px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
        />
        <textarea
          name="spdisc"
          placeholder="Sponsor Description"
          value={formdata.spdisc}
          onChange={handlechange}
          className="w-full mb-3 px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            className="px-4 py-2 bg-green-600 hover:bg-green-700 cursor-pointer text-white rounded-md"
          >
            {editingId ? "Update Sponsor" : "Add Sponsor"}
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
              <th className="p-4">Logo</th>
              <th className="p-4">Company</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sponsors.map((sp) => (
              <tr key={sp._id} className="border-b dark:border-gray-700">
                <td className="p-4">
                  <img
                    src={`${API_URL}/uploads/${sp.image}`}
                    alt="logo"
                    className="w-16 h-16 object-contain bg-gray-50 rounded"
                  />
                </td>
                <td className="p-4 text-gray-900 dark:text-white font-medium">
                  {sp.name}
                </td>
                <td className="p-4">
                  <button
                    onClick={() => handleEdit(sp)}
                    className="text-blue-500 cursor-pointer hover:underline mr-4"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(sp._id)}
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

export default Sponserdata;
