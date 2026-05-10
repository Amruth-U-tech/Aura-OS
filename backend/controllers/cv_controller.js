import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// @desc    Start an OpenCV exercise tracker
// @route   POST /api/cv/start
export const startExercise = (req, res) => {
  const { exercise, reps } = req.body;
  
  const validExercises = ['pushups', 'situps', 'squats'];
  if (!validExercises.includes(exercise)) {
    return res.status(400).json({ message: "Invalid exercise type" });
  }

  const scriptPath = path.join(__dirname, '..', 'cv', `${exercise}.py`);
  const targetReps = reps || 10;

  console.log(`Starting CV tracker for ${exercise} with ${targetReps} reps...`);

  // Spawn the python process
  const pythonProcess = spawn('python', [scriptPath, targetReps.toString()]);

  pythonProcess.stdout.on('data', (data) => {
    console.log(`[Python ${exercise}]: ${data.toString()}`);
    if (data.toString().includes('SUCCESS')) {
      // In a real app, we might use websockets to notify the frontend immediately.
      // For now, the frontend will wait for the API response.
    }
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error(`[Python Error ${exercise}]: ${data.toString()}`);
  });

  pythonProcess.on('close', (code) => {
    console.log(`Python process for ${exercise} exited with code ${code}`);
    if (code === 0) {
      res.status(200).json({ message: "Exercise completed successfully", status: "SUCCESS" });
    } else {
      res.status(500).json({ message: "Exercise aborted or failed", status: "ABORTED" });
    }
  });
};
