"""
IRT_Algo.py
-----------
Stand-alone algorithm to analyze student performance and determine if they are struggling.
Uses strictly internal Python libraries.

Pipeline Role:
    This is the ENTRY POINT for both algorithm pipelines in CodeSiege:
      - Pipeline 1 (Difficulty): IRT → DDA_Algo.py
      - Pipeline 2 (Matchmaking): IRT → KMeans_Cluster.py → SkillBasedMatchMaking.py

    IRT receives raw student metrics (time consumed, error count, hints used) and
    classifies the student as: NotStruggling / MediumStruggling / SuperStruggling.

Algorithm Note:
    This implements a multi-factor threshold analysis inspired by IRT principles.
    Student ability is assessed via time, error, and hint thresholds using a
    "2-of-3 factors" rule, rather than a classical IRT logistic probability model
    (P(θ) = 1 / (1 + e^(-a(θ - b)))). The threshold approach is well-suited for
    CodeSiege's discrete puzzle completion context.
"""

import sys
import os
import json
import datetime
# urllib.request is used for standard library HTTP requests to the Supabase REST API
import urllib.request


class StudentPerformanceAnalyzer:
    """
    Analyzes student performance on a puzzle attempt and classifies their
    struggling level based on three factors: time, errors, and hints.
    """

    def __init__(self, db_url=None, db_key=None):
        """
        Initialize the analyzer with optional database credentials.
        Falls back to environment variables, then to the backend .env file.
        """
        self.db_url = db_url or os.environ.get('SUPABASE_URL')
        self.db_key = db_key or os.environ.get('SUPABASE_ANON_KEY')

        # --- .env Fallback Loader ---
        # If credentials aren't in the environment, attempt to read from
        # the backend's .env file (relative path: ../backend/.env)
        if not self.db_url or not self.db_key:
            try:
                env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backend', '.env')
                if os.path.exists(env_path):
                    with open(env_path, 'r') as f:
                        for line in f:
                            if '=' in line and not line.startswith('#'):
                                key, value = line.strip().split('=', 1)
                                if key == 'SUPABASE_URL' and not self.db_url:
                                    self.db_url = value
                                elif key == 'SUPABASE_ANON_KEY' and not self.db_key:
                                    self.db_key = value
            except Exception:
                pass # Fail gracefully if .env mismatch/read error

        # --- Threshold Configuration ---
        # Each factor (time, errors, hints) has two tiers:
        #   Medium: indicates moderate struggle
        #   Super:  indicates severe struggle

        # Thresholds for Medium Struggling
        self.TIME_MEDIUM = 300      # 5 minutes (seconds)
        self.ERROR_MEDIUM = 5       # 5 errors
        self.HINT_MEDIUM = 2        # 2 hints

        # Thresholds for Super Struggling
        self.TIME_SUPER = 480       # 8 minutes (seconds)
        self.ERROR_SUPER = 8        # 8 errors
        self.HINT_SUPER = 3         # 3 hints

    def _fetch_user_history(self, user_id):
        """
        Fetch user profile data from the Supabase database using standard library.
        Returns None if connection fails or user data is missing.

        Currently fetches 'level' for diagnostic output.
        Note: 'xp' and 'role' are reserved for future threshold scaling
        (e.g., adjusting thresholds based on student level or role).
        """
        if not self.db_url or not self.db_key:
            return None

        try:
            # Construct REST API URL targeting the 'users' table
            url = f"{self.db_url}/rest/v1/users?id=eq.{user_id}&select=level,xp,role"
            req = urllib.request.Request(url)
            req.add_header('apikey', self.db_key)
            req.add_header('Authorization', f'Bearer {self.db_key}')
            
            with urllib.request.urlopen(req) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode())
                    return data[0] if data else None
        except Exception as e:
            # Log to stderr so it doesn't interfere with stdout JSON output
            sys.stderr.write(f"DB Fetch Error: {str(e)}\n")
            return None

    def analyze(self, user_id, time_consumed, error_count, hints_used):
        """
        Core analysis logic — determines if a student is struggling on a puzzle.
        
        Uses a "2-of-3 factors" rule:
          - 3 factors are evaluated: time consumed, error count, hints used
          - Each factor is compared against Medium and Super thresholds
          - The student's overall status requires at least 2 factors at a
            given severity tier to qualify for that tier's classification

        Args:
            user_id (str): The ID of the student.
            time_consumed (float): Time spent on puzzle in seconds.
            error_count (int): Number of failed submission attempts / errors.
            hints_used (int): Number of hints accessed.
        
        Returns:
            dict: Analysis result including status:
                - 'NotStruggling': Student is doing fine
                - 'MediumStruggling': Student needs some help
                - 'SuperStruggling': Student needs significant help
        """
        
        # ── Step 1: Gather Pre-Game Data (from DB) ──
        # Fetch the student's current level for diagnostic/reporting purposes.
        # Note: current_level is INFORMATIONAL ONLY — it does not influence
        # the struggling classification. Thresholds are static across all levels.
        user_history = self._fetch_user_history(user_id)
        current_level = user_history.get('level', 1) if user_history else 1
        
        # ── Step 2: Evaluate Each Factor Against Thresholds ──
        # Each factor is checked against Super first, then Medium.
        # This builds two counters tracking how many factors trigger each tier.
        reasons = []
        super_count = 0
        medium_count = 0

        # Factor 1: Time Consumption
        if time_consumed >= self.TIME_SUPER:
            super_count += 1
            reasons.append("Time: Super Struggling (8+ mins)")
        elif time_consumed >= self.TIME_MEDIUM:
            medium_count += 1
            reasons.append("Time: Medium Struggling (5+ mins)")

        # Factor 2: Error Count
        if error_count >= self.ERROR_SUPER:
            super_count += 1
            reasons.append("Errors: Super Struggling (8+ errors)")
        elif error_count >= self.ERROR_MEDIUM:
            medium_count += 1
            reasons.append("Errors: Medium Struggling (5+ errors)")

        # Factor 3: Hints Used
        if hints_used >= self.HINT_SUPER:
            super_count += 1
            reasons.append("Hints: Super Struggling (3+ hints)")
        elif hints_used >= self.HINT_MEDIUM:
            medium_count += 1
            reasons.append("Hints: Medium Struggling (2+ hints)")

        # ── Step 3: Determine Overall Status ──
        # Apply the "2-of-3 factors" rule with cascade logic:
        #   - SuperStruggling: 2+ factors at Super threshold
        #   - MediumStruggling: 2+ factors at Medium-or-higher threshold
        #     (super indicators cascade down since they are at least medium-severity)
        #   - NotStruggling: fewer than 2 factors at any threshold
        #
        # Cascade: A super-level indicator is inherently at least medium-level,
        # so super_count contributes to the effective medium tally.
        effective_medium = medium_count + super_count

        if super_count >= 2:
            status = "SuperStruggling"
        elif effective_medium >= 2:
            status = "MediumStruggling"
        else:
            status = "NotStruggling"
        
        # ── Step 4: Build Result Payload ──
        # Package the analysis into a structured dict for the caller
        # (consumed by DDA_Algo.py in Pipeline 1, or by the backend directly)
        result = {
            "user_id": user_id,
            "status": status,
            "timestamp": datetime.datetime.now().isoformat(),
            "analysis": {
                "time_consumed": time_consumed,
                "error_count": error_count,
                "hints_used": hints_used,
                "factors": reasons,
                "super_indicators": super_count,
                "medium_indicators": medium_count,
                "effective_medium_indicators": effective_medium,
                "student_level_at_attempt": current_level
            }
        }
        
        return result

# ── CLI Entrypoint ──
# Called from Node.js backend via child_process.spawn:
#   python IRT_Algo.py '<json_string>'
if __name__ == "__main__":
    # Usage: python IRT_Algo.py <json_input>
    # Input JSON: { "userId": "...", "time": 300, "errors": 5, "hints": 2 }
    # Output JSON: { "user_id": "...", "status": "...", "analysis": { ... } }
    if len(sys.argv) > 1:
        try:
            input_data = json.loads(sys.argv[1])
            analyzer = StudentPerformanceAnalyzer()
            result = analyzer.analyze(
                user_id=input_data.get('userId'),
                time_consumed=input_data.get('time', 0),
                error_count=input_data.get('errors', 0),
                hints_used=input_data.get('hints', 0)
            )
            print(json.dumps(result))
        except Exception as e:
            print(json.dumps({"error": str(e)}))
    else:
        # Test mode if no args
        print("IRT_Algo Ready. Pass JSON string as argument.")
