from backend.evaluate_proper import evaluate

# Weight format:
# (alpha, beta, gamma, delta, epsilon, zeta)
# content, CF, pop, category, recency, distance

weight_space = [
    (0.40, 0.20, 0.08, 0.07, 0.07, 0.05),
    (0.35, 0.25, 0.08, 0.07, 0.07, 0.05),
    (0.30, 0.30, 0.08, 0.07, 0.07, 0.05),
    (0.30, 0.35, 0.08, 0.07, 0.07, 0.05),
    (0.25, 0.35, 0.08, 0.07, 0.07, 0.05),
]

best_ndcg = 0
best_score=0
best_weights = None
best_metrics = None

for weights in weight_space:

    print("\nTesting weights:", weights)

    metrics = evaluate(weights=weights)

    if metrics is None:
        continue
    
    composite = (
        0.35 * metrics["ndcg"] +
        0.25 * metrics["precision"] +
        0.20 * metrics["recall"] +
        0.10 * metrics["diversity"] +
        0.10 * metrics["hit_rate"]
    )

    if composite > best_score:
        best_score = composite
        best_weights = weights
        best_metrics = metrics


print("\n============================")
print("BEST WEIGHTS FOUND:")
print("Weights:", best_weights)
print("Best NDCG:", best_ndcg)
print("Full Metrics:", best_metrics)
print("============================")