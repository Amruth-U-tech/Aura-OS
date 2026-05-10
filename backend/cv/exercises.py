import cv2
import time
from .utils.pose_utils import PoseDetector
from .utils.angle_utils import calculate_angle
from .utils.drawing_utils import draw_styled_landmarks, draw_hud
from .utils.cv_constants import *

class BaseExercise:
    def __init__(self, target_reps):
        self.target_reps = target_reps
        self.reps = 0
        self.stage = None
        self.last_rep_time = 0
        self.completed = False
        self.status_msg = "INITIALIZING..."

    def process(self, landmarks):
        raise NotImplementedError

class PushupTracker(BaseExercise):
    def __init__(self, target_reps):
        super().__init__(target_reps)
        self.title = "PUSHUPS"

    def process(self, detector):
        shoulder = detector.get_landmark_coords('LEFT_SHOULDER')
        elbow = detector.get_landmark_coords('LEFT_ELBOW')
        wrist = detector.get_landmark_coords('LEFT_WRIST')

        if not (shoulder and elbow and wrist):
            self.status_msg = "TARGET LOST"
            return

        self.status_msg = "TRACKING ACTIVE"
        angle = calculate_angle(shoulder, elbow, wrist)

        if angle > PUSHUP_UP_THRESH:
            if self.stage == "down":
                current_time = time.time()
                if current_time - self.last_rep_time > DEBOUNCE_TIME:
                    self.reps += 1
                    self.last_rep_time = current_time
                    if self.reps >= self.target_reps:
                        self.completed = True
            self.stage = "up"
        elif angle < PUSHUP_DOWN_THRESH:
            self.stage = "down"

class SquatTracker(BaseExercise):
    def __init__(self, target_reps):
        super().__init__(target_reps)
        self.title = "SQUATS"

    def process(self, detector):
        hip = detector.get_landmark_coords('LEFT_HIP')
        knee = detector.get_landmark_coords('LEFT_KNEE')
        ankle = detector.get_landmark_coords('LEFT_ANKLE')

        if not (hip and knee and ankle):
            self.status_msg = "TARGET LOST"
            return

        self.status_msg = "TRACKING ACTIVE"
        angle = calculate_angle(hip, knee, ankle)

        if angle > SQUAT_UP_THRESH:
            if self.stage == "down":
                current_time = time.time()
                if current_time - self.last_rep_time > DEBOUNCE_TIME:
                    self.reps += 1
                    self.last_rep_time = current_time
                    if self.reps >= self.target_reps:
                        self.completed = True
            self.stage = "up"
        elif angle < SQUAT_DOWN_THRESH:
            self.stage = "down"

class SitupTracker(BaseExercise):
    def __init__(self, target_reps):
        super().__init__(target_reps)
        self.title = "SITUPS"

    def process(self, detector):
        shoulder = detector.get_landmark_coords('LEFT_SHOULDER')
        hip = detector.get_landmark_coords('LEFT_HIP')
        knee = detector.get_landmark_coords('LEFT_KNEE')

        if not (shoulder and hip and knee):
            self.status_msg = "TARGET LOST"
            return

        self.status_msg = "TRACKING ACTIVE"
        angle = calculate_angle(shoulder, hip, knee)

        if angle > SITUP_DOWN_THRESH:
            self.stage = "down"
        elif angle < SITUP_UP_THRESH:
            if self.stage == "down":
                current_time = time.time()
                if current_time - self.last_rep_time > DEBOUNCE_TIME:
                    self.reps += 1
                    self.last_rep_time = current_time
                    if self.reps >= self.target_reps:
                        self.completed = True
            self.stage = "up"
