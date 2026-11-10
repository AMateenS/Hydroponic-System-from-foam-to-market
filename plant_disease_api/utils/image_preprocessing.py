import cv2
import numpy as np

IMG_SIZE = 224

def preprocess_image(file):
    """
    Preprocess uploaded image for CNN model
    """
    img = cv2.imdecode(np.frombuffer(file.read(), np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Invalid image file")
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    img = cv2.resize(img, (IMG_SIZE, IMG_SIZE))
    img = img / 255.0
    img = np.expand_dims(img, axis=0)
    return img
