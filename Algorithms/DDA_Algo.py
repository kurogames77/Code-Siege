"""
DDA_Algo.py
-----------
Dynamic Difficulty Adjustment algorithm.
Takes the IRT output and adjusts the puzzle difficulty level.
Uses only standard Python libraries.

Pipeline Role:
    Second stage of Pipeline 1 (Difficulty Adjustment):
      IRT_Algo.py → DDA_Algo.py

    Receives the IRT struggling status along with optional granular metrics
    and recent performance history, then decides whether to increase, decrease,
    or maintain the current puzzle difficulty level.
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
    
    Uses a hybrid approach combining IRT status with recent performance
    trend (streak logic) to avoid knee-jerk difficulty changes.
    """
    
    # Difficulty levels in ascending order (index 0 = easiest)
    DIFFICULTY_LEVELS = ["Easy", "Medium", "Hard"]
    
    def __init__(self):
        """
        Constructor is intentionally empty.
        Reserved for future configuration such as custom thresholds,
        streak length requirements, or per-course difficulty mappings.
        """
        pass
    
    def _get_difficulty_index(self, current_difficulty):
        """
        Convert a difficulty string to its numeric index.
        Returns 1 (Medium) as default if the difficulty string is unrecognized.
        """
        try:
            return self.DIFFICULTY_LEVELS.index(current_difficulty)
        except ValueError:
            # Default to Medium if unknown difficulty string is passed
            return 1
    
    def adjust(self, irt_status, current_difficulty, metrics=None, history=None):
        """
        Adjust difficulty based on IRT output, granular metrics, and recent history.
        
        This uses a hybrid approach:
          - IRT status determines the direction (downgrade vs upgrade)
          - Recent trend (from history) acts as a confirmation gate
          - Granular metrics are used only for the "perfect Easy" fast-promotion case

        Args:
            irt_status (str): Output from IRT ('NotStruggling', 'MediumStruggling', 'SuperStruggling')
            current_difficulty (str): Current difficulty ('Easy', 'Medium', 'Hard')
            metrics (dict, optional): { 'time': float, 'errors': int, 'hints': int }
                Note: Metrics are primarily analyzed by IRT. DDA only uses them for
                the special "perfect Easy performance" promotion check. All other
                branches rely on the IRT status and trend.
            history (dict, optional): { 'trend': 'stable'|'struggling'|'excelling', 'recentCount': int }
                Note: 'recentCount' is currently reserved for future use (e.g.,
                requiring a minimum game count before allowing difficulty changes).
                Only 'trend' is actively consumed by the adjustment logic.
        """
        
        # ── Parse Current State ──
        current_index = self._get_difficulty_index(current_difficulty)
        reason = ""
        new_index = current_index
        
        # ── Extract Granular Metrics ──
        # Default to high values so that missing metrics don't accidentally
        # trigger the "perfect performance" promotion on Easy.
        time = metrics.get('time', 999) if metrics else 999
        errors = metrics.get('errors', 99) if metrics else 99
        hints = metrics.get('hints', 99) if metrics else 99
        
        # ── Extract Performance Trend ──
        # Trend is derived from the student's last N completed puzzles
        # by the backend (algorithm.js /full-analysis route).
        trend = history.get('trend', 'stable') if history else 'stable'
        
        # ── Hybrid Adjustment Logic (IRT Status + Trend) ──
        
        # --- Branch 1: Check for Downgrade (Make Easier) ---
        if irt_status == "SuperStruggling":
            # Immediate rescue: severe struggle bypasses trend confirmation.
            # Drop difficulty by one level (floor at Easy).
            new_index = max(current_index - 1, 0)
            reason = "Severe struggle detected - Decreasing difficulty immediately."
        
        elif irt_status == "MediumStruggling":
            # Moderate struggle: only downgrade if the recent trend confirms
            # a consistent pattern of struggle (streak-based gating).
            if trend == 'struggling':
                new_index = max(current_index - 1, 0)
                reason = "Consistent struggle detected (Streak) - Decreasing difficulty."
            else:
                # Single struggle instance: hold steady and wait for more data.
                reason = "Struggle detected, but keeping difficulty for now (need more data)."
                
        # --- Branch 2: Check for Upgrade (Make Harder) ---
        elif irt_status == "NotStruggling":
            # Good performance: only upgrade if recent trend confirms
            # consistent excellence (streak-based gating).
            if trend == 'excelling':
                new_index = min(current_index + 1, len(self.DIFFICULTY_LEVELS) - 1)
                reason = "Consistent excellence detected (Streak) - Increasing difficulty."
            
            # Special case: Perfect score on Easy triggers immediate promotion.
            # This catches students who were placed too low and shouldn't
            # have to prove a multi-game streak on trivially easy puzzles.
            elif current_difficulty == 'Easy' and errors == 0 and hints == 0 and time < 60:
                new_index = 1  # Promote directly to Medium
                reason = "Perfect performance on Easy - Promoting to Medium."
            
            else:
                # Good but not yet proven consistent — maintain current level.
                reason = "Good performance, but maintaining level until consistency is proven."

        # --- Branch 3: Unknown Status (Defensive Fallback) ---
        else:
            reason = "Status unknown - Maintaining current difficulty."

        # ── Build Result Payload ──
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
        Usage: For placement tests or first-time puzzle assignments.
        
        Design Note: Both SuperStruggling and MediumStruggling return "Easy"
        intentionally. For placement purposes, any sign of struggle warrants
        starting at the lowest level to build confidence. Only students who
        show no struggle indicators are placed at Medium.
        """
        if irt_status == "SuperStruggling":
            return "Easy"
        elif irt_status == "MediumStruggling":
            return "Easy"
        else:
            return "Medium"

# ── CLI Entrypoint ──
# Called from Node.js backend via child_process.spawn:
#   python DDA_Algo.py '<json_string>'
if __name__ == "__main__":
    if len(sys.argv) > 1:
        try:
            input_data = json.loads(sys.argv[1])
            adjuster = DifficultyAdjuster()
            
            # Extract arguments safely with defaults
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
