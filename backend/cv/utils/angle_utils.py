# angle_utils.py
import numpy as np

def calculate_angle(a, b, c):
    """
    Calculate the angle between three points.
    a: first point (e.g., shoulder)
    b: mid point (e.g., elbow) - vertex
    c: end point (e.g., wrist)
    """
    a = np.array(a)
    b = np.array(b)
    c = np.array(c)
    
    radians = np.arctan2(c[1]-b[1], c[0]-b[0]) - np.arctan2(a[1]-b[1], a[0]-b[0])
    angle = np.abs(radians * 180.0 / np.pi)
    
    if angle > 180.0:
        angle = 360 - angle
        
    return angle
