"""
DDA_Algo.py
-----------
Dynamic Difficulty Adjustment algorithm.
Takes the IRT output and adjusts the puzzle difficulty level.
Uses only standard Python libraries.
"""

import sys
import os
import json
import datetime


class DifficultyAdjuster:
    """
    Adjusts puzzle difficulty based on IRT struggling status.
    
    Difficulty Levels: Easy, Medium, Hard
    IRT Statuses: NotStruggling, MediumStruggling, SuperStruggling
    """
    
    # Difficulty levels in order (index 0 = easiest)
    DIFFICULTY_LEVELS = ["Easy", "Medium", "Hard"]
    
    def __init__(self):
        pass
    
    def _get_difficulty_index(self, current_difficulty):
        """Get the index of the current difficulty level."""
        try:
            return self.DIFFICULTY_LEVELS.index(current_difficulty)
        except ValueError:
            # Default to Medium if unknown
            return 1
    
    def adjust(self, irt_status, current_difficulty, metrics=None):
        """
        Adjust difficulty based on IRT output and granular metrics.
        
        Args:
            irt_status (str): Output from IRT ('NotStruggling', 'MediumStruggling', 'SuperStruggling')
            current_difficulty (str): Current difficulty ('Easy', 'Medium', 'Hard')
            metrics (dict, optional): { 'time': float, 'errors': int, 'hints': int }
        """
        
        current_index = self._get_difficulty_index(current_difficulty)
        reason = ""
        adjustment = 0
        new_index = current_index

        # Parse metrics if available
        time = metrics.get('time', 999) if metrics else 999
        errors = metrics.get('errors', 99) if metrics else 99
        hints = metrics.get('hints', 99) if metrics else 99
        
        if irt_status == "SuperStruggling":
            # Student is severely struggling - always set to Easy
            new_index = 0  # Easy
            reason = "Student severely struggling - setting difficulty to Easy"
            
        elif irt_status == "MediumStruggling":
            # Student is moderately struggling - decrease by 1 level
            new_index = max(current_index - 1, 0)
            reason = "Student moderately struggling - decreasing difficulty by 1 level"
            
        elif irt_status == "NotStruggling":
            # Check for Excellent Performance (Jump to Hard)
            # Time < 120s, Errors <= 2, Hints == 0
            if time < 120 and errors <= 2 and hints == 0:
                new_index = 2  # Hard
                reason = "Excellent performance (Time < 2m, Low Errors) - Setting to HARD"
            
            # Check for Good Performance (Ensure at least Medium)
            # Time < 210s, Errors <= 4, Hints <= 1
            elif time < 210 and errors <= 4 and hints <= 1:
                new_index = max(current_index + 1, 1) # At least Medium (1), or Hard (2) if already Medium
                reason = "Good performance - Increasing difficulty"
            
            else:
                # Standard increment
                new_index = min(current_index + 1, len(self.DIFFICULTY_LEVELS) - 1)
                reason = "Student performing well - increasing difficulty by 1 level"
        
        else:
            # Unknown status - keep current difficulty
            new_index = current_index
            reason = "Unknown status - maintaining current difficulty"

        new_difficulty = self.DIFFICULTY_LEVELS[new_index]
        adjustment = new_index - current_index
        
        # Check if difficulty actually changed
        difficulty_changed = new_difficulty != current_difficulty
        
        result = {
            "previous_difficulty": current_difficulty,
            "new_difficulty": new_difficulty,
            "difficulty_changed": difficulty_changed,
            "irt_status": irt_status,
            "adjustment": adjustment,
            "reason": reason,
            "timestamp": datetime.datetime.now().isoformat()
        }
        
        return result
    
    def get_recommended_difficulty(self, irt_status):
        """
        Get a recommended starting difficulty based on IRT status alone.
        Useful for new students or when resetting.
        
        Args:
            irt_status (str): Output from IRT algorithm
        
        Returns:
            str: Recommended difficulty level
        """
        if irt_status == "SuperStruggling":
            return "Easy"
        elif irt_status == "MediumStruggling":
            return "Easy"  # Start easier to build confidence
        else:
            return "Medium"  # Default starting point


# Only run if called directly (e.g. from Node.js child_process)
if __name__ == "__main__":
    # Usage: python DDA_Algo.py <json_input>
    # Input: { "irtStatus": "MediumStruggling", "currentDifficulty": "Hard" }
    
    if len(sys.argv) > 1:
        try:
            input_data = json.loads(sys.argv[1])
            adjuster = DifficultyAdjuster()
            result = adjuster.adjust(
                irt_status=input_data.get('irtStatus', 'NotStruggling'),
                current_difficulty=input_data.get('currentDifficulty', 'Medium')
            )
            print(json.dumps(result))
        except Exception as e:
            print(json.dumps({"error": str(e)}))
    else:
        # Test mode if no args
        print("DDA_Algo Ready. Pass JSON string as argument.")
        print("Example: python DDA_Algo.py '{\"irtStatus\": \"SuperStruggling\", \"currentDifficulty\": \"Hard\"}'")
