import os
from flask import Flask, request, jsonify
import tensorflow as tf
import numpy as np
from utils.image_preprocessing import preprocess_image
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, os.getenv("MODEL_DIR", "model"))

app = Flask(__name__)
CORS(app, origins=[o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")])
app.config["MAX_CONTENT_LENGTH"] = 8 * 1024 * 1024  # reject uploads over 8 MB

# Load trained model
leaf_model = tf.keras.models.load_model(os.path.join(MODEL_DIR, "leaf_detector.keras"))
tomato_model = tf.keras.models.load_model(os.path.join(MODEL_DIR, "tomato_detector.keras"))
disease_model = tf.keras.models.load_model(
    os.path.join(MODEL_DIR, "plant_leaf_disease_model.keras"))

# Class labels (same order as training)
CLASSES = [
    "bacterial_spot",
    "early_blight",
    "healthy",
    "late_blight",
    "leaf_mold",
    "mosaic_virus",
    "septoria_leaf_spot",
    "target_spot",
    "twospotted_spider_mite",
    "yellow_leaf_curl_virus"
]

DISEASE_PREVENTION = {

    "bacterial_spot": {
        "prevention": [
            "Use certified disease-free seed",
            "Avoid overhead irrigation",
            "Remove infected leaves immediately",
            "Maintain proper field sanitation"
        ],
        "medicine": [
            "Copper Oxychloride 50% WP (3 g/L)",
            "Copper Hydroxide 77% WP (2 g/L)"
        ],
        "fertilizer": [
            "Calcium Nitrate",
            "Potash (MOP)"
        ]
    },

    "early_blight": {
        "prevention": [
            "Remove infected crop residues",
            "Use mulch to reduce soil splash",
            "Maintain proper plant spacing"
        ],
        "medicine": [
            "Mancozeb 75% WP (2.5 g/L)",
            "Chlorothalonil 75% WP (2 g/L)"
        ],
        "fertilizer": [
            "DAP (18-46-0)",
            "Sulphate of Potash (SOP)"
        ]
    },

    "healthy": {
        "prevention": [
            "Maintain recommended irrigation",
            "Ensure good air circulation",
            "Regular crop monitoring"
        ],
        "medicine": [
            "Not required"
        ],
        "fertilizer": [
            "NPK 15-15-15",
            "Farm Yard Manure (FYM)"
        ]
    },

    "late_blight": {
        "prevention": [
            "Avoid excess moisture",
            "Remove infected plants immediately"
        ],
        "medicine": [
            "Metalaxyl + Mancozeb (Ridomil Gold) 2.5 g/L",
            "Cymoxanil + Mancozeb"
        ],
        "fertilizer": [
            "Sulphate of Potash (SOP)",
            "Calcium Nitrate"
        ]
    },

    "leaf_mold": {
        "prevention": [
            "Reduce greenhouse humidity",
            "Improve ventilation",
            "Avoid overhead watering"
        ],
        "medicine": [
            "Sulphur 80% WP (2 g/L)",
            "Chlorothalonil 75% WP"
        ],
        "fertilizer": [
            "NPK 12-12-17 + Mg",
            "Magnesium Sulphate"
        ]
    },

    "mosaic_virus": {
        "prevention": [
            "Use virus-free seed",
            "Disinfect tools",
            "Control insect vectors"
        ],
        "medicine": [
            "Imidacloprid 17.8% SL (0.3 ml/L)",
            "Thiamethoxam 25% WG"
        ],
        "fertilizer": [
            "Organic Compost",
            "Potassium Nitrate"
        ]
    },

    "septoria_leaf_spot": {
        "prevention": [
            "Remove lower infected leaves",
            "Avoid wet foliage",
            "Practice crop rotation"
        ],
        "medicine": [
            "Copper Oxychloride 50% WP",
            "Mancozeb 75% WP"
        ],
        "fertilizer": [
            "NPK 19-19-19",
            "Calcium Nitrate"
        ]
    },

    "target_spot": {
        "prevention": [
            "Improve air circulation",
            "Remove infected leaves"
        ],
        "medicine": [
            "Azoxystrobin 23% SC",
            "Chlorothalonil 75% WP"
        ],
        "fertilizer": [
            "Sulphate of Potash",
            "Magnesium Sulphate"
        ]
    },

    "twospotted_spider_mite": {
        "prevention": [
            "Avoid dry stress conditions",
            "Maintain field humidity"
        ],
        "medicine": [
            "Abamectin 1.9% EC (0.5 ml/L)",
            "Neem Oil 3000 ppm"
        ],
        "fertilizer": [
            "NPK 13-40-13",
            "Potassium Nitrate"
        ]
    },

    "yellow_leaf_curl_virus": {
        "prevention": [
            "Control whiteflies",
            "Remove infected plants",
            "Use reflective mulches"
        ],
        "medicine": [
            "Imidacloprid 17.8% SL",
            "Acetamiprid 20% SP"
        ],
        "fertilizer": [
            "Organic Manure",
            "Sulphate of Potash"
        ]
    }
}


@app.route("/", methods=["GET"])
def home():
    return "Plant Disease Detection API is running"


# @app.route("/predict", methods=["POST"])
# def predict():
#     if "image" not in request.files:
#         return jsonify({"error": "Image required"}), 400

#     img = preprocess_image(request.files["image"])

#     if leaf_model.predict(img)[0][0] < 0.5:
#         return jsonify({
#             "status": "error",
#             "type": "NOT_LEAF",
#             "message": "Please upload a leaf image"
#         }), 400

#     if tomato_model.predict(img)[0][0] < 0.5:
#         return jsonify({
#             "status": "error",
#             "type": "NOT_TOMATO",
#             "message": "This is not a tomato leaf"
#         }), 400

#     preds = disease_model.predict(img)
#     idx = int(np.argmax(preds))
#     confidence = float(preds[0][idx] * 100)

#     disease = CLASSES[idx]

#     return jsonify({
#         "disease": disease,
#         "confidence": round(confidence, 2),
#         "prevention": DISEASE_PREVENTION.get(CLASSES[index], [])["prevention"],
#         "medicine": DISEASE_PREVENTION.get(CLASSES[index], [])["medicine"],
#         "fertilizer": DISEASE_PREVENTION.get(CLASSES[index], [])["fertilizer"]
#     })


def is_leaf(pred):
    """
    Returns True if image IS a leaf
    """
    pred = np.array(pred)

    if pred.shape[1] == 1:
        # SIGMOID MODEL
        return pred[0][0] < 0.5   # 🔁 INVERTED
    else:
        # SOFTMAX MODEL
        return np.argmax(pred) == 0

def is_tomato(pred):
    """
    Returns True if image IS a tomato leaf
    """
    pred = np.array(pred)

    if pred.shape[1] == 1:
        # SIGMOID MODEL
        return pred[0][0] >= 0.5   # ✅ CHANGED
    else:
        # SOFTMAX MODEL
        return np.argmax(pred) == 1

@app.route("/predict", methods=["POST"])
def predict():
    if "image" not in request.files:
        return jsonify({"error": "Image required"}), 400

    try:
        img = preprocess_image(request.files["image"])
    except ValueError:
        return jsonify({
            "status": "error",
            "message": "The uploaded file is not a valid image"
        }), 400

    # -------- LEAF CHECK --------
    if not is_leaf(leaf_model.predict(img)):
        return jsonify({
            "status": "error",
            "message": "Please upload a leaf image"
        }), 400

    # -------- TOMATO CHECK --------
    if not is_tomato(tomato_model.predict(img)):
        return jsonify({
            "status": "error",
            "message": "This is not a tomato leaf"
        }), 400

    # -------- DISEASE --------
    preds = disease_model.predict(img)
    idx = int(np.argmax(preds))
    disease = CLASSES[idx]
    confidence = float(preds[0][idx] * 100)

    info = DISEASE_PREVENTION[disease]

    return jsonify({
        "status": "success",
        "disease": disease,
        "confidence": round(confidence, 2),
        "prevention": info["prevention"],
        "medicine": info["medicine"],
        "fertilizer": info["fertilizer"]
    })




if __name__ == "__main__":
    app.run(
        host=os.getenv("HOST", "127.0.0.1"),
        port=int(os.getenv("PORT", "5000")),
        debug=os.getenv("FLASK_DEBUG", "0") == "1",
    )

