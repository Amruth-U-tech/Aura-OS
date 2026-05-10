import cv2
import mediapipe as mp
from .cv_constants import *

mp_drawing = mp.solutions.drawing_utils
mp_pose = mp.solutions.pose

def draw_styled_landmarks(image, results):
    """Draws cyberpunk/Solo Leveling styled pose landmarks."""
    if not results.pose_landmarks:
        return
        
    mp_drawing.draw_landmarks(
        image, 
        results.pose_landmarks, 
        mp_pose.POSE_CONNECTIONS,
        mp_drawing.DrawingSpec(color=COLOR_CYAN, thickness=2, circle_radius=2), 
        mp_drawing.DrawingSpec(color=COLOR_PURPLE, thickness=2, circle_radius=2)
    )

def draw_hud(image, title, reps, target, stage, status_msg="TRACKING ACTIVE"):
    """Renders the futuristic HUD overlay on the image."""
    h, w, _ = image.shape
    
    # Top Left Panel: Protocol Title
    cv2.putText(image, f"// PROTOCOL: {title}", (20, 30), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, COLOR_CYAN, 1, cv2.LINE_AA)
                
    # Top Right Panel: Status
    text_size = cv2.getTextSize(f"[{status_msg}]", cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)[0]
    cv2.putText(image, f"[{status_msg}]", (w - text_size[0] - 20, 30), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, COLOR_RED if status_msg == "TARGET LOST" else COLOR_GREEN, 1, cv2.LINE_AA)

    # Bottom Left Panel: Rep Counter
    overlay = image.copy()
    cv2.rectangle(overlay, (10, h - 110), (200, h - 10), COLOR_BG_DARK, -1)
    cv2.addWeighted(overlay, 0.7, image, 0.3, 0, image)
    cv2.rectangle(image, (10, h - 110), (200, h - 10), COLOR_CYAN, 1)
    
    cv2.putText(image, "XP PROGRESS", (20, h - 85), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.4, COLOR_WHITE, 1, cv2.LINE_AA)
                
    cv2.putText(image, f"{reps}/{target}", (20, h - 30), 
                cv2.FONT_HERSHEY_SIMPLEX, 1.5, COLOR_CYAN, 2, cv2.LINE_AA)

    # Bottom Right Panel: Stage Info
    overlay2 = image.copy()
    cv2.rectangle(overlay2, (w - 160, h - 110), (w - 10, h - 10), COLOR_BG_DARK, -1)
    cv2.addWeighted(overlay2, 0.7, image, 0.3, 0, image)
    cv2.rectangle(image, (w - 160, h - 110), (w - 10, h - 10), COLOR_PURPLE, 1)

    cv2.putText(image, "STAGE", (w - 150, h - 85), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.4, COLOR_WHITE, 1, cv2.LINE_AA)
                
    cv2.putText(image, str(stage).upper() if stage else "WAIT", (w - 150, h - 30), 
                cv2.FONT_HERSHEY_SIMPLEX, 1.0, COLOR_PURPLE, 2, cv2.LINE_AA)
                
    # Center Screen: Success Override
    if reps >= target:
        overlay_success = image.copy()
        cv2.rectangle(overlay_success, (0, 0), (w, h), (18, 7, 3), -1)
        cv2.addWeighted(overlay_success, 0.8, image, 0.2, 0, image)
        
        msg = "QUEST COMPLETE"
        ts = cv2.getTextSize(msg, cv2.FONT_HERSHEY_SIMPLEX, 1.5, 3)[0]
        cv2.putText(image, msg, ((w - ts[0]) // 2, (h + ts[1]) // 2), 
                    cv2.FONT_HERSHEY_SIMPLEX, 1.5, COLOR_GREEN, 3, cv2.LINE_AA)
