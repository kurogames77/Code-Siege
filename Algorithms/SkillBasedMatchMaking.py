"""
SkillBasedMatchMaking.py
------------------------
Pair players inside a cluster by blending their IRT skill (theta) with the
current puzzle difficulty estimate (beta). This sits on top of the clustering
stage and produces match scores that the multiplayer service uses.

Pipeline Role:
    Final stage of Pipeline 2 (Matchmaking):
      IRT_Algo.py → KMeans_Cluster.py → SkillBasedMatchMaking.py

    Receives cluster centroids and player data points from KMeans, then
    finds the best opponent for a given player by computing an adaptive
    weighted match score within the same cluster.
"""

import sys
import json
import logging
from typing import List, Dict, Optional, Tuple, Any
from KMeans_Cluster import squared_distance
from IRT_Algo import StudentPerformanceAnalyzer
from DDA_Algo import DifficultyAdjuster


# ---------------------------------------------------------------------------
# Logging Configuration
# Keeps matchmaking diagnostics available during queue runs.
# Set to WARNING to avoid flooding stdout (which is reserved for JSON output).
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.WARNING,  
    format="%(asctime)s [%(levelname)s] %(message)s"
)


# ---------------------------------------------------------------------------
# Utility Helpers
# Shared normalize and weighting functions used by the scoring routine.
# ---------------------------------------------------------------------------

def normalize(value: float, min_val: float, max_val: float) -> float:
    """
    Clamp and scale a numeric value to the [0, 1] range.
    Returns 0.5 (midpoint) when min_val == max_val to avoid division by zero.
    """
    if max_val == min_val:
        return 0.5
    normalized = (value - min_val) / (max_val - min_val)
    return 0.0 if normalized < 0.0 else (1.0 if normalized > 1.0 else normalized)


def adaptive_weights(consistency: float) -> Tuple[float, float]:
    """
    Return theta/beta weights based on player consistency (win rate).

    The idea: reliable (consistent) players can be compared more heavily
    on beta (puzzle difficulty level), while volatile (inconsistent) players
    should rely more on theta (raw skill estimate).

    Weight behavior:
        consistency=0.0 (volatile)  → w_theta=0.77, w_beta=0.23
        consistency=0.5 (average)   → w_theta=0.45, w_beta=0.55
        consistency=1.0 (reliable)  → w_theta=0.40, w_beta=0.60

    Returns normalized (w_theta, w_beta) that sum to 1.0.
    """
    w_theta = max(0.4, 1.0 - consistency)
    w_beta = min(0.6, consistency + 0.3)
    total = w_theta + w_beta
    return w_theta / total, w_beta / total


def calculate_match_score(
    theta_a: float, theta_b: float,
    beta_a: float, beta_b: float,
    w_theta: float, w_beta: float
) -> float:
    """
    Compute a match compatibility score between two players.

    Uses a weighted gap formula:
        gap = (w_theta × |θA - θB|) + (w_beta × |βA - βB|)
        score = 1.0 - min(gap, 1.0)

    Result is in [0, 1] where:
        1.0 = perfect match (identical skill and difficulty)
        0.0 = worst possible match
    """
    weighted_gap = (w_theta * abs(theta_a - theta_b)) + (w_beta * abs(beta_a - beta_b))
    return round(1.0 - min(weighted_gap, 1.0), 3)


def assign_clusters(data_points: List[List[float]], centroids: List[List[float]]) -> Dict[int, List[int]]:
    """
    Map every player index to the centroid they belong to (nearest centroid).

    Returns a dict: { cluster_index: [player_index, ...], ... }
    This keeps cluster lookups O(1) when searching for opponents.
    """
    cluster_map = {i: [] for i in range(len(centroids))}
    for idx, point in enumerate(data_points):
        min_dist = float('inf')
        nearest = 0
        for c_idx, centroid in enumerate(centroids):
            dist = squared_distance(point, centroid)
            if dist < min_dist:
                min_dist = dist
                nearest = c_idx
        cluster_map[nearest].append(idx)
    return cluster_map


# ---------------------------------------------------------------------------
# Shared Algorithm Instances
# WARNING: These are instantiated at module import time. StudentPerformanceAnalyzer's
# __init__ reads .env files and environment variables, so importing this module
# triggers file I/O as a side effect. This is intentional — keeping shared state
# between matchmaking requests avoids repeated initialization overhead.
# ---------------------------------------------------------------------------
_irt_analyzer = StudentPerformanceAnalyzer()
_dda_adjuster = DifficultyAdjuster()


def find_best_match(
    player_index: int,
    data_points: List[List[float]],
    centroids: List[List[float]],
    success_count: int,
    fail_count: int
) -> Dict[str, Any]:
    """
    Given a player index plus cluster centroids, return the most compatible
    opponent using adaptive weights and IRT/DDA adjustments.

    Steps:
        1. Guard: check minimum players
        2. IRT re-analysis: assess current player skill
        3. DDA difficulty adjustment: derive beta value
        4. Cluster lookup: find same-cluster opponents
        5. Adaptive weight calculation: tune theta/beta weights
        6. Scoring loop: find best scoring opponent

    Args:
        player_index (int): Index of the requesting player in data_points.
        data_points (list): 2D list of player feature vectors from KMeans.
        centroids (list): Cluster centroids from KMeans.
        success_count (int): Player's total successful attempts.
        fail_count (int): Player's total failed attempts.

    Returns:
        dict: Match result with player_index, match_index, match_score, cluster, etc.
    """

    # ── Step 1: Guard — Minimum Player Check ──
    if len(data_points) < 2:
        logging.warning("Not enough players to form a match.")
        return {
            "player_index": player_index,
            "match_index": None,
            "match_score": 0.0,
            "cluster": None
        }

    # ── Step 2: IRT Re-Analysis ──
    # Re-invoke IRT to get the latest struggling status for this player.
    # Note: time_consumed and hints_used are set to 0 because matchmaking
    # operates on aggregate stats, not live puzzle data. Only fail_count
    # (mapped to error_count) carries real data. This means only the
    # error threshold in IRT will trigger — time and hint thresholds won't.
    theta = data_points[player_index][0]
    beta_old = data_points[player_index][1] if len(data_points[player_index]) > 1 else 0.0

    irt_result = _irt_analyzer.analyze(
        user_id=f"player_{player_index}",
        time_consumed=0,
        error_count=fail_count,
        hints_used=0
    )

    # ── Step 3: DDA Difficulty Adjustment ──
    # Run DDA to derive a beta (difficulty) value for match scoring.
    # Note: current_difficulty is hardcoded to "Medium" because matchmaking
    # doesn't track per-player puzzle difficulty. DDA is used here solely
    # to map the IRT status into a numeric beta value for scoring.
    dda_result = _dda_adjuster.adjust(
        irt_status=irt_result["status"],
        current_difficulty="Medium",
        metrics={"time": 0, "errors": fail_count, "hints": 0},
        history={"trend": "stable", "recentCount": success_count + fail_count}
    )

    # Use original theta since IRT analyzer returns status, not adjusted values
    adjusted_theta = theta
    # Map DDA's difficulty string to a numeric beta value for scoring
    difficulty_map = {"Easy": 0.3, "Medium": 0.5, "Hard": 0.8}
    adjusted_beta = difficulty_map.get(dda_result["new_difficulty"], beta_old)

    # ── Step 4: Cluster Lookup — Find Same-Cluster Opponents ──
    # Use assign_clusters() to get the full cluster map, then derive
    # the requesting player's cluster from the result.
    clusters = assign_clusters(data_points, centroids)

    # Look up which cluster this player belongs to from the assignment map
    player_cluster = next(
        c_idx for c_idx, members in clusters.items()
        if player_index in members
    )

    # Primary candidates: other players in the same cluster (exclude self)
    candidates = [idx for idx in clusters[player_cluster] if idx != player_index]

    # Fallback: if the player's cluster has no other members, expand search
    # to the nearest populated cluster by centroid distance.
    if not candidates:
        player_point = data_points[player_index]
        cluster_distances = []
        for c_idx, centroid in enumerate(centroids):
            if clusters[c_idx]:
                dist = squared_distance(player_point, centroid)
                cluster_distances.append((c_idx, dist))
        cluster_distances.sort(key=lambda x: x[1])
        for nearest_idx, _ in cluster_distances:
            # Filter out self from fallback candidates
            fallback = [idx for idx in clusters[nearest_idx] if idx != player_index]
            if fallback:
                candidates = fallback
                break

    # Final guard: no candidates found anywhere
    if not candidates:
        logging.warning(f"No candidates found for Player {player_index}.")
        return {
            "player_index": player_index,
            "match_index": None,
            "match_score": 0.0,
            "cluster": player_cluster
        }

    # ── Step 5: Adaptive Weight Calculation ──
    # Derive player consistency from their win rate (success / total).
    # This determines how much weight to give theta vs beta in scoring.
    total_attempts = success_count + fail_count
    if total_attempts > 0:
        consistency = normalize(success_count / total_attempts, 0.0, 1.0)
    else:
        consistency = 0.5  # Default to neutral if no game history

    w_theta, w_beta = adaptive_weights(consistency)

    # ── Step 6: Scoring Loop — Find Best Opponent ──
    # Score each candidate against the requesting player and pick the highest
    best_match, best_score = None, -1.0
    for idx in candidates:
        c_theta = data_points[idx][0]
        c_beta = data_points[idx][1] if len(data_points[idx]) > 1 else 0.0
        score = calculate_match_score(adjusted_theta, c_theta, adjusted_beta, c_beta, w_theta, w_beta)
        if score > best_score:
            best_match, best_score = idx, score

    # ── Build Result Payload ──
    return {
        "player_index": player_index,
        "match_index": best_match,
        "match_score": round(best_score, 3),
        "cluster": player_cluster,
        "adaptive_weights": {"theta": w_theta, "beta": w_beta},
        "IRT_Profile": {"theta": adjusted_theta, "beta": adjusted_beta},
        "Consistency": round(consistency, 3)
    }


# ---------------------------------------------------------------------------
# CLI Entrypoint for Node.js Backend Integration
# Called from algorithm.js via child_process.spawn:
#   python SkillBasedMatchMaking.py '<json_string>'
#
# Input JSON:
#   {
#     "data_points": [[0.5, 0.6, 0.7, 0.3], ...],
#     "centroids": [[0.4, 0.5, 0.6, 0.4], ...],
#     "player_index": 0,
#     "success_count": 10,
#     "fail_count": 3
#   }
#
# Output JSON:
#   { "player_index": 0, "match_index": 2, "match_score": 0.85, ... }
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    if len(sys.argv) > 1:
        try:
            input_data = json.loads(sys.argv[1])

            # Extract required fields
            data_points = input_data.get('data_points', [])
            centroids = input_data.get('centroids', [])
            player_index = input_data.get('player_index', 0)
            success_count = input_data.get('success_count', 0)
            fail_count = input_data.get('fail_count', 0)

            # Validate inputs
            if not data_points or not centroids:
                print(json.dumps({"error": "data_points and centroids are required"}))
                sys.exit(1)

            if player_index < 0 or player_index >= len(data_points):
                print(json.dumps({"error": f"player_index {player_index} out of range"}))
                sys.exit(1)

            # Run matchmaking
            result = find_best_match(
                player_index=player_index,
                data_points=data_points,
                centroids=centroids,
                success_count=success_count,
                fail_count=fail_count
            )

            print(json.dumps(result))
        except json.JSONDecodeError as e:
            print(json.dumps({"error": f"Invalid JSON input: {str(e)}"}))
            sys.exit(1)
        except Exception as e:
            print(json.dumps({"error": str(e)}))
            sys.exit(1)
    else:
        print("SkillBasedMatchMaking Ready. Pass JSON string as argument.")
