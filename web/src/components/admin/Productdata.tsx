"use client";
import { API_URL } from "@/lib/config";
import { apiFetch } from "@/lib/api";
import React, { useState, useEffect } from "react";

interface Product {
  _id: string;
  name: string;
  price: string;
  unit: string;
  image: string;
  description: string;
  stock?: number;
}

const Productdata = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formdata, setformdata] = useState({
    pdtname: "",
    pdtprice: "",
    pdtunit: "",
    pdtstock: "",
    pdtimg: null as File | null,
    pdtdisc: "",
  });

  // 1. Fetch Products from Backend
  const fetchProducts = async () => {
    try {
      const response = await apiFetch(`${API_URL}/admin/get-products`);
      const data = await response.json();
      if (response.ok) setProducts(data);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handlechange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setformdata({ ...formdata, [e.target.name]: e.target.value });
  };

  // 2. Handle Submit (Add or Update)
  const handlesubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formdata.pdtdisc ||
      !formdata.pdtname ||
      !formdata.pdtprice ||
      !formdata.pdtunit ||
      formdata.pdtstock === ""
    ) {
      alert("Please provide every attribute of product.");
      return;
    }

    const formData = new FormData();
    formData.append("name", formdata.pdtname);
    formData.append("price", formdata.pdtprice);
    formData.append("unit", formdata.pdtunit);
    formData.append("stock", formdata.pdtstock);
    formData.append("description", formdata.pdtdisc);
    if (formdata.pdtimg) formData.append("image", formdata.pdtimg);

    const url = editingId
      ? `${API_URL}/admin/update-product/${editingId}`
      : `${API_URL}/admin/add-product`;

    try {
      const response = await apiFetch(url, {
        method: editingId ? "PUT" : "POST",
        body: formData,
      });

      if (response.ok) {
        alert(editingId ? "✅ Product Updated" : "✅ Product Added");
        resetForm();
        fetchProducts();
      }
    } catch (error) {
      alert("❌ Server Error");
    }
  };

  // 3. Handle Delete
  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      try {
        const response = await apiFetch(
          `${API_URL}/admin/delete-product/${id}`,
          {
            method: "DELETE",
          },
        );
        if (response.ok) {
          setProducts(products.filter((p) => p._id !== id));
        }
      } catch (error) {
        console.error("Delete error:", error);
      }
    }
  };

  // 4. Set form for editing
  const handleEdit = (pdt: Product) => {
    setEditingId(pdt._id);
    setformdata({
      pdtname: pdt.name,
      pdtprice: pdt.price,
      pdtunit: pdt.unit,
      pdtstock: String(pdt.stock ?? 0),
      pdtdisc: pdt.description,
      pdtimg: null, // Keep image null unless user wants to change it
    });
    window.scrollTo(0, 0);
  };

  const resetForm = () => {
    setEditingId(null);
    setformdata({
      pdtname: "",
      pdtprice: "",
      pdtunit: "",
      pdtstock: "",
      pdtimg: null,
      pdtdisc: "",
    });
  };

  return (
    <div className="p-4 mx-auto">
      {/* Form Section */}
      <form
        onSubmit={handlesubmit}
        className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow mb-10"
      >
        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
          {editingId ? "✏️ Edit Product" : "📦 Add Product"}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            name="pdtname"
            type="text"
            value={formdata.pdtname}
            onChange={handlechange}
            placeholder="Product Name"
            className="w-full px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <input
            name="pdtprice"
            type="number"
            value={formdata.pdtprice}
            onChange={handlechange}
            placeholder="Price"
            className="w-full px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <input
            name="pdtunit"
            type="text"
            value={formdata.pdtunit}
            onChange={handlechange}
            placeholder="Unit (e.g. kg)"
            className="w-full px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <input
            name="pdtstock"
            type="number"
            min={0}
            step={1}
            value={formdata.pdtstock}
            onChange={handlechange}
            placeholder="Stock available (whole number)"
            className="w-full px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <input
            type="file"
            accept="image/*"
            onChange={(e) =>
              setformdata({
                ...formdata,
                pdtimg: e.target.files ? e.target.files[0] : null,
              })
            }
            className="w-full px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        <textarea
          name="pdtdisc"
          placeholder="Description"
          value={formdata.pdtdisc}
          onChange={handlechange}
          className="w-full mt-4 px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white h-24"
        />

        <div className="mt-4 flex gap-2">
          <button
            type="submit"
            className="px-6 py-2 bg-green-600 hover:bg-green-700 cursor-pointer text-white rounded-md font-bold"
          >
            {editingId ? "Update Product" : "Add Product"}
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

      {/* Display Table */}
      <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow">
        <table className="w-full text-left">
          <thead className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
            <tr>
              <th className="p-4">Image</th>
              <th className="p-4">Name</th>
              <th className="p-4">Price/Unit</th>
              <th className="p-4">Stock</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr
                key={p._id}
                className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750"
              >
                <td className="p-4">
                  <img
                    src={`${API_URL}/uploads/${p.image}`}
                    alt={p.name}
                    className="w-16 h-16 object-cover rounded"
                  />
                </td>
                <td className="p-4 font-semibold text-gray-900 dark:text-white">
                  {p.name}
                </td>
                <td className="p-4 text-gray-600 dark:text-gray-400">
                  Rs.{p.price} / {p.unit}
                </td>
                <td
                  className={`p-4 font-semibold ${
                    (p.stock ?? 0) === 0
                      ? "text-red-600"
                      : (p.stock ?? 0) <= 5
                        ? "text-yellow-600"
                        : "text-green-600"
                  }`}
                >
                  {p.stock ?? 0}
                </td>
                <td className="p-4">
                  <button
                    onClick={() => handleEdit(p)}
                    className="text-blue-600 cursor-pointer hover:text-blue-800 hover:underline mr-4"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(p._id)}
                    className="text-red-600 cursor-pointer hover:text-red-800 hover:underline"
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

export default Productdata;
