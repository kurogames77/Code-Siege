"""
KMeans_Cluster.py
-----------------
K-Means helper utilities used by the matchmaking pipeline. The clustering step
groups players by their IRT-derived skill vectors so that higher-level logic
can form fair matches inside each cluster.

Pipeline Role:
    Second stage of Pipeline 2 (Matchmaking):
      IRT_Algo.py → KMeans_Cluster.py → SkillBasedMatchMaking.py

    Receives IRT-derived feature vectors (adjusted_theta, probability,
    success_rate, fail_rate) for a group of players, then clusters them
    into k groups of similar skill. The cluster assignments are passed to
    SkillBasedMatchMaking.py for final match pairing.

Algorithm:
    Standard K-Means with k-means++ initialization and early convergence
    stopping. All code uses only Python standard library (no numpy/scipy).
"""

import random

# ---------------------------------------------------------------------------
# Vector Math Helpers
# These utility functions provide the distance and averaging operations
# needed by the k-means algorithm without requiring numpy.
# ---------------------------------------------------------------------------

def squared_distance(a, b):
    """
    Return squared Euclidean distance between two numeric vectors.
    Used instead of euclidean distance throughout the clustering code
    because sqrt is monotonic — comparisons produce the same ordering
    without the computational cost of taking the square root.
    """
    total = 0.0
    for x, y in zip(a, b):
        d = x - y
        total += d * d
    return total


def compute_centroid(points):
    """
    Compute the centroid (mean point) for a list of k-dimensional points.
    Returns an empty list if no points are provided.

    Uses a single pass through points with a final multiply-by-inverse
    to avoid repeated floating-point division inside the loop.
    """
    if not points:
        return []
    count = len(points)
    dim = len(points[0])
    # Accumulate sums per dimension in a single pass
    centroid = [0.0] * dim
    for point in points:
        for i in range(dim):
            centroid[i] += point[i]
    # Multiply by inverse of count (cheaper than dividing each element)
    inv_count = 1.0 / count
    return [centroid[i] * inv_count for i in range(dim)]


# ---------------------------------------------------------------------------
# Data Normalization
# ---------------------------------------------------------------------------

def normalize_data(data):
    """
    Normalize each dimension of the dataset to [0, 1] range (min-max scaling).

    This is critical for k-means because the features (theta, probability,
    success_rate, fail_rate) may be on different numeric scales. Without
    normalization, features with larger ranges would dominate the distance
    calculation and bias cluster assignments.
    """
    if not data:
        return data

    dims = len(data[0])
    mins = list(data[0])
    maxs = list(data[0])

    # Single pass to find min/max per dimension
    for pt in data[1:]:
        for i in range(dims):
            if pt[i] < mins[i]:
                mins[i] = pt[i]
            if pt[i] > maxs[i]:
                maxs[i] = pt[i]

    # Compute range per dimension (used for scaling)
    norm_data = []
    ranges = [maxs[i] - mins[i] for i in range(dims)]

    # Scale each data point to [0, 1]; zero-range dimensions default to 0.0
    for pt in data:
        scaled = [
            0.0 if ranges[i] == 0.0 else (pt[i] - mins[i]) / ranges[i]
            for i in range(dims)
        ]
        norm_data.append(scaled)

    return norm_data


# ---------------------------------------------------------------------------
# K-Means++ Initialization
# ---------------------------------------------------------------------------

def init_kmeans_plus_plus(data, k):
    """
    Initialize centroids using the k-means++ heuristic.

    Instead of choosing k random centroids (which can lead to poor convergence),
    k-means++ selects each successive centroid with probability proportional to
    D(x)² — the squared distance from each point to its nearest existing centroid.
    This spreads initial centroids apart and produces more stable clusters,
    especially when player skill distributions are skewed.

    Returns exactly k centroid points (or fewer only if data has < k unique points).
    """
    if not data:
        return []

    n = len(data)
    # Edge case: if we want more clusters than data points, each point is its own centroid
    if k >= n:
        return data.copy()

    # Step 1: Choose the first centroid uniformly at random
    centroids = [random.choice(data)]

    # Step 2: Choose remaining centroids proportional to D(x)²
    while len(centroids) < k:
        # For each point, compute squared distance to its nearest centroid
        min_dist_sq = []
        for pt in data:
            min_sq = float('inf')
            for c in centroids:
                sq_dist = squared_distance(pt, c)
                if sq_dist < min_sq:
                    min_sq = sq_dist
            min_dist_sq.append(min_sq)

        total = sum(min_dist_sq)

        # Degenerate case: all points coincide with existing centroids
        if total == 0 or total < 1e-10:
            remaining = [pt for pt in data if pt not in centroids]
            if remaining:
                centroids.append(random.choice(remaining))
            break

        # Weighted random selection: pick next centroid proportional to D(x)²
        r = random.random() * total
        cumulative = 0.0
        for i, d in enumerate(min_dist_sq):
            cumulative += d
            if r <= cumulative:
                centroids.append(data[i])
                break
        else:
            # Fallback: numerical precision edge case
            centroids.append(data[-1])

    # Safety padding: if we broke out early due to degenerate data,
    # ensure we still return exactly k centroids by filling with random points.
    # This prevents IndexError downstream when creating k-sized cluster arrays.
    while len(centroids) < k:
        centroids.append(random.choice(data))

    return centroids

# ---------------------------------------------------------------------------
# Main Entry Point: Cluster IRT Rows for Matchmaking
# ---------------------------------------------------------------------------

def kmeans_from_irt(irt_data, k=3, max_iter=100, tol=1e-4, verbose=False):
    """
    Run k-means clustering over IRT skill snapshots.

    Each IRT record is converted into a 4-dimensional feature vector:
      [adjusted_theta, probability, success_rate, fail_rate]

    Returns centroids and cluster assignments so SkillBasedMatchMaking.py
    knows which cluster each player belongs to.

    Args:
        irt_data (list[dict]): List of IRT records with skill fields.
        k (int): Number of clusters to create. Default 3.
        max_iter (int): Maximum iterations before forced stop. Default 100.
        tol (float): Convergence tolerance. Stops when centroid shift < tol². Default 1e-4.
        verbose (bool): Print convergence info to stdout.

    Returns:
        dict: { centroids, assignments, cluster_count, converged_after }
    """

    # ── Step 1: Convert IRT Rows to Numeric Feature Vectors ──
    # Extract the four skill dimensions from each IRT record
    data_points = [
        [
            item.get("adjusted_theta", 0.0),
            item.get("probability", 0.0),
            item.get("success_rate", 0.0),
            item.get("fail_rate", 0.0)
        ]
        for item in irt_data
    ]

    if not data_points:
        raise ValueError("IRT data is empty. Cannot perform K-Means clustering.")

    # ── Step 2: Normalize Features ──
    # Scale all dimensions to [0, 1] to prevent any single feature
    # from dominating distance calculations
    data_points = normalize_data(data_points)

    # ── Step 3: Initialize Centroids via K-Means++ ──
    centroids = init_kmeans_plus_plus(data_points, k)

    # ── Step 4: Iterative K-Means Loop ──
    # Standard Lloyd's algorithm: assign → recompute centroids → check convergence
    assignments = []
    iteration = 0
    for iteration in range(max_iter):
        # Create empty cluster buckets
        clusters = [[] for _ in range(k)]
        
        # Assign each data point to the nearest centroid
        assignments = []
        for pt in data_points:
            min_dist_sq = float('inf')
            nearest = 0
            for idx, centroid in enumerate(centroids):
                dist_sq = squared_distance(pt, centroid)
                if dist_sq < min_dist_sq:
                    min_dist_sq = dist_sq
                    nearest = idx
            assignments.append(nearest)
            clusters[nearest].append(pt)

        # Recompute centroids from the new cluster members
        new_centroids = []
        for c in clusters:
            if c:
                new_centroids.append(compute_centroid(c))
            else:
                # Empty cluster: reinitialize randomly to keep k clusters alive
                new_centroids.append(random.choice(data_points))

        # ── Convergence Check ──
        # Measure total squared shift of all centroids.
        # If the shift is below tol², the algorithm has converged.
        shift_sq = sum(squared_distance(a, b) for a, b in zip(centroids, new_centroids))
        
        # Primary convergence: centroids barely moved
        if shift_sq < (tol * tol):
            if verbose:
                print(f"[INFO] K-Means converged after {iteration + 1} iterations")
            break

        centroids = new_centroids
        
        # Relaxed early stopping: after a warm-up period (5 iterations),
        # accept convergence at a 10× looser tolerance. This catches cases
        # where centroids are oscillating within a very narrow band.
        if iteration > 5 and shift_sq < (tol * tol * 10):
            break

    else:
        # Python for/else: this block runs ONLY when the for-loop completes
        # without hitting a 'break', meaning the algorithm did NOT converge
        # within max_iter iterations. This is informational — the result is
        # still usable, just not optimal.
        if verbose:
            print("[WARNING] K-Means did not converge within max iterations.")

    return {
        "centroids": centroids,
        "assignments": assignments,
        "cluster_count": k,
        "converged_after": iteration + 1
    }


# ---------------------------------------------------------------------------
# CLI Entrypoint for Node.js Backend Integration
# Called from algorithm.js via child_process.spawn:
#   python KMeans_Cluster.py '<json_string>'
# ---------------------------------------------------------------------------
if __name__ == '__main__':
    import sys
    import json

    try:
        # Expect JSON input as first CLI argument
        if len(sys.argv) < 2:
            print(json.dumps({"error": "No input data provided"}))
            sys.exit(1)

        input_data = json.loads(sys.argv[1])
        
        # Extract players list and optional k value
        players = input_data.get('players', [])
        k = input_data.get('k', 3)  # Default to 3 clusters
        
        if not players:
            print(json.dumps({"error": "No players provided for matchmaking"}))
            sys.exit(1)
        
        # Run k-means clustering on the player skill vectors
        result = kmeans_from_irt(players, k=k)
        
        # Attach player IDs to cluster assignments for easier frontend use
        clustered_players = []
        for i, player in enumerate(players):
            clustered_players.append({
                "player_id": player.get("id") or player.get("user_id") or f"player_{i}",
                "cluster": result["assignments"][i] if i < len(result["assignments"]) else -1,
                "rank": player.get("rank", "Unranked")
            })
        
        output = {
            "status": "success",
            "cluster_count": result["cluster_count"],
            "converged_after": result["converged_after"],
            "players": clustered_players
        }
        
        print(json.dumps(output))

    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"Invalid JSON input: {str(e)}"}))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
