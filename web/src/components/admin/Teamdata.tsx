"use client";
import { API_URL } from "@/lib/config";
import { apiFetch } from "@/lib/api";
import React, { useState, useEffect } from "react";

interface Member {
  _id: string;
  name: string;
  role: string;
  image: string;
  description: string;
}

const Teamdata = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formdata, setformdata] = useState({
    tmname: "",
    tmrole: "",
    tmimg: null as File | null,
    tmdisc: "",
  });

  // 1. Fetch team members from backend
  const fetchMembers = async () => {
    try {
      const response = await apiFetch(
        `${API_URL}/admin/get-team-member`,
      );
      const data = await response.json();
      if (response.ok) setMembers(data);
    } catch (error) {
      console.error("Error fetching members:", error);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handlechange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setformdata({ ...formdata, [e.target.name]: e.target.value });
  };

  // 2. Handle Add/Update Submit
  const handlesubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formdata.tmdisc || !formdata.tmname || !formdata.tmrole) {
      alert("Please provide every attribute of team member.");
      return;
    }

    const formData = new FormData();
    formData.append("name", formdata.tmname);
    formData.append("role", formdata.tmrole);
    formData.append("description", formdata.tmdisc);
    if (formdata.tmimg) formData.append("image", formdata.tmimg);

    const url = editingId
      ? `${API_URL}/admin/update-team-member/${editingId}`
      : `${API_URL}/admin/add-team-member`;

    try {
      const response = await apiFetch(url, {
        method: editingId ? "PUT" : "POST",
        body: formData,
      });

      if (response.ok) {
        alert(
          editingId
            ? "✅ Member Updated Successfully"
            : "✅ Member Added Successfully",
        );
        resetForm();
        fetchMembers();
      } else {
        alert("❌ Action failed");
      }
    } catch (error) {
      alert("❌ Server Error");
    }
  };

  // 3. Handle Delete
  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to remove this member?")) {
      try {
        const response = await apiFetch(
          `${API_URL}/admin/delete-team-member/${id}`,
          {
            method: "DELETE",
          },
        );
        if (response.ok) {
          setMembers(members.filter((m) => m._id !== id));
        }
      } catch (error) {
        console.error("Delete error:", error);
      }
    }
  };

  // 4. Set form for editing
  const handleEdit = (member: Member) => {
    setEditingId(member._id);
    setformdata({
      tmname: member.name,
      tmrole: member.role,
      tmdisc: member.description,
      tmimg: null, // Reset file input
    });
    window.scrollTo(0, 0);
  };

  const resetForm = () => {
    setEditingId(null);
    setformdata({ tmname: "", tmrole: "", tmimg: null, tmdisc: "" });
  };

  return (
    <div className="p-4 mx-auto">
      {/* Input Form */}
      <form
        onSubmit={handlesubmit}
        className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-10"
      >
        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
          {editingId ? "✏️ Edit Team Member" : "👥 Add Team Member"}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            name="tmname"
            type="text"
            value={formdata.tmname}
            onChange={handlechange}
            placeholder="Member Name"
            className="w-full px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <input
            name="tmrole"
            type="text"
            value={formdata.tmrole}
            onChange={handlechange}
            placeholder="Role (e.g. Lead Developer)"
            className="w-full px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <input
            type="file"
            onChange={(e) =>
              setformdata({
                ...formdata,
                tmimg: e.target.files ? e.target.files[0] : null,
              })
            }
            className="w-full px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white col-span-2"
          />
        </div>
        <textarea
          name="tmdisc"
          placeholder="Member Description"
          value={formdata.tmdisc}
          onChange={handlechange}
          className="w-full mt-4 mb-3 px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white h-24"
        />

        <div className="flex gap-2">
          <button
            type="submit"
            className="px-6 py-2 bg-green-600 hover:bg-green-700 cursor-pointer text-white rounded-md transition-colors"
          >
            {editingId ? "Update Member" : "Add Member"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="px-6 py-2 bg-gray-500 cursor-pointer text-white rounded-md"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* Data Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
            <tr>
              <th className="p-4">Profile</th>
              <th className="p-4">Name & Role</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr
                key={m._id}
                className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750"
              >
                <td className="p-4">
                  <img
                    src={`${API_URL}/uploads/${m.image}`}
                    alt={m.name}
                    className="w-14 h-14 object-cover rounded-full border dark:border-gray-600"
                  />
                </td>
                <td className="p-4">
                  <div className="font-bold text-gray-900 dark:text-white">
                    {m.name}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {m.role}
                  </div>
                </td>
                <td className="p-4 space-x-3">
                  <button
                    onClick={() => handleEdit(m)}
                    className="text-blue-600 hover:text-blue-800 cursor-pointer hover:underline font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(m._id)}
                    className="text-red-600 hover:text-red-800 cursor-pointer hover:underline font-medium"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {members.length === 0 && (
          <p className="p-10 text-center text-gray-500">
            No team members found.
          </p>
        )}
      </div>
    </div>
  );
};

export default Teamdata;
