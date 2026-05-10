import mediapipe as mp

class PoseDetector:
    def __init__(self):
        self.mp_pose = mp.solutions.pose
        self.pose = self.mp_pose.Pose(
            min_detection_confidence=0.5, 
            min_tracking_confidence=0.5
        )
        self.landmarks = None

    def process_frame(self, image):
        """Processes the RGB image and returns the pose results."""
        image.flags.writeable = False
        results = self.pose.process(image)
        image.flags.writeable = True
        
        if results.pose_landmarks:
            self.landmarks = results.pose_landmarks.landmark
        else:
            self.landmarks = None
            
        return results

    def get_landmark(self, landmark_name):
        """Safely gets the landmark object."""
        if not self.landmarks:
            return None
        try:
            return self.landmarks[getattr(self.mp_pose.PoseLandmark, landmark_name).value]
        except:
            return None

    def get_landmark_coords(self, landmark_name):
        """Returns [x, y] of a landmark."""
        lm = self.get_landmark(landmark_name)
        if lm:
            return [lm.x, lm.y]
        return None
