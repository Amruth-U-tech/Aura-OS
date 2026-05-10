import cv2
import time
import threading
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from .exercises import PushupTracker, SquatTracker, SitupTracker
from .utils.pose_utils import PoseDetector
from .utils.drawing_utils import draw_styled_landmarks, draw_hud

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class StartRequest(BaseModel):
    exercise: str
    targetReps: int = 10

# Global State
active_exercise = None
camera = None
lock = threading.Lock()
detector = PoseDetector()

def generate_frames():
    global active_exercise, camera
    frame_skip = 0
    try:
        while True:
            local_camera = None
            local_exercise = None

            with lock:
                local_camera = camera
                local_exercise = active_exercise

            if not local_camera or not local_camera.isOpened():
                # Fix 9: Camera failure recovery
                with lock:
                    if active_exercise and (not camera or not camera.isOpened()):
                        camera = cv2.VideoCapture(0, cv2.CAP_DSHOW)
                        if camera.isOpened():
                            camera.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
                            camera.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
                            camera.set(cv2.CAP_PROP_FPS, 30)
                time.sleep(0.1)
                continue

            success, frame = local_camera.read()
            if not success:
                time.sleep(0.01) # Fix 5: Hot loop CPU spike
                continue

            # Fix 6: Mirror webcam
            frame = cv2.flip(frame, 1)

            # Fix 7: Frame resize optimization
            frame = cv2.resize(frame, (640, 480))

            if local_exercise:
                frame_skip += 1
                
                # Fix 10: Frame skipping for mediapipe
                if frame_skip % 2 == 0:
                    results = detector.process_frame(frame)
                    local_exercise.process(detector)
                    # For simplicity, we draw the landmarks only when processed
                    draw_styled_landmarks(frame, results)
                
                draw_hud(frame, 
                         local_exercise.title, 
                         local_exercise.reps, 
                         local_exercise.target_reps, 
                         local_exercise.stage, 
                         local_exercise.status_msg)

            # Fix 8: JPEG encoding optimization
            ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
            frame_bytes = buffer.tobytes()

            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
    except GeneratorExit:
        print("Client disconnected")
        # Fix 12: Safe cleanup
        with lock:
            if camera and camera.isOpened():
                camera.release()
                camera = None
            cv2.destroyAllWindows()

@app.get("/video_feed")
def video_feed():
    return StreamingResponse(generate_frames(), media_type="multipart/x-mixed-replace; boundary=frame")

@app.post("/start")
def start_exercise(req: StartRequest):
    global active_exercise, camera
    with lock:
        if req.exercise == "pushups":
            active_exercise = PushupTracker(req.targetReps)
        elif req.exercise == "squats":
            active_exercise = SquatTracker(req.targetReps)
        elif req.exercise == "situps":
            active_exercise = SitupTracker(req.targetReps)
        else:
            return {"error": "Unknown exercise"}

        if not camera or not camera.isOpened():
            camera = cv2.VideoCapture(0, cv2.CAP_DSHOW)
            if camera.isOpened():
                camera.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
                camera.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
                camera.set(cv2.CAP_PROP_FPS, 30)

    return {"status": "started", "exercise": req.exercise}

@app.post("/stop")
def stop_exercise():
    global active_exercise, camera
    with lock:
        active_exercise = None
        if camera and camera.isOpened():
            camera.release()
            camera = None
        cv2.destroyAllWindows()
    return {"status": "stopped"}

@app.get("/status")
def get_status():
    global active_exercise
    with lock:
        if active_exercise:
            return {
                "active": True,
                "exercise": active_exercise.title.lower(),
                "currentReps": active_exercise.reps,
                "targetReps": active_exercise.target_reps,
                "completed": active_exercise.completed
            }
        return {"active": False}
