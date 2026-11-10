import axios from "axios";
import { DISEASE_API_URL } from "./config";

export const predictDisease = async (image: File) => {
  const formData = new FormData();
  // Key must be "image" (Flask reads request.files["image"])
  formData.append("image", image);

  const response = await axios.post(`${DISEASE_API_URL}/predict`, formData);
  return response.data;
};
