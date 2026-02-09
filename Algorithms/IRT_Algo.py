"""
IRT_Algo.py
-----------
Stand-alone algorithm to analyze student performance and determine if they are struggling.
Uses strictly internal Python libraries.
"""

import sys
import os
import json
import math
import datetime
# urllib is used for standard library HTTP requests to potential DB endpoints
import urllib.request
import urllib.parse
import urllib.error

class StudentPerformanceAnalyzer:
    def __init__(self, db_url=None, db_key=None):
        self.db_url = db_url or os.environ.get('SUPABASE_URL')
        self.db_key = db_key or os.environ.get('SUPABASE_ANON_KEY')

        # Try to load from .env if not in environment
        if not self.db_url or not self.db_key:
            try:
                # Path: ./Algorithms/IRT_Algo.py -> ../backend/.env
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
        Fetch user data from database using standard library.
        Returns None if connection fails or data missing.
        """
        if not self.db_url or not self.db_key:
            return None

        try:
            # Construct URL for Supabase Rest API
            # Table: users (reading 'level', 'xp') - assuming basic profile data
            url = f"{self.db_url}/rest/v1/users?id=eq.{user_id}&select=level,xp,role"
            req = urllib.request.Request(url)
            req.add_header('apikey', self.db_key)
            req.add_header('Authorization', f'Bearer {self.db_key}')
            
            with urllib.request.urlopen(req) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode())
                    return data[0] if data else None
        except Exception as e:
            # Fail silently or log to stderr
            sys.stderr.write(f"DB Fetch Error: {str(e)}\n")
            return None

    def analyze(self, user_id, time_consumed, error_count, hints_used):
        """
        Core logic to determine if a student is struggling.
        
        Args:
            user_id (str): The ID of the student.
            time_consumed (float): Time spent on puzzle in seconds.
            error_count (int): Number of failed submission attempts / errors.
            hints_used (int): Number of hints accessed.
        
        Returns:
            dict: Analysis result including status:
                - 'not_struggling': Student is doing fine
                - 'medium_struggling': Student needs some help
                - 'super_struggling': Student needs significant help
        """
        
        # 1. Gather Pre-Game Data (from DB)
        user_history = self._fetch_user_history(user_id)
        current_level = user_history.get('level', 1) if user_history else 1
        
        # 2. Analyze Current Performance
        reasons = []
        
        # Count how many factors indicate "super" struggling
        super_count = 0
        medium_count = 0

        # Rule: Time
        if time_consumed >= self.TIME_SUPER:
            super_count += 1
            reasons.append("Time: Super Struggling (8+ mins)")
        elif time_consumed >= self.TIME_MEDIUM:
            medium_count += 1
            reasons.append("Time: Medium Struggling (5+ mins)")

        # Rule: Errors
        if error_count >= self.ERROR_SUPER:
            super_count += 1
            reasons.append("Errors: Super Struggling (8+ errors)")
        elif error_count >= self.ERROR_MEDIUM:
            medium_count += 1
            reasons.append("Errors: Medium Struggling (5+ errors)")

        # Rule: Hints
        if hints_used >= self.HINT_SUPER:
            super_count += 1
            reasons.append("Hints: Super Struggling (3+ hints)")
        elif hints_used >= self.HINT_MEDIUM:
            medium_count += 1
            reasons.append("Hints: Medium Struggling (2+ hints)")

        # 3. Determine overall status
        # Rule: Need at least 2 factors at a level to qualify for that status
        # - SuperStruggling: 2+ factors at Super threshold
        # - MediumStruggling: 2+ factors at Medium threshold  
        # - NotStruggling: Less than 2 factors at any threshold
        if super_count >= 2:
            status = "SuperStruggling"
        elif medium_count >= 2:
            status = "MediumStruggling"
        else:
            status = "NotStruggling"
        
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
                "student_level_at_attempt": current_level
            }
        }
        
        return result

# Only run if called directly (e.g. from Node.js child_process)
if __name__ == "__main__":
    import os
    
    # Example handling of command line arguments or stdin
    # Usage: python IRT_Algo.py <json_input>
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
