"""
SkillBasedMatchMaking.py
------------------------
Pair players inside a cluster by blending their IRT skill (theta) with the
current puzzle difficulty estimate (beta). This sits on top of the clustering
stage and produces match scores that the multiplayer service uses.
"""

import logging
from typing import List, Dict, Optional, Tuple, Any
from KMeans_Cluster import squared_distance
from IRT_Algo import StudentPerformanceAnalyzer
from DDA_Algo import DifficultyAdjuster


# ---------------------------------------------------------------------------
# Logging keeps matchmaking diagnostics available during queue runs.
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.WARNING,  
    format="%(asctime)s [%(levelname)s] %(message)s"
)

# ---------------------------------------------------------------------------
# Utility helpers shared by the scoring routine.
# ---------------------------------------------------------------------------
def normalize(value: float, min_val: float, max_val: float) -> float:
    """Clamp and scale a numeric value to [0, 1]."""
    if max_val == min_val:
        return 0.5
    normalized = (value - min_val) / (max_val - min_val)
    return 0.0 if normalized < 0.0 else (1.0 if normalized > 1.0 else normalized)

def adaptive_weights(consistency: float) -> Tuple[float, float]:
    """
    Return theta/beta weights based on player consistency. Reliable players
    can be compared more heavily on beta (difficulty), while volatile players
    rely more on theta.
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
    weighted_gap = (w_theta * abs(theta_a - theta_b)) + (w_beta * abs(beta_a - beta_b))
    return round(1.0 - min(weighted_gap, 1.0), 3)
def assign_clusters(data_points: List[List[float]], centroids: List[List[float]]) -> Dict[int, List[int]]:
    """
    Quick helper to map every player index to the centroid they belong to.
    Keeps cluster lookups O(1) when searching for opponents.
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
# Shared instances so state carries between matchmaking requests.
_irt_analyzer = StudentPerformanceAnalyzer()
_dda_adjuster = DifficultyAdjuster()


def find_best_match(
    player_index: int,
    data_points: List[List[float]],
    centroids: List[List[float]],
    rank_name: str,
    completed_achievements: int,
    success_count: int,
    fail_count: int
) -> Dict[str, Any]:
    """
    Given a player index plus cluster centroids, return the most compatible
    opponent using adaptive weights and IRT/DDA adjustments.
    """
    if len(data_points) < 2:
        logging.warning("Not enough players to form a match.")
        return {
            "player_index": player_index,
            "match_index": None,
            "match_score": 0.0,
            "cluster": None
        }
    # data_points may have 2+ dimensions; theta is [0], beta is [1]
    theta = data_points[player_index][0]
    beta_old = data_points[player_index][1] if len(data_points[player_index]) > 1 else 0.0
    # Recompute student skill using IRT so we capture latest stats.
    irt_result = _irt_analyzer.analyze(
        user_id=f"player_{player_index}",
        time_consumed=0,
        error_count=fail_count,
        hints_used=0
    )

    # Run DDA to see how the player's difficulty should shift based on history.
    dda_result = _dda_adjuster.adjust(
        irt_status=irt_result["status"],
        current_difficulty="Medium",
        metrics={"time": 0, "errors": fail_count, "hints": 0},
        history={"trend": "stable", "recentCount": success_count + fail_count}
    )

    # Use original theta since IRT analyzer returns status, not adjusted values
    adjusted_theta = theta
    # Map difficulty to a numeric beta value for scoring
    difficulty_map = {"Easy": 0.3, "Medium": 0.5, "Hard": 0.8}
    adjusted_beta = difficulty_map.get(dda_result["new_difficulty"], beta_old)
    clusters = assign_clusters(data_points, centroids)
    player_point = data_points[player_index]
    min_dist = float('inf')
    player_cluster = 0
    for c_idx, centroid in enumerate(centroids):
        dist = squared_distance(player_point, centroid)
        if dist < min_dist:
            min_dist = dist
            player_cluster = c_idx

    candidates = [idx for idx in clusters[player_cluster] if idx != player_index]
    if not candidates:
        # If cluster is empty, expand search to nearest populated clusters.
        cluster_distances = []
        for c_idx, centroid in enumerate(centroids):
            if clusters[c_idx]:
                dist = squared_distance(player_point, centroid)
                cluster_distances.append((c_idx, dist))
        cluster_distances.sort(key=lambda x: x[1])
        for nearest_idx, _ in cluster_distances:
            if clusters[nearest_idx]:
                candidates = clusters[nearest_idx]
                break
    if not candidates:
        logging.warning(f"No candidates found for Player {player_index}.")
        return {
            "player_index": player_index,
            "match_index": None,
            "match_score": 0.0,
            "cluster": player_cluster
        }
    total_attempts = success_count + fail_count
    if total_attempts > 0:
        consistency = normalize(success_count / total_attempts, 0.0, 1.0)
    else:
        consistency = 0.5
    w_theta, w_beta = adaptive_weights(consistency)
    best_match, best_score = None, -1.0
    for idx in candidates:
        c_theta = data_points[idx][0]
        c_beta = data_points[idx][1] if len(data_points[idx]) > 1 else 0.0
        score = calculate_match_score(adjusted_theta, c_theta, adjusted_beta, c_beta, w_theta, w_beta)
        if score > best_score:
            best_match, best_score = idx, score
    return {
        "player_index": player_index,
        "match_index": best_match,
        "match_score": round(best_score, 3),
        "cluster": player_cluster,
        "adaptive_weights": {"theta": w_theta, "beta": w_beta},
        "IRT_Profile": {"theta": adjusted_theta, "beta": adjusted_beta},
        "Consistency": round(consistency, 3)
    }
