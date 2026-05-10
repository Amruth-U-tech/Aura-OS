# cv_constants.py

# Colors (BGR format for OpenCV)
COLOR_CYAN = (255, 229, 0)      # System Cyan (Aura OS theme)
COLOR_PURPLE = (246, 92, 139)   # Magic Purple
COLOR_RED = (68, 68, 239)       # Warning Red
COLOR_GREEN = (129, 185, 16)    # Success Green
COLOR_WHITE = (255, 255, 255)
COLOR_BLACK = (0, 0, 0)
COLOR_BG_DARK = (18, 7, 3)      # Dark Abyss background

# Layout Configs
HUD_MARGIN = 20
TEXT_SCALE_LARGE = 1.5
TEXT_SCALE_MEDIUM = 0.8
TEXT_SCALE_SMALL = 0.5
THICKNESS_THICK = 3
THICKNESS_MEDIUM = 2
THICKNESS_THIN = 1

# Exercise Constants
PUSHUP_UP_THRESH = 160
PUSHUP_DOWN_THRESH = 90

SQUAT_UP_THRESH = 160
SQUAT_DOWN_THRESH = 90

SITUP_UP_THRESH = 55
SITUP_DOWN_THRESH = 105

# Debounce
DEBOUNCE_TIME = 0.5 # Seconds between valid reps
