"""Run this once after installing to verify the real YOLO model works on your machine:

    python check_setup.py                 (uses a generated test image)
    python check_setup.py your_photo.jpg

It loads the model (downloads yolov8n.pt the first time), runs real inference and
writes check_output.jpg with the boxes drawn."""
import sys
import time

import cv2
import numpy as np

from app.services.yolo_service import annotate, yolo_service

print("Loading model (first run downloads weights, needs internet)...")
if not yolo_service.load():
    print("FAILED:", yolo_service.error)
    sys.exit(1)
print("Model status:", {k: v for k, v in yolo_service.status().items() if k != "class_names"})

if len(sys.argv) > 1:
    img = cv2.imread(sys.argv[1])
    if img is None:
        print("Could not read image:", sys.argv[1])
        sys.exit(1)
else:
    img = (np.random.rand(480, 640, 3) * 255).astype("uint8")
    print("(No image given: using random noise, so 0 detections is expected. Pass a photo to see real boxes.)")

t = time.perf_counter()
dets = yolo_service.detect(img, conf=0.25)
print(f"Inference: {(time.perf_counter() - t) * 1000:.0f} ms, {len(dets)} object(s)")
for d in dets:
    print(f"  {d['class_name']:<15} {d['confidence'] * 100:5.1f}%  bbox={d['bbox']}")
cv2.imwrite("check_output.jpg", annotate(img, dets))
print("Wrote check_output.jpg")
