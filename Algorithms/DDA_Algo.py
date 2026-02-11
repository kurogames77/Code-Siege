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
    
    def adjust(self, irt_status, current_difficulty, metrics=None, history=None):
        """
        Adjust difficulty based on IRT output, granular metrics, and recent history.
        
        Args:
            irt_status (str): Output from IRT ('NotStruggling', 'MediumStruggling', 'SuperStruggling')
            current_difficulty (str): Current difficulty ('Easy', 'Medium', 'Hard')
            metrics (dict, optional): { 'time': float, 'errors': int, 'hints': int }
            history (dict, optional): { 'trend': 'stable'|'struggling'|'excelling', 'recentCount': int }
        """
        
        current_index = self._get_difficulty_index(current_difficulty)
        reason = ""
        new_index = current_index
        
        # Parse inputs
        time = metrics.get('time', 999) if metrics else 999
        errors = metrics.get('errors', 99) if metrics else 99
        hints = metrics.get('hints', 99) if metrics else 99
        
        trend = history.get('trend', 'stable') if history else 'stable'
        
        # --- NEW LOGIC: Hybrid Approach (IRT + Trend) ---
        
        # 1. Check for Downgrade (Easier)
        if irt_status == "SuperStruggling":
            # Immediate rescue if failing hard
            new_index = max(current_index - 1, 0)
            reason = "Severe struggle detected - Decreasing difficulty immediately."
        
        elif irt_status == "MediumStruggling":
            # Only downgrade if recent history confirms the struggle
            if trend == 'struggling':
                new_index = max(current_index - 1, 0)
                reason = "Consistent struggle detected (Streak) - Decreasing difficulty."
            else:
                reason = "Struggle detected, but keeping difficulty for now (need more data)."
                
        # 2. Check for Upgrade (Harder)
        elif irt_status == "NotStruggling":
            # Only upgrade if recent history confirms excellence
            if trend == 'excelling':
                new_index = min(current_index + 1, len(self.DIFFICULTY_LEVELS) - 1)
                reason = "Consistent excellence detected (Streak) - Increasing difficulty."
            
            # Exception: Perfect score on current level might warrant immediate boost if Easy
            elif current_difficulty == 'Easy' and errors == 0 and hints == 0 and time < 60:
                new_index = 1 # Medium
                reason = "Perfect performance on Easy - Promoting to Medium."
            
            else:
                 reason = "Good performance, but maintaining level until consistency is proven."

        else:
            reason = "Status unknown - Maintaining current difficulty."

        new_difficulty = self.DIFFICULTY_LEVELS[new_index]
        adjustment = new_index - current_index
        difficulty_changed = new_difficulty != current_difficulty
        
        result = {
            "previous_difficulty": current_difficulty,
            "new_difficulty": new_difficulty,
            "difficulty_changed": difficulty_changed,
            "irt_status": irt_status,
            "trend": trend,
            "adjustment": adjustment,
            "reason": reason,
            "timestamp": datetime.datetime.now().isoformat()
        }
        
        return result
    
    def get_recommended_difficulty(self, irt_status):
        """
        Get a recommended starting difficulty based on IRT status alone.
        Usage: For placement tests.
        """
        if irt_status == "SuperStruggling":
            return "Easy"
        elif irt_status == "MediumStruggling":
            return "Easy"
        else:
            return "Medium"

# Only run if called directly
if __name__ == "__main__":
    if len(sys.argv) > 1:
        try:
            input_data = json.loads(sys.argv[1])
            adjuster = DifficultyAdjuster()
            
            # Extract arguments safely
            irt = input_data.get('irtStatus', 'NotStruggling')
            curr = input_data.get('currentDifficulty', 'Medium')
            mets = input_data.get('metrics', {})
            hist = input_data.get('history', {})
            
            result = adjuster.adjust(irt, curr, mets, hist)
            print(json.dumps(result))
        except Exception as e:
            print(json.dumps({"error": str(e)}))
    else:
        print("DDA_Algo Ready.")
